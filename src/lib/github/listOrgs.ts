export type Org = {
    "id": number;
    "node_id": string;
    "url": string;
    "avatar_url": string;
    "description": string;
};

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
