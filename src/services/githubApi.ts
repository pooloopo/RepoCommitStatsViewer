
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

function parseRateLimitInfo(headers: Headers): RateLimitInfo {
  return {
    limit: parseInt(headers.get('x-ratelimit-limit') || '60'),
    remaining: parseInt(headers.get('x-ratelimit-remaining') || '0'),
    reset: parseInt(headers.get('x-ratelimit-reset') || '0') * 1000
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
//need work
export async function listOrgs({ token }: { token: string }) {
    return await fetch("https://api.github.com/user/orgs", {
        method: "GET",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2026-03-10",
        },
    })
}

export async function fetchUserRepositories(
  username: string,
  accessToken: string,
  page: number = 1
): Promise<FetchRepositoriesResponse> {
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const query = `involves:${username}`;
  const url = new URL('https://api.github.com/search/repositories');
  url.searchParams.append('q', query);
  url.searchParams.append('sort', 'updated');
  url.searchParams.append('order', 'desc');
  url.searchParams.append('per_page', perPage.toString());
  url.searchParams.append('page', page.toString());

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const rateLimit = parseRateLimitInfo(response.headers);
    updateRateLimitState(rateLimit);

    if (response.status === 403 && rateLimit.remaining === 0) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();

    const repositories = data.items.map((repo: any) => ({
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
      hasMore: offset + perPage < data.total_count
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED') {
      throw error;
    }
    throw error;
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
