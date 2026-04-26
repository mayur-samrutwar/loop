'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useEffect, useRef, useState } from 'react';
import { blurFacesInClip } from '@/lib/clientFaceBlur';
import { scanClipQuality } from '@/lib/qualityScan';
import type { SignalSummary } from '@/lib/signalAggregator';
import { ActionStack, SectionHeader, SurfaceCard } from './DesignPrimitives';
import { StageItem, type StageState } from './StageItem';
import type { CapturedClip } from './types';

type StageDef = {
  id: 'blur' | 'score' | 'pack';
  label: string;
  activeLabel: string;
};

const STAGES: StageDef[] = [
  { id: 'blur', label: 'Blur faces', activeLabel: 'Blurring faces' },
  { id: 'score', label: 'Score quality', activeLabel: 'Scoring quality' },
  { id: 'pack', label: 'Prepare upload', activeLabel: 'Preparing upload' },
];

const PACK_DURATION_MS = 600;

type ProcessingStepProps = {
  clip: CapturedClip;
  onDone: (clip: CapturedClip, summary: SignalSummary) => void;
};

export function ProcessingStep({ clip, onDone }: ProcessingStepProps) {
  const [index, setIndex] = useState(0);
  const [blurProgress, setBlurProgress] = useState(0);
  const [scoreProgress, setScoreProgress] = useState(0);
  const [packProgress, setPackProgress] = useState(0);
  const [processedClip, setProcessedClip] = useState<CapturedClip | null>(null);
  const [summary, setSummary] = useState<SignalSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    let packRaf = 0;

    async function runPipeline() {
      try {
        setIndex(0);
        const redactedClip = await blurFacesInClip(clip, (progress) => {
          if (!cancelled) setBlurProgress(progress);
        });
        if (cancelled) return;
        setBlurProgress(100);

        setIndex(1);
        const scanSummary = await scanClipQuality(clip, (progress) => {
          if (!cancelled) setScoreProgress(progress);
        });
        if (cancelled) return;
        setScoreProgress(100);

        setIndex(2);
        const packStart = performance.now();
        const tick = () => {
          if (cancelled) return;
          const elapsed = performance.now() - packStart;
          const next = Math.min(100, (elapsed / PACK_DURATION_MS) * 100);
          setPackProgress(next);
          if (next < 100) packRaf = requestAnimationFrame(tick);
        };
        packRaf = requestAnimationFrame(tick);

        await new Promise((resolve) => window.setTimeout(resolve, PACK_DURATION_MS));
        if (cancelled) return;
        setPackProgress(100);

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
      if (packRaf) cancelAnimationFrame(packRaf);
    };
  }, [clip]);

  const ready = processedClip !== null && summary !== null;

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <SectionHeader
        title="Processing"
        description="Blurring faces and scoring quality before upload."
      />

      <ol className="flex flex-col gap-3">
        {STAGES.map((stage, i) => {
          const state: StageState =
            i < index ? 'done' : i === index && index < STAGES.length ? 'active' : 'queued';
          const progress =
            stage.id === 'blur'
              ? blurProgress
              : stage.id === 'score'
                ? scoreProgress
                : packProgress;

          return (
            <li key={stage.id}>
              <StageItem
                state={state}
                label={stage.label}
                activeLabel={stage.activeLabel}
                progress={progress}
              />
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
