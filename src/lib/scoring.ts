import type { SignalSummary } from './signalAggregator';

export type ScoreFactorId =
  | 'hands'
  | 'motion'
  | 'lighting'
  | 'stability'
  | 'duration';

export type ScoreFactor = {
  id: ScoreFactorId;
  label: string;
  weight: number;
  score: number;
  detail: string;
};

export type ScoreTier = 'low' | 'fair' | 'good' | 'excellent';

export type ScoreBreakdown = {
  total: number;
  reward: number;
  tier: ScoreTier;
  message: string;
  factors: ScoreFactor[];
};

const BASE_REWARD = 0.25;

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function ramp(value: number, start: number, end: number) {
  if (value <= start) return 0;
  if (value >= end) return 100;
  return ((value - start) / (end - start)) * 100;
}

function inverseRamp(value: number, start: number, end: number) {
  if (value <= start) return 100;
  if (value >= end) return 0;
  return 100 - ((value - start) / (end - start)) * 100;
}

export function computeScore(summary: SignalSummary): ScoreBreakdown {
  const handsScore = clamp(ramp(summary.handsVisibleRatio, 0.15, 0.7));

  const activity = ramp(summary.motionActiveRatio, 0.15, 0.65);
  const variation = ramp(summary.motionStd, 0.003, 0.03);
  const motionScore = clamp(activity * 0.6 + variation * 0.4);

  let lightingScore: number;
  if (summary.meanLuma < 80) {
    lightingScore = clamp(ramp(summary.meanLuma, 30, 80));
  } else if (summary.meanLuma > 200) {
    lightingScore = clamp(inverseRamp(summary.meanLuma, 200, 245));
  } else {
    lightingScore = 100;
  }
  lightingScore = clamp(
    lightingScore -
      summary.lumaUnderRatio * 60 -
      summary.lumaOverRatio * 60,
  );

  const stabilityScore = clamp(inverseRamp(summary.motionStd, 0.04, 0.18));

  const durationScore = clamp(ramp(summary.durationSec, 10, 600));

  const factors: ScoreFactor[] = [
    {
      id: 'hands',
      label: 'Hand & action visibility',
      weight: 0.35,
      score: Math.round(handsScore),
      detail: `Hands detected in ${Math.round(summary.handsVisibleRatio * 100)}% of sampled seconds.`,
    },
    {
      id: 'motion',
      label: 'Useful motion',
      weight: 0.25,
      score: Math.round(motionScore),
      detail: `${Math.round(summary.motionActiveRatio * 100)}% active seconds, ${(summary.motionStd * 100).toFixed(1)} variation.`,
    },
    {
      id: 'lighting',
      label: 'Lighting',
      weight: 0.20,
      score: Math.round(lightingScore),
      detail: `Average brightness ${Math.round(summary.meanLuma)}/255.`,
    },
    {
      id: 'stability',
      label: 'Stability',
      weight: 0.15,
      score: Math.round(stabilityScore),
      detail: `Camera shake variance ${(summary.motionStd * 100).toFixed(1)}.`,
    },
    {
      id: 'duration',
      label: 'Duration',
      weight: 0.05,
      score: Math.round(durationScore),
      detail: `${Math.round(summary.durationSec)}s captured (10s min, 10min max).`,
    },
  ];

  const total = Math.round(
    factors.reduce((acc, f) => acc + f.score * f.weight, 0),
  );

  let tier: ScoreTier = 'low';
  let message =
    'Quality below threshold. Try again with hands clearly in frame and steadier light.';
  if (total >= 82) {
    tier = 'excellent';
    message = 'Excellent capture. Premium reward unlocked.';
  } else if (total >= 65) {
    tier = 'good';
    message = 'Good capture. Keep hands in frame longer for a higher reward.';
  } else if (total >= 45) {
    tier = 'fair';
    message = 'Fair capture. Vary your motion and stabilise the camera.';
  }

  const tierBonus = tier === 'excellent' ? 1.4 : tier === 'good' ? 1.1 : tier === 'fair' ? 0.85 : 0.5;
  const rewardRaw = BASE_REWARD * (0.4 + (total / 100) * 0.6) * tierBonus;
  const reward = Math.max(0, Math.round(rewardRaw * 100) / 100);

  return { total, reward, tier, message, factors };
}
