'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useEffect, useState } from 'react';
import { ActionStack, SectionHeader, SurfaceCard } from './DesignPrimitives';

type Stage = {
  id: string;
  label: string;
  detail: string;
};

const STAGES: Stage[] = [
  { id: 'upload', label: 'Prepare upload', detail: 'Packaging video and capture metadata' },
  {
    id: 'blur',
    label: 'Privacy pass',
    detail: 'Face boxes blurred; EXIF stripped',
  },
  {
    id: 'quality',
    label: 'Quality scoring',
    detail: 'Lighting, motion, and framing heuristics',
  },
  {
    id: 'segment',
    label: 'Auto segmentation',
    detail: 'Dummy task steps generated for this prototype',
  },
];

type ProcessingStepProps = {
  onDone: () => void;
};

export function ProcessingStep({ onDone }: ProcessingStepProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= STAGES.length) {
      return;
    }
    const t = setTimeout(() => setIndex((i) => i + 1), 780);
    return () => clearTimeout(t);
  }, [index, onDone]);

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <SectionHeader
        title="Processing"
        description="We prepare the upload, clean private metadata, score quality, and generate a dummy segmented timeline."
      />

      <ol className="flex flex-col gap-4">
        {STAGES.map((stage, i) => {
          const done = i < index;
          const active = i === index && index < STAGES.length;
          return (
            <li key={stage.id}>
              <SurfaceCard
                className={`px-4 py-4 transition-colors ${
                  done
                    ? 'border-emerald-200/80 bg-emerald-50/80'
                    : active
                      ? 'border-stone-900/15 bg-white'
                      : 'bg-stone-100/60 text-stone-400'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      {stage.label}
                    </p>
                    <p className="text-xs text-stone-600">{stage.detail}</p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    {done ? 'Done' : active ? 'Running' : 'Queued'}
                  </span>
                </div>
              </SurfaceCard>
            </li>
          );
        })}
      </ol>

      {index >= STAGES.length ? (
        <ActionStack>
          <Button className="w-full" onClick={onDone} size="lg" variant="primary">
            Continue
          </Button>
        </ActionStack>
      ) : null}
    </div>
  );
}
