import { formatLoop } from '@/lib/formatLoop';
import type { ScoreEntry } from '@/lib/scoreStore';
import type { ScoreTier } from '@/lib/scoring';
import { SurfaceCard } from './DesignPrimitives';

const tierBadge: Record<ScoreTier, { chip: string; label: string }> = {
  excellent: { chip: 'bg-emerald-50 text-emerald-700', label: 'Excellent' },
  good: { chip: 'bg-stone-100 text-stone-700', label: 'Good' },
  fair: { chip: 'bg-amber-50 text-amber-700', label: 'Fair' },
  low: { chip: 'bg-red-50 text-red-700', label: 'Needs work' },
};

function formatRelative(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function ScoreHistoryItem({ entry }: { entry: ScoreEntry }) {
  const tier = tierBadge[entry.breakdown.tier];

  return (
    <SurfaceCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-stone-500">
            Last upload scored
          </p>
          <p className="mt-1 text-sm font-semibold text-stone-950">
            {entry.taskName}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            {formatRelative(entry.createdAt)} · {Math.round(entry.durationSec)}s
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tier.chip}`}>
          {tier.label}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <p className="text-3xl font-semibold tracking-tight text-stone-950">
          {entry.breakdown.total}
          <span className="ml-1 text-sm font-medium text-stone-400">/100</span>
        </p>
        {entry.breakdown.reward > 0 ? (
          <p className="text-sm font-semibold text-stone-900">
            +{formatLoop(entry.breakdown.reward)}
          </p>
        ) : (
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-stone-400">
            No reward
          </p>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-stone-500">
        {entry.breakdown.message}
      </p>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {entry.breakdown.factors.map((factor) => (
          <div key={factor.id} className="text-center">
            <div className="mx-auto flex h-10 w-1.5 flex-col-reverse overflow-hidden rounded-full bg-stone-100">
              <div
                className="w-full rounded-full bg-stone-900 transition-all"
                style={{ height: `${Math.max(8, factor.score)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-stone-400">
              {factor.id.slice(0, 4)}
            </p>
            <p className="text-[10px] font-semibold text-stone-700">
              {factor.score}
            </p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
