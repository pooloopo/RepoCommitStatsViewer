import Dexie, { type Table } from 'dexie';

export interface Repository {
  repoID: string;
  name: string;
  owner: string;
  lastSynced: number;
}

export interface Commit {
  commitID: string;
  repoID: string;
  contributorID: string;
  timestamp: number;
  linesChanged: number;
  filesChanged: number;
  atomicScore: number;
}

export interface Snapshot {
  id?: number;
  repoName: string;
  owner: string;
  timestamp: number;
  commits: number;
  lines: number;
  files: number;
  atomicScore: number;
}

export interface Contributor {
  contributorID: string;
  userName: string;
  pfpUrl: string;
}

export interface TechnicalDebt {
  debtID: string;
  contributorID: string;
  commitID: string;
  keyword: string;
}

export class RepoCommitStatsDB extends Dexie {
  repositories!: Table<Repository>;
  commits!: Table<Commit>;
  snapshots!: Table<Snapshot>;
  contributors!: Table<Contributor>;
  technicalDebt!: Table<TechnicalDebt>;

  constructor() {
    super('RepoCommitStatsDB');
    this.version(1).stores({
      repositories: 'repoID',
      commits: 'commitID, repoID',
      snapshots: '++id, owner, reponame, timestamp, [owner+repoName+timestamp]', // Indexing for fast lookups
      contributors: 'contributorID',
      technicalDebt: 'debtID, contributorID, commitID'
    });
  }
}

export const db = new RepoCommitStatsDB();
