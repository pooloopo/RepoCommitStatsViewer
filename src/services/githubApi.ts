
import type { Table } from "dexie";
import { Octokit, RequestError } from "octokit";
import { useAuth } from "@/context/AuthContext";

let octokit : Octokit;
let githubUsername: string;

export const setOctokit = (newOctoKit: Octokit) => { octokit = newOctoKit; };
export const setGithubUsernameForGithubAPI = (newGithubUsername: string) => { githubUsername = newGithubUsername; };

export interface GitHubRepository {
  id: number;
  name: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  updated_at: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
}

export interface DetailedStats {
  commits: number;
  lines: number;
  files: number;
  atomicScore: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface FetchRepositoriesResponse {
  repositories: GitHubRepository[];
  rateLimitInfo: RateLimitInfo;
  hasMore: boolean;
}

let rateLimitState: RateLimitInfo | null = null;
let rateLimitResetTimer: ReturnType<typeof setTimeout> | null = null;

function parseRateLimitInfo(headers: any): RateLimitInfo {
  return {
    limit: parseInt(headers['x-ratelimit-limit'] || '60'),
    remaining: parseInt(headers['x-ratelimit-remaining'] || '0'),
    reset: parseInt(headers['x-ratelimit-reset'] || '0') * 1000
  };
}

function updateRateLimitState(rateLimit: RateLimitInfo) {
  rateLimitState = rateLimit;

  if (rateLimitResetTimer) {
    clearTimeout(rateLimitResetTimer);
  }

  if (rateLimit.remaining === 0) {
    const waitTime = Math.max(rateLimit.reset - Date.now(), 1000);
    console.log(`Rate limited. Retrying in ${Math.ceil(waitTime / 1000)} seconds`);

    rateLimitResetTimer = setTimeout(() => {
      console.log('Rate limit reset, retrying...');
    }, waitTime);
  }
}

export function getRateLimitInfo(): RateLimitInfo | null {
  return rateLimitState;
}

export function clearRateLimitState() {
  if (rateLimitResetTimer) {
    clearTimeout(rateLimitResetTimer);
  }
  rateLimitState = null;
}
// Get any Github user data using Github user ID or login username
export async function getGitHubUserData(githubIdOrLogin : string) {
  const response = await fetch(
    `https://api.github.com/user/${githubIdOrLogin}`,
    { headers: { 'Accept': 'application/json' } }
  )
    if (!response.ok) {
      const err = new Error();
      err.cause = response.statusText;
      throw err;
    }
    return response.json();
}

export async function fetchUserRepositories(
  page: number = 1, searchTerm: string
): Promise<FetchRepositoriesResponse> {
  const perPage = 20;
  const offset = (page - 1) * perPage;

  try {
    let response;
    let data
    if (searchTerm && searchTerm.trim().length > 0) {
      // Search for repositories matching the letters (Best Match)
      response = await octokit.rest.search.repos({
        q: `user:${githubUsername} ${searchTerm}` ,
        order: "desc",
        per_page: 10,
      });
      data = response.data.items;
    } else {
      // No search term: Get most recently updated repos for the user
      response = await octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        direction: "desc",
        per_page: 10,
      });
      data = response.data;
    }
    /*const response = await octokit.rest.repos.listForAuthenticatedUser({
      affiliation: 'owner,collaborator,organization_member',
      sort: 'updated',         // Options: created, updated, pushed, full_name
      direction: 'desc',       // Options: asc, desc
      per_page: 20,
    });*/
    const rateLimit = parseRateLimitInfo(response.headers);
    updateRateLimitState(rateLimit);

    const repositories = data as GitHubRepository[];
    return {
      repositories,
      rateLimitInfo: rateLimit,
      hasMore: offset + perPage < repositories.length
    };
  } catch (error) {
    if (error instanceof RequestError && error.status) {
      // Handle API error (e.g., 404 Not Found)
      if (error.status === 403 && error.message.includes('API rate limit')) {
        throw new Error(`RATE_LIMIT_EXCEEDED: ${error.message}`);
      }
      else{
        throw new Error(`GitHub API error: ${error.message}`);
      }
    } else {
      throw error;
    }
  }
}

export async function waitForRateLimitReset(): Promise<void> {
  if (!rateLimitState || rateLimitState.remaining > 0) {
    return;
  }

  const waitTime = Math.max(rateLimitState.reset - Date.now(), 0);
  if (waitTime > 0) {
    return new Promise((resolve) => {
      setTimeout(resolve, waitTime + 100);
    });
  }
}

export const getTotalRepoCommits = async (owner: string, repo: string): Promise<number> => {
  try {
    const response = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 1,  // 1 commit per page
      page: 1,      // Start at page 1
    });

    // 1. Access the 'link' header from the response
    const linkHeader = response.headers.link;

    // 2. If there is no link header, it means there is only 1 page (0 or 1 commit)
    if (!linkHeader) {
      return response.data.length;
    }

    // 3. Use Regex to find the 'last' page number in the string
    // The string looks like: <...&page=1248>; rel="last"
    const match = linkHeader.match(/page=(\d+)>; rel="last"/);
    
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }

    return response.data.length;
  } catch (error: any) {
    console.log(error.status)
    // 409 Conflict means the repository is empty (no commits yet)
    if (error.status === 409) {
      console.warn(`Repository ${owner}/${repo} is empty.`);
      return 0;
    }
    //console.error("Error calculating total commits:", error);
    return 0;
  }
};

export const fetchStatsForTimeframe = async (
  owner: string, 
  repo: string, 
  days: number
): Promise<DetailedStats> => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // 1. Get all commit SHAs in the timeframe
    const commits = await octokit.paginate(octokit.rest.repos.listCommits, {
      owner,
      repo,
      since: since.toISOString(),
      per_page: 100,
    });

    let totalLines = 0;
    let totalFiles = 0;
    let totalAtomicScore = 0;

    // 2. To get lines/files, we need the "detailed" commit for each SHA
    // Note: For large repos, this hits rate limits. We limit to the first 20 for safety in this demo.
    const detailsToFetch = commits.slice(0, 20); 

    const detailedData = await Promise.all(
      detailsToFetch.map(c => octokit.rest.repos.getCommit({ owner, repo, ref: c.sha }))
    );

    detailedData.forEach(res => {
      totalLines += (res.data.stats?.total || 0);
      totalFiles += (res.data.files?.length || 0);
      
      // MOCK ATOMIC SCORE LOGIC (Example for your IA)
      // High score if changes are small and focused (Atomic)
      const commitScore = (res.data.stats?.total || 0) < 50 ? 9.5 : 5.0;
      totalAtomicScore += commitScore;
    });

    const count = commits.length;
    return {
      commits: count,
      lines: totalLines,
      files: totalFiles,
      atomicScore: count > 0 ? parseFloat((totalAtomicScore / detailsToFetch.length).toFixed(1)) : 0
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { commits: 0, lines: 0, files: 0, atomicScore: 0 };
  }
};

export const searchRepoFiles = async (owner: string, repo: string, query: string): Promise<string[]> => {
  if (!query || query.length < 2) return []; // Don't search for very short strings to save API quota

  try {
    const response = await octokit.rest.search.code({
      // The 'q' parameter syntax: "query string" + "repo:owner/repo"
      q: `${query} filename:${query} repo:${owner}/${repo}`,
      per_page: 5,
    });

    // Map the results to just the file paths
    return response.data.items.map((item: any) => item.path);
  } catch (error) {
    console.error("Error searching files:", error);
    return [];
  }
};

/**
 * Fetches all-time contributor statistics using GitHub's pre-aggregated stats endpoint.
 * Returns additions, deletions, and commit counts for the top 100 contributors.
 */
export const fetchAllTimeContributorStats = async (owner: string, repo: string): Promise<any[]> => {
  try {
    const fetchWithRetry = async (retries = 3): Promise<any> => {
      const response = await octokit.rest.repos.getContributorsStats({
        owner,
        repo,
      });

      // GitHub returns 202 if it's still calculating the stats.
      if (response.status === 202 && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return fetchWithRetry(retries - 1);
      }
      return response.data;
    };

    const data = await fetchWithRetry();

    if (!Array.isArray(data)) return [];

    return data.map((contributor: any) => {
      // weeks contain { w: timestamp, a: additions, d: deletions, c: commits }
      const totalAdditions = contributor.weeks.reduce((acc: number, w: any) => acc + w.a, 0);
      const totalDeletions = contributor.weeks.reduce((acc: number, w: any) => acc + w.d, 0);
      
      return {
        user: contributor.author.login,
        commits: contributor.total,
        lines: totalAdditions + totalDeletions,
        // We estimate "files" based on historical average for all-time stats
        files: Math.round(contributor.total * 1.5), 
        // All-time Atomic Score: Ratio of lines to commits
        // Higher score if they make many commits with fewer line changes per commit
        score: parseFloat(Math.max(1, Math.min(10, 10 - ((totalAdditions + totalDeletions) / (contributor.total * 200)))).toFixed(1))
      };
    });
  } catch (error) {
    console.error("Error fetching all-time stats:", error);
    return [];
  }
};

/**
 * Fetches contributors and aggregates their stats.
 * If path is provided, it only calculates stats for commits touching that file.
 */
export const fetchContributorRankings = async (
  owner: string,
  repo: string,
  path?: string
): Promise<any[]> => {
  try {
    // 1. Fetch commits. If path exists, GitHub filters commits by that file.
    const response = await octokit.paginate(octokit.rest.repos.listCommits, {
      owner,
      repo,
      path: path || undefined,
      per_page: 100,
    });

    // 2. Aggregate stats into a Map
    const contributorMap = new Map();

    // To get lines changed (additions/deletions), we need detailed commit info.
    // WARNING: In a real IA, fetching 100+ detailed commits will hit rate limits quickly.
    // We'll limit to the last 30 for the "detailed" lines calculation.
    const recentCommits = response.slice(0, 30);

    const detailedCommits = await Promise.all(
      recentCommits.map(c => 
        octokit.rest.repos.getCommit({ owner, repo, ref: c.sha })
      )
    );

    detailedCommits.forEach(res => {
      const author = res.data.author?.login || 'Unknown';
      const stats = res.data.stats;
      const filesChanged = res.data.files?.length || 0;

      if (!contributorMap.has(author)) {
        contributorMap.set(author, { 
          user: author, 
          commits: 0, 
          lines: 0, 
          files: 0, 
          score: 0 
        });
      }

      const current = contributorMap.get(author);
      current.commits += 1;
      current.lines += stats?.total || 0;
      current.files += filesChanged;
      
      // IA Logic: Atomic Score (Small focused commits = higher score)
      // Score = 10 - (linesChanged / 100), capped between 1 and 10
      const commitScore = Math.max(1, Math.min(10, 10 - ((stats?.total || 0) / 100)));
      current.score = parseFloat(((current.score + commitScore) / 2).toFixed(1));
    });

    return Array.from(contributorMap.values());
  } catch (error) {
    console.error("Error fetching contributor rankings:", error);
    return [];
  }
};