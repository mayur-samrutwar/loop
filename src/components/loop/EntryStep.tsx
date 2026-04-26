'use client';

import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useCallback } from 'react';
import {
  SectionHeader,
  StatusMessage,
} from './DesignPrimitives';
import { TASK_CATEGORIES, type TaskCategory } from './types';

type EntryStepProps = {
  onContinue: (task: TaskCategory) => void;
};

export function EntryStep({ onContinue }: EntryStepProps) {
  const { isInstalled } = useMiniKit();
  const canStart = isInstalled || process.env.NODE_ENV === 'development';

  const selectTask = useCallback(
    (task: TaskCategory) => {
      if (canStart) onContinue(task);
    },
    [canStart, onContinue],
  );

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <SectionHeader
        title="Choose a task to record"
      />

      {!isInstalled && process.env.NODE_ENV !== 'development' ? (
        <StatusMessage>
          Open in World App to continue.
        </StatusMessage>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {TASK_CATEGORIES.map((task) => (
          <button
            key={task.id}
            disabled={!canStart}
            onClick={() => selectTask(task)}
            className="group rounded-[1.7rem] border border-stone-200/70 bg-white/90 p-4 text-left shadow-[0_18px_45px_rgba(28,25,23,0.05)] transition hover:-translate-y-0.5 hover:border-stone-300 active:scale-[0.99] disabled:opacity-50"
          >
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-950 transition group-hover:bg-stone-950 group-hover:text-white">
              <TaskIcon id={task.id} />
            </div>
            <p className="text-sm font-semibold tracking-tight text-stone-950">
              {task.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              {task.subtitle}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskIcon({ id }: { id: TaskCategory['id'] }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
  };

  const paths = {
    dishwashing: <path {...common} d="M5 13h14l-1 5.25A2.25 2.25 0 0 1 15.8 20H8.2A2.25 2.25 0 0 1 6 18.25L5 13Zm2-4h10m-8-4h6m-3 0v4" />,
    laundry: <path {...common} d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v12A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Zm2 3h.01M12 16a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" />,
    meal_prep: <path {...common} d="M5 18.5h14M7 15.5h10l-1.25-7h-7.5L7 15.5Zm3-10 2-2 2 2" />,
    surface_cleaning: <path {...common} d="M5 17.5h14M7 14l5-5 3 3-5 5H7v-3Zm8.5-5.5 1.5-1.5" />,
    object_sorting: <path {...common} d="M5.75 6.75h5.5v5.5h-5.5v-5.5Zm7 0h5.5v5.5h-5.5v-5.5Zm-7 7h5.5v3.5h-5.5v-3.5Zm7 0h5.5v3.5h-5.5v-3.5Z" />,
    door_interaction: <path {...common} d="M8 4.75h8A1.25 1.25 0 0 1 17.25 6v12A1.25 1.25 0 0 1 16 19.25H8V4.75Zm5.5 7.25h.01" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      {paths[id]}
    </svg>
  );
}
