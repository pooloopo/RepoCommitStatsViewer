
import type { Table } from "dexie";
import { Octokit, RequestError } from "octokit";

export interface GitHubRepository {
  id: number;
  name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  updated_at: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
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
// Get Github user data using Github user ID or login username
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
  accessToken: string,
  page: number = 1
): Promise<FetchRepositoriesResponse> {
  const octokit = new Octokit({
  auth: accessToken // My GitHub OAuth token from Firebase
  });
  const perPage = 20;
  const offset = (page - 1) * perPage;

  try {
    const response = await octokit.rest.repos.listForAuthenticatedUser({
      affiliation: 'owner,collaborator,organization_member',
      sort: 'updated',         // Options: created, updated, pushed, full_name
      direction: 'desc',       // Options: asc, desc
      per_page: 20,
    });
    console.log(response)
    const rateLimit = parseRateLimitInfo(response.headers);
    updateRateLimitState(rateLimit);

    const data = response.data;

    const repositories = data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      owner: {
        login: repo.owner.login,
        avatar_url: repo.owner.avatar_url
      },
      updated_at: repo.updated_at,
      html_url: repo.html_url,
      description: repo.description,
      stargazers_count: repo.stargazers_count,
      language: repo.language
    })) as GitHubRepository[];

    return {
      repositories,
      rateLimitInfo: rateLimit,
      hasMore: offset + perPage < data.length
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
