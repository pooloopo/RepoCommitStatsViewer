import { Octokit, RequestError } from "octokit";

let octokit: Octokit;
let githubUsername: string;

export const setOctokit = (newOctoKit: Octokit) => {
  octokit = newOctoKit;
};
export const setGithubUsernameForGithubAPI = (newGithubUsername: string) => {
  githubUsername = newGithubUsername;
};

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

export interface FetchRepositoriesResponse {
  repositories: GitHubRepository[];
  hasMore: boolean;
}

/**
 * Calculates Atomic Score based on: (LogicLines * 1.2 + StyleLines * 0.3) / sqrt(filesChanged)
 */
const computeAtomicScore = (files: any[]) => {
  if (!files || files.length === 0) return 0;

  let logicLines = 0;
  let styleLines = 0;

  const logicExtensions = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".go",
    ".rs",
    ".php",
  ];
  const styleExtensions = [
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".html",
    ".json",
    ".yaml",
    ".yml",
    ".md",
  ];

  files.forEach((file) => {
    const ext = file.filename
      .slice(((file.filename.lastIndexOf(".") - 1) >>> 0) + 2)
      .toLowerCase();

    // Extract additions from the patch
    // We only count lines starting with '+' but NOT '+++' (which is header info)
    const additions = file.patch
      ? file.patch
          .split("\n")
          .filter(
            (line: string) => line.startsWith("+") && !line.startsWith("+++"),
          ).length
      : 0;

    if (logicExtensions.includes(`.${ext}`)) {
      logicLines += additions;
    } else if (styleExtensions.includes(`.${ext}`)) {
      styleLines += additions;
    } else {
      // Default to logic for unknown code files, or 0 if preferred
      logicLines += additions;
    }
  });

  const filesChanged = files.length;
  const score = (logicLines * 1.2 + styleLines * 0.3) / Math.sqrt(filesChanged);

  // Return formatted to 1 decimal place, capped at a reasonable max (e.g. 10) if desired
  return parseFloat(score.toFixed(1));
};

// Get any Github user data using Github user ID or login username
export async function getGitHubUserData(githubIdOrLogin: string) {
  const response = await fetch(
    `https://api.github.com/user/${githubIdOrLogin}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    const err = new Error();
    err.cause = response.statusText;
    throw err;
  }
  return response.json();
}

export async function fetchUserRepositories(
  page: number = 1,
  searchTerm: string,
): Promise<FetchRepositoriesResponse> {
  const perPage = 20;
  try {
    let response;
    if (searchTerm && searchTerm.trim().length > 0) {
      // There's a search term, so more get all repos to find term later
      response = await octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        direction: "desc",
        per_page: 100,
      });
    } else {
      // No search term: Get most recently updated repos for the user
      response = await octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        direction: "desc",
        per_page: perPage,
        page: page,
      });
    }
    const data = response.data;

    const repositories = data as GitHubRepository[];

    // Search repositories for best match
    if (searchTerm && searchTerm.trim().length > 0) {
      // Deepcopy to push match query repos in
      const matchingQueryRepos: GitHubRepository[] = [];
      for (let repo of repositories) {
        if (repo.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          matchingQueryRepos.push(repo);
        }
      }
      return {
        repositories: matchingQueryRepos,
        hasMore: matchingQueryRepos.length === perPage,
      };
    }
    return {
      repositories,
      hasMore: repositories.length === perPage,
    };
  } catch (error) {
    if (error instanceof RequestError && error.status) {
      // Handle API error (e.g., 404 Not Found)
      if (error.status === 403 && error.message.includes("API rate limit")) {
        throw new Error(`RATE_LIMIT_EXCEEDED: ${error.message}`);
      } else {
        throw new Error(`GitHub API error: ${error.message}`);
      }
    } else {
      throw error;
    }
  }
}

export const getTotalRepoCommits = async (
  owner: string,
  repo: string,
): Promise<number> => {
  try {
    const response = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 1, // 1 commit per page
      page: 1, // Start at page 1
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
    console.log(error.status);
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
  days: number,
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
      detailsToFetch.map((c) =>
        octokit.rest.repos.getCommit({ owner, repo, ref: c.sha }),
      ),
    );

    detailedData.forEach((res) => {
      totalLines += res.data.stats?.total || 0;
      totalFiles += res.data.files?.length || 0;

      // MOCK ATOMIC SCORE LOGIC (Example for your IA)
      // High score if changes are small and focused (Atomic)
      const commitScore = computeAtomicScore(res.data.files! || []);
      totalAtomicScore += commitScore;
    });

    const count = commits.length;
    return {
      commits: count,
      lines: totalLines,
      files: totalFiles,
      atomicScore:
        count > 0
          ? parseFloat((totalAtomicScore / detailsToFetch.length).toFixed(1))
          : 0,
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { commits: 0, lines: 0, files: 0, atomicScore: 0 };
  }
};

export const searchRepoFiles = async (
  owner: string,
  repo: string,
  query: string,
): Promise<string[]> => {
  if (!query || query.length < 2) return []; // Don't search for very short strings to save API quota

  try {
    // Get the SHA of the default branch (e.g., 'main')
    const { data: refData } = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = refData.default_branch;

    // Get the full recursive tree using the branch name (or its SHA)
    // 'recursive: true' fetches all files in all subdirectories
    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: "true",
    });

    query = query.toLowerCase();
    // Filter the results for the filename locally using regex
    const matches = treeData.tree.filter(
      (file) =>
        file.path
          .replace(/^.*\/(.*)$/, "$1")
          .toLowerCase()
          .includes(query) && file.type === "blob",
    );
    return matches.map((match: any) => match.path);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
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
  path?: string,
): Promise<any[]> => {
  try {
    // 1. Fetch commits. If path exists, GitHub filters commits by that file.
    const response = await octokit.paginate(octokit.rest.repos.listCommits, {
      owner,
      repo,
      path: path === "entire" ? undefined : path,
      per_page: 100, // Default entries, prevents long load from searching commits with atomic score
    });

    // 2. Aggregate stats into a Map
    const contributorMap = new Map();

    // To get lines changed (additions/deletions), we need detailed commit info.
    const detailedCommits = await Promise.all(
      response.map((c) =>
        octokit.rest.repos.getCommit({ owner, repo, ref: c.sha }),
      ),
    );

    detailedCommits.forEach((res) => {
      const author = res.data.author?.login || "Unknown";

      if (!contributorMap.has(author)) {
        contributorMap.set(author, {
          user: author,
          commits: 0,
          lines: 0,
          files: "Same File",
          score: 0,
        });
      }

      const current = contributorMap.get(author);
      current.commits += 1;
      // Search for matching filename in files and increment lines changed
      if (path === "entire") {
        current.lines += res.data.stats?.total;
      } else {
        for (const item of res.data.files!) {
          if (item.filename == path) {
            current.lines += item.changes || 0;
          }
        }
      }

      // Logic: Atomic Score (Small focused commits = higher score)
      current.score += computeAtomicScore(res.data.files! || []);
    });
    contributorMap.forEach((value) => {
      value.score = parseFloat((value.score / value.commits).toFixed(1));
    });

    return Array.from(contributorMap.values());
  } catch (error) {
    console.error("Error fetching contributor rankings:", error);
    return [];
  }
};

export interface DebtOccurrence {
  file: string;
  line: string;
  lineNumber: number;
}

export interface DebtCommit {
  sha: string;
  author: string;
  avatarUrl: string;
  date: string;
  url: string;
  linesChanged: number;
  filesChanged: number;
  atomicScore: number;
  occurrences: DebtOccurrence[];
}

/**
 * Searches for debt keywords in commits and extracts the code snippets.
 */
export const fetchDebtAuditCommits = async (
  owner: string,
  repo: string,
  keyword: string,
  page: number = 1,
  author?: string,
  path?: string,
  sort: "desc" | "asc" = "desc",
  per_page: number = 20,
): Promise<DebtCommit[]> => {
  try {
    // 1. Fetch recent commits directly from the Git history
    const listParams: any = {
      owner,
      repo,
      per_page: per_page, // Fetch a chunk of 20 commits to analyze per page
      page: page,
    };

    // Apply filters directly to the listCommits query to optimize
    if (author && author !== "all") listParams.author = author;
    if (path && path !== "entire") listParams.path = path;

    const response = await octokit.rest.repos.listCommits(listParams);
    let commits = response.data;

    // Handle sorting for this chunk
    if (sort === "asc") {
      commits = commits.reverse();
    }

    // 2. Fetch the detailed patch for each commit concurrently
    const detailedCommits: DebtCommit[] = [];

    // We use Promise.all to fetch the details concurrently.
    // (In a massive production app, you'd batch these to protect rate limits)
    const commitDetails = await Promise.all(
      commits.map(async (c) => {
        return await octokit.rest.repos.getCommit({ owner, repo, ref: c.sha });
      }),
    );

    // 3. Manually scan the diffs (patches) for the keyword
    for (const detailRes of commitDetails) {
      const files = detailRes.data.files || [];
      let occurrences: DebtOccurrence[] = [];
      let totalLines = detailRes.data.stats?.total || 0;
      let filesChanged = files.length;

      files.forEach((file: any) => {
        // Extra safeguard: skip files if path doesn't match
        if (path && path !== "entire" && !file.filename.includes(path)) return;

        if (file.patch) {
          const patchLines = file.patch.split("\n");
          let currentLineNumber = 0;

          patchLines.forEach((line: string) => {
            // Parse diff hunk headers (@@ -old,len +new,len @@) to track line numbers
            const hunkMatch = line.match(/^@@ -\d+,\d+ \+(\d+),\d+ @@/);
            if (hunkMatch) currentLineNumber = parseInt(hunkMatch[1], 10) - 1;

            if (line.startsWith("+")) currentLineNumber++;
            if (line.startsWith(" ")) currentLineNumber++;

            // Manual search for the keyword in added lines
            if (
              line.startsWith("+") &&
              line.toLowerCase().includes(keyword.toLowerCase())
            ) {
              occurrences.push({
                file: file.filename,
                line: line.substring(1), // Remove the '+' from the start of the diff line
                lineNumber: currentLineNumber,
              });
            }
          });
        }
      });

      // If we found the keyword in this commit, add it to our results
      if (occurrences.length > 0) {
        const atomicScore = computeAtomicScore(files! || []);

        detailedCommits.push({
          sha: detailRes.data.sha,
          author:
            detailRes.data.author?.login ||
            detailRes.data.commit.author?.name ||
            "Unknown",
          avatarUrl: detailRes.data.author?.avatar_url || "",
          date: detailRes.data.commit.author?.date || "",
          url: detailRes.data.html_url,
          linesChanged: totalLines,
          filesChanged,
          atomicScore: atomicScore,
          occurrences,
        });
      }
    }

    return detailedCommits;
  } catch (error) {
    console.error("Error fetching debt audit:", error);
    return [];
  }
};

// githubApi.ts

/**
 * Searches for contributors within a specific repository.
 */
export const searchRepoContributors = async (
  owner: string,
  repo: string,
  query: string,
) => {
  if (!query) return [];

  try {
    // 1. Fetch contributors for this specific repository
    // Note: We fetch the top 100 contributors to keep the search responsive
    const { data: contributors } = await octokit.rest.repos.listContributors({
      owner,
      repo,
      per_page: 5,
    });

    // 2. Filter the contributor list locally based on the search query
    const filtered = contributors.filter((user) =>
      user.login?.toLowerCase().includes(query.toLowerCase()),
    );

    // 3. Map to the format used by your UserSelector
    return filtered.map((user) => ({
      login: user.login,
      avatar: user.avatar_url,
    }));
  } catch (error) {
    console.error("Error searching repository contributors:", error);
    return [];
  }
};

export interface ContributorStats {
  commits: number;
  lines: number;
  files: number;
  atomicScore: number;
}

export const fetchContributorStats = async (
  owner: string,
  repo: string,
  username: string,
  path?: string,
): Promise<ContributorStats> => {
  try {
    // 1. Fetch the list of commits for this specific author
    // 'path' will filter commits to only those touching a specific file if provided
    const { data: commitList } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      author: username,
      path: path === "entire" ? undefined : path,
      per_page: 100, // Default entries, prevents long load from searching commits with atomic score
    });

    let totalLines = 0;
    let totalFiles = 0;
    let totalAtomicScore = 0;

    // 2. Fetch details for each commit to get additions/deletions/files
    // Note: This can be heavy on the rate limit
    const detailPromises = commitList.map((c) =>
      octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: c.sha,
      }),
    );

    const detailedCommits = await Promise.all(detailPromises);

    detailedCommits.forEach((res) => {
      if (res.data.author?.login == username) {
        // Search for matching filename in files and increment lines changed
        if (path == "entire") {
          totalLines += res.data.stats?.total || 0;
        } else {
          for (const item of res.data.files!) {
            if (item.filename == path) {
              totalLines += item.changes || 0;
            }
          }
        }
        totalFiles += res.data.files?.length || 0;

        // Calculate Atomic Score for this commit
        const score = computeAtomicScore(res.data.files! || []);
        totalAtomicScore += score;
      }
    });

    const commitCount = commitList.length;

    return {
      commits: commitCount,
      lines: totalLines,
      files: totalFiles,
      atomicScore:
        commitCount > 0
          ? parseFloat((totalAtomicScore / commitCount).toFixed(1))
          : 0,
    };
  } catch (error) {
    console.error(`Error fetching stats for ${username}:`, error);
    throw error;
  }
};
