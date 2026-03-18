export async function listUsers({ token }: { token: string }) {
    return await fetch(`https://api.github.com/users`, {
        method: "GET",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2026-03-10",
        },
    })
}
