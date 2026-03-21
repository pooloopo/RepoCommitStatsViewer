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
  snapshotID: string;
  repoID: string;
  timestamp: number;
  avgDailyCommits: number;
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
      snapshots: 'snapshotID, repoID',
      contributors: 'contributorID',
      technicalDebt: 'debtID, contributorID, commitID'
    });
  }
}

export const db = new RepoCommitStatsDB();
