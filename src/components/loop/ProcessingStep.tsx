'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useEffect, useRef, useState } from 'react';
import { blurFacesInClip } from '@/lib/clientFaceBlur';
import { scanClipQuality } from '@/lib/qualityScan';
import type { SignalSummary } from '@/lib/signalAggregator';
import { ActionStack, SectionHeader, SurfaceCard } from './DesignPrimitives';
import type { CapturedClip } from './types';

type Stage = {
  id: 'blur' | 'score' | 'pack';
  label: string;
  detail: string;
};

const STAGES: Stage[] = [
  {
    id: 'blur',
    label: 'Blur faces',
    detail: 'On-device privacy pass with MediaPipe.',
  },
  {
    id: 'score',
    label: 'Score quality',
    detail: 'Per-second hand detection, lighting, and motion analysis.',
  },
  {
    id: 'pack',
    label: 'Prepare upload',
    detail: 'Finalising the redacted clip for transfer.',
  },
];

type ProcessingStepProps = {
  clip: CapturedClip;
  onDone: (clip: CapturedClip, summary: SignalSummary) => void;
};

export function ProcessingStep({ clip, onDone }: ProcessingStepProps) {
  const [index, setIndex] = useState(0);
  const [blurProgress, setBlurProgress] = useState(0);
  const [scoreProgress, setScoreProgress] = useState(0);
  const [processedClip, setProcessedClip] = useState<CapturedClip | null>(null);
  const [summary, setSummary] = useState<SignalSummary | null>(null);
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

        setIndex(1);
        const scanSummary = await scanClipQuality(clip, (progress) => {
          if (!cancelled) setScoreProgress(progress);
        });
        if (cancelled) return;

        setIndex(2);
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        if (cancelled) return;

        setProcessedClip(redactedClip);
        setSummary(scanSummary);
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

  const ready = processedClip !== null && summary !== null;

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <SectionHeader
        title="Processing"
        description="Blurring faces and running real hand detection before upload."
      />

      <ol className="flex flex-col gap-4">
        {STAGES.map((stage, i) => {
          const done = i < index;
          const active = i === index && index < STAGES.length;
          const showProgress =
            active && (stage.id === 'blur' || stage.id === 'score');
          const progressValue =
            stage.id === 'blur' ? blurProgress : scoreProgress;

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
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-stone-900">
                      {stage.label}
                    </p>
                    <p className="text-xs text-stone-600">{stage.detail}</p>
                    {showProgress ? (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-stone-950 transition-all duration-300"
                          style={{ width: `${progressValue}%` }}
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
            disabled={!ready}
            onClick={() => {
              if (processedClip && summary) onDone(processedClip, summary);
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
