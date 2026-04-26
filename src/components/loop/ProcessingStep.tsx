'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useEffect, useRef, useState } from 'react';
import { blurFacesInClip } from '@/lib/clientFaceBlur';
import { ActionStack, SectionHeader, SurfaceCard } from './DesignPrimitives';
import type { CapturedClip } from './types';

type Stage = {
  id: string;
  label: string;
  detail: string;
};

const STAGES: Stage[] = [
  {
    id: 'blur',
    label: 'Blur faces',
    detail: 'Running on-device privacy pass',
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
  clip: CapturedClip;
  onDone: (clip: CapturedClip) => void;
};

export function ProcessingStep({ clip, onDone }: ProcessingStepProps) {
  const [index, setIndex] = useState(0);
  const [blurProgress, setBlurProgress] = useState(0);
  const [processedClip, setProcessedClip] = useState<CapturedClip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    async function runPipeline() {
      try {
        setIndex(0);
        const redactedClip = await blurFacesInClip(clip, (progress) => {
          if (!cancelled) setBlurProgress(progress);
        });
        if (cancelled) return;
        setProcessedClip(redactedClip);
        setIndex(1);

        await new Promise((resolve) => window.setTimeout(resolve, 700));
        if (cancelled) return;
        setIndex(2);

        await new Promise((resolve) => window.setTimeout(resolve, 700));
        if (cancelled) return;
        setIndex(STAGES.length);
      } catch (pipelineError) {
        if (cancelled) return;
        setError(
          pipelineError instanceof Error
            ? pipelineError.message
            : 'Could not process recording.',
        );
      }
    }

    runPipeline();

    return () => {
      cancelled = true;
    };
  }, [clip]);

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <SectionHeader
        title="Processing"
        description="Blurring faces, scoring quality, and generating dummy segments before upload."
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
                    {stage.id === 'blur' && active ? (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-stone-950 transition-all duration-300"
                          style={{ width: `${blurProgress}%` }}
                        />
                      </div>
                    ) : null}
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

      {error ? (
        <SurfaceCard className="border-red-100 bg-red-50 p-4 text-sm leading-relaxed text-red-700">
          {error}
        </SurfaceCard>
      ) : null}

      {index >= STAGES.length ? (
        <ActionStack>
          <Button
            className="w-full"
            disabled={!processedClip}
            onClick={() => {
              if (processedClip) onDone(processedClip);
            }}
            size="lg"
            variant="primary"
          >
            Continue
          </Button>
        </ActionStack>
      ) : null}
    </div>
  );
}
