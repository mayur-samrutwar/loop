import { NextResponse } from 'next/server';
import { TASK_CATEGORIES } from '@/components/loop/types';
import { computeScore } from '@/lib/scoring';
import {
  listScores,
  recordScore,
  reputation,
  totalEarnings,
  type ScoreEntry,
} from '@/lib/scoreStore';
import { resolveUserIdFromRequest } from '@/lib/serverUser';
import type { SignalSummary } from '@/lib/signalAggregator';

function isValidSummary(value: unknown): value is SignalSummary {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.frameCount === 'number' &&
    typeof s.meanLuma === 'number' &&
    typeof s.lumaUnderRatio === 'number' &&
    typeof s.lumaOverRatio === 'number' &&
    typeof s.motionMean === 'number' &&
    typeof s.motionStd === 'number' &&
    typeof s.motionActiveRatio === 'number' &&
    typeof s.handsVisibleRatio === 'number' &&
    typeof s.taskHintRatio === 'number' &&
    typeof s.durationSec === 'number'
  );
}

export async function POST(request: Request) {
  const userId = await resolveUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    uploadKey?: string;
    task?: string;
    summary?: SignalSummary;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const uploadKey = typeof body.uploadKey === 'string' ? body.uploadKey : '';
  if (!uploadKey) {
    return NextResponse.json({ error: 'Missing uploadKey' }, { status: 400 });
  }

  const task = TASK_CATEGORIES.find((t) => t.id === body.task);
  if (!task) {
    return NextResponse.json({ error: 'Invalid task' }, { status: 400 });
  }

  if (!isValidSummary(body.summary)) {
    return NextResponse.json({ error: 'Invalid summary' }, { status: 400 });
  }

  const breakdown = computeScore(body.summary);

  const entry: ScoreEntry = {
    id: `score-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    taskId: task.id,
    taskName: task.title,
    uploadKey,
    durationSec: Math.max(0, Math.round(body.summary.durationSec)),
    createdAt: Date.now(),
    breakdown,
  };

  recordScore(entry);

  return NextResponse.json({
    score: entry,
    earnings: totalEarnings(userId),
    reputation: reputation(userId),
  });
}

export async function GET(request: Request) {
  const userId = await resolveUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({
      entries: [],
      earnings: 0,
      reputation: { averageScore: 0, uploads: 0, reputation: 'rookie' as const },
    });
  }

  return NextResponse.json({
    entries: listScores(userId),
    earnings: totalEarnings(userId),
    reputation: reputation(userId),
  });
}
