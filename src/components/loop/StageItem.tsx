import clsx from 'clsx';

export type StageState = 'queued' | 'active' | 'done';

type StageItemProps = {
  state: StageState;
  label: string;
  activeLabel: string;
  progress?: number;
};

export function StageItem({
  state,
  label,
  activeLabel,
  progress = 0,
}: StageItemProps) {
  const displayLabel = state === 'active' ? activeLabel : label;
  const safeProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      className={clsx(
        'flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 transition-colors',
        state === 'queued'
          ? 'border-stone-200/70 bg-stone-50/60'
          : 'border-stone-200/80 bg-white shadow-sm shadow-stone-900/[0.03]',
      )}
    >
      <StatusIcon state={state} />

      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            'text-sm font-medium',
            state === 'queued' ? 'text-stone-400' : 'text-stone-900',
          )}
        >
          {displayLabel}
        </p>

        {state === 'active' ? (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-stone-900 transition-[width] duration-300 ease-out"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusIcon({ state }: { state: StageState }) {
  if (state === 'done') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white">
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3.5 8 3 3 6-6" />
        </svg>
      </span>
    );
  }

  if (state === 'active') {
    return (
      <span
        aria-hidden
        className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="h-6 w-6 shrink-0 rounded-full border border-dashed border-stone-300"
    />
  );
}
