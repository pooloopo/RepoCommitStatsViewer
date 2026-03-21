import { db, type Repository, type Contributor } from '../db/database';
import { type GitHubRepository } from './githubApi';

export async function syncRepositoriesToDB(repositories: GitHubRepository[]): Promise<void> {
  const now = Date.now();

  const dbRepositories: Repository[] = repositories.map((repo) => ({
    repoID: `${repo.owner.login}/${repo.name}`,
    name: repo.name,
    owner: repo.owner.login,
    lastSynced: now
  }));

  await db.repositories.bulkPut(dbRepositories);

  const contributors: Contributor[] = repositories.map((repo) => ({
    contributorID: repo.owner.login,
    userName: repo.owner.login,
    pfpUrl: repo.owner.avatar_url
  }));

  await db.contributors.bulkPut(contributors);
}

export async function getAllRepositoriesFromDB(): Promise<Repository[]> {
  return db.repositories.toArray();
}

export async function getRepositoryByID(repoID: string): Promise<Repository | undefined> {
  return db.repositories.get(repoID);
}

export async function searchRepositoriesInDB(searchTerm: string): Promise<Repository[]> {
  const allRepos = await db.repositories.toArray();

  if (!searchTerm.trim()) {
    return allRepos.sort((a, b) => b.lastSynced - a.lastSynced);
  }

  const term = searchTerm.toLowerCase();
  return allRepos
    .filter(
      (repo) =>
        repo.name.toLowerCase().includes(term) ||
        repo.owner.toLowerCase().includes(term)
    )
    .sort((a, b) => b.lastSynced - a.lastSynced);
}

export async function clearAllRepositories(): Promise<void> {
  await db.repositories.clear();
}
