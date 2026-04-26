import clsx from 'clsx';
import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  centered?: boolean;
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  centered,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={twMerge(
        clsx('space-y-4', centered && 'text-center', className),
      )}
    >
      <div className="space-y-3">
        {eyebrow ? (
          <p className="text-xs font-medium tracking-[0.08em] text-stone-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-stone-950">
          {title}
        </h1>
      </div>
      {description ? (
        <p className="text-sm leading-relaxed text-stone-600">{description}</p>
      ) : null}
    </div>
  );
}

export function SurfaceCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={twMerge(
        'rounded-3xl border border-stone-200/80 bg-white/90 shadow-sm shadow-stone-900/[0.03]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ActionStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={twMerge('flex flex-col gap-3 pt-2', className)}>
      {children}
    </div>
  );
}

export function StatusMessage({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warning' | 'error' | 'success';
  children: ReactNode;
}) {
  const classes = {
    neutral: 'border-stone-200/90 bg-stone-50 text-stone-700',
    warning: 'border-amber-200/90 bg-amber-50 text-amber-950',
    error: 'border-red-100 bg-red-50 text-red-800',
    success: 'border-emerald-200/90 bg-emerald-50 text-emerald-900',
  };

  return (
    <p
      className={twMerge(
        'rounded-2xl border px-4 py-3 text-sm leading-relaxed',
        classes[tone],
      )}
    >
      {children}
    </p>
  );
}

export function BackIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-900 shadow-sm shadow-stone-900/[0.04] ring-1 ring-stone-200/80 transition active:scale-95"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
        <path
          d="M15 5.75 8.75 12 15 18.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </button>
  );
}

