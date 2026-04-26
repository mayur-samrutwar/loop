import type { ScoreBreakdown } from './scoring';

export type ScoreEntry = {
  id: string;
  userId: string;
  taskId: string;
  taskName: string;
  uploadKey: string;
  durationSec: number;
  createdAt: number;
  breakdown: ScoreBreakdown;
};

type Store = {
  entries: Map<string, ScoreEntry[]>;
};

declare global {
  var __loopScoreStore: Store | undefined;
}

const store: Store =
  globalThis.__loopScoreStore ?? { entries: new Map<string, ScoreEntry[]>() };

if (!globalThis.__loopScoreStore) {
  globalThis.__loopScoreStore = store;
}

const MAX_HISTORY = 25;

export function recordScore(entry: ScoreEntry): ScoreEntry {
  const existing = store.entries.get(entry.userId) ?? [];
  const next = [entry, ...existing].slice(0, MAX_HISTORY);
  store.entries.set(entry.userId, next);
  return entry;
}

export function listScores(userId: string): ScoreEntry[] {
  return store.entries.get(userId) ?? [];
}

export function totalEarnings(userId: string): number {
  const list = listScores(userId);
  if (!list.length) return 0;
  const sum = list.reduce((acc, e) => acc + e.breakdown.reward, 0);
  return Math.round(sum * 100) / 100;
}

export type ReputationStat = {
  averageScore: number;
  uploads: number;
  reputation: 'rookie' | 'trusted' | 'pro';
};

export function reputation(userId: string): ReputationStat {
  const list = listScores(userId);
  if (!list.length) {
    return { averageScore: 0, uploads: 0, reputation: 'rookie' };
  }

  const recent = list.slice(0, 10);
  const avg = recent.reduce((acc, e) => acc + e.breakdown.total, 0) / recent.length;
  const averageScore = Math.round(avg);

  let rep: ReputationStat['reputation'] = 'rookie';
  if (list.length >= 5 && averageScore >= 70) rep = 'pro';
  else if (list.length >= 2 && averageScore >= 55) rep = 'trusted';

  return { averageScore, uploads: list.length, reputation: rep };
}
