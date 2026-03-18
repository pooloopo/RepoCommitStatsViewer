export type Repo = {
    "id": string;
    "node_id": string;
    "name": string;
    "full_name": string;
    "html_url": string;
    "description": string;
    "url": string;
};

export async function listRepos({ token, org }: { token: string; org: string }) {
    return await fetch(`https://api.github.com/orgs/${org}/repos`, {
        method: "GET",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2026-03-10",
        },
    })
}
