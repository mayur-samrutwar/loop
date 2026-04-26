import type { ScoreBreakdown, ScoreTier } from '@/lib/scoring';
import { SurfaceCard } from './DesignPrimitives';

const tierStyles: Record<ScoreTier, { ring: string; text: string; chip: string; label: string }> = {
  excellent: {
    ring: 'ring-emerald-200/80',
    text: 'text-emerald-700',
    chip: 'bg-emerald-50 text-emerald-700',
    label: 'Excellent',
  },
  good: {
    ring: 'ring-stone-200/80',
    text: 'text-stone-900',
    chip: 'bg-stone-100 text-stone-700',
    label: 'Good',
  },
  fair: {
    ring: 'ring-amber-200/80',
    text: 'text-amber-700',
    chip: 'bg-amber-50 text-amber-700',
    label: 'Fair',
  },
  low: {
    ring: 'ring-red-200/80',
    text: 'text-red-700',
    chip: 'bg-red-50 text-red-700',
    label: 'Needs work',
  },
};

type ScoreCardProps = {
  breakdown: ScoreBreakdown;
  taskName?: string;
  reward?: number;
  className?: string;
};

export function ScoreCard({
  breakdown,
  taskName,
  reward,
  className,
}: ScoreCardProps) {
  const tier = tierStyles[breakdown.tier];
  const finalReward = reward ?? breakdown.reward;
  const hasReward = finalReward > 0;

  return (
    <SurfaceCard className={`p-5 ring-1 ${tier.ring} ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-stone-500">
            Clip quality score
          </p>
          {taskName ? (
            <p className="mt-1 text-sm font-medium text-stone-700">{taskName}</p>
          ) : null}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tier.chip}`}>
          {tier.label}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <p className={`text-5xl font-semibold tracking-tight ${tier.text}`}>
          {breakdown.total}
          <span className="ml-1 text-base font-medium text-stone-400">/100</span>
        </p>
        {hasReward ? (
          <div className="text-right">
            <p className="text-xs text-stone-500">Reward</p>
            <p className="text-2xl font-semibold tracking-tight text-stone-950">
              ${finalReward.toFixed(2)}
            </p>
          </div>
        ) : (
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-500">
            No reward
          </span>
        )}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-stone-600">
        {breakdown.message}
      </p>

      <div className="mt-5 space-y-3">
        {breakdown.factors.map((factor) => (
          <div key={factor.id}>
            <div className="flex items-center justify-between text-xs font-medium text-stone-700">
              <span>{factor.label}</span>
              <span className="text-stone-500">
                {factor.score}
                <span className="text-stone-400"> · {Math.round(factor.weight * 100)}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-stone-900 transition-all duration-500"
                style={{ width: `${Math.max(2, factor.score)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
              {factor.detail}
            </p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
