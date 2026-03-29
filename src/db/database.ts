import Dexie, { type Table } from "dexie";

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

export class RepoCommitStatsDB extends Dexie {
  snapshots!: Table<Snapshot>;

  constructor() {
    super("RepoCommitStatsDB");
    this.version(1).stores({
      snapshots: "++id, [owner+repoName+timestamp]", // Indexing for fast lookups
    });
  }
}

export const db = new RepoCommitStatsDB();

