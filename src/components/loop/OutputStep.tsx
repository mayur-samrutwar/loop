'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Confetti, type ConfettiRef } from '@/components/ui/confetti';
import { getPreviewUserId } from '@/lib/clientUserId';
import type { ScoreBreakdown } from '@/lib/scoring';
import type { ReputationStat, ScoreEntry } from '@/lib/scoreStore';
import type { SignalSummary } from '@/lib/signalAggregator';
import { PREVIEW_HEADER_KEY } from '@/lib/userIdConstants';
import { ActionStack, SectionHeader, SurfaceCard } from './DesignPrimitives';
import { ScoreCard } from './ScoreCard';
import type { CapturedClip, DatasetOutput } from './types';

type OutputStepProps = {
  clip: CapturedClip;
  dataset: DatasetOutput;
  summary: SignalSummary;
  onReset: () => void;
};

type CreateUploadResponse = {
  key: string;
  uploadUrl: string;
  publicUrl: string | null;
};

type ScoreResponse = {
  score: ScoreEntry;
  earnings: number;
  reputation: ReputationStat;
};

type Phase = 'idle' | 'uploading' | 'scoring' | 'done' | 'error';

export function OutputStep({ clip, dataset, summary, onReset }: OutputStepProps) {
  const confettiRef = useRef<ConfettiRef>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [earnings, setEarnings] = useState<number | null>(null);
  const [reputation, setReputation] = useState<ReputationStat | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasFiredConfetti, setHasFiredConfetti] = useState(false);

  const startUpload = useCallback(async () => {
    if (phase === 'uploading' || phase === 'scoring' || phase === 'done') return;

    setPhase('uploading');
    setProgress(0);
    setErrorMessage(null);
    setBreakdown(null);
    setHasFiredConfetti(false);

    try {
      const createResponse = await fetch('/api/recordings/create-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: clip.fileName,
          contentType: clip.mimeType,
          size: clip.size,
          task: dataset.task,
        }),
      });

      const uploadTarget = (await createResponse.json()) as
        | CreateUploadResponse
        | { error?: string };

      if (!createResponse.ok || !('uploadUrl' in uploadTarget)) {
        const message =
          'error' in uploadTarget && uploadTarget.error
            ? uploadTarget.error
            : 'Could not create upload URL';
        throw new Error(message);
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadTarget.uploadUrl);
        xhr.setRequestHeader('Content-Type', clip.mimeType);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          setProgress(Math.round((event.loaded / event.total) * 100));
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100);
            resolve();
            return;
          }
          reject(new Error(`Upload failed with status ${xhr.status}`));
        };

        xhr.onerror = () => {
          reject(new Error('Upload failed. Check R2 CORS and network access.'));
        };

        xhr.send(clip.blob);
      });

      setPhase('scoring');

      const previewId = getPreviewUserId();
      const scoreResponse = await fetch('/api/recordings/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(previewId ? { [PREVIEW_HEADER_KEY]: previewId } : {}),
        },
        body: JSON.stringify({
          uploadKey: uploadTarget.key,
          task: dataset.task,
          summary,
        }),
      });

      const scoreBody = (await scoreResponse.json()) as
        | ScoreResponse
        | { error?: string };

      if (!scoreResponse.ok || !('score' in scoreBody)) {
        const message =
          'error' in scoreBody && scoreBody.error
            ? scoreBody.error
            : 'Could not score recording';
        throw new Error(message);
      }

      setBreakdown(scoreBody.score.breakdown);
      setEarnings(scoreBody.earnings);
      setReputation(scoreBody.reputation);
      setPhase('done');
    } catch (error) {
      setProgress(0);
      setErrorMessage(
        error instanceof Error ? error.message : 'Upload failed. Try again.',
      );
      setPhase('error');
    }
  }, [clip, dataset.task, phase, summary]);

  useEffect(() => {
    if (phase !== 'done' || hasFiredConfetti) return;
    confettiRef.current?.fire();
    setHasFiredConfetti(true);
  }, [hasFiredConfetti, phase]);

  const isWorking = phase === 'uploading' || phase === 'scoring';
  const headlineTitle =
    phase === 'done'
      ? 'Score ready'
      : phase === 'scoring'
        ? 'Scoring recording'
        : phase === 'error'
          ? 'Upload failed'
          : 'Ready to upload';

  const headlineDescription =
    phase === 'done'
      ? 'Your recording has been uploaded and scored.'
      : phase === 'scoring'
        ? 'Running quality checks on the server.'
        : phase === 'error'
          ? 'You can retry the upload below.'
          : 'Securely upload your blurred clip to score it.';

  return (
    <div className="relative flex w-full max-w-md flex-col gap-6">
      <Confetti
        ref={confettiRef}
        className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      />

      <SectionHeader title={headlineTitle} description={headlineDescription} />

      {phase !== 'done' ? (
        <SurfaceCard className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-stone-950">
                {dataset.task_name}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {(clip.size / (1024 * 1024)).toFixed(1)}MB · faces blurred
              </p>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700">
              {phase === 'scoring' ? 'Scoring' : `${progress}%`}
            </span>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-stone-950 transition-all duration-300"
              style={{
                width: `${phase === 'scoring' ? 100 : progress}%`,
              }}
            />
          </div>
          <p className="mt-3 text-xs text-stone-500">
            {phase === 'scoring'
              ? 'Calculating quality score on the server.'
              : phase === 'uploading'
                ? `${progress}% uploaded`
                : 'Ready for secure upload.'}
          </p>
          {errorMessage ? (
            <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700 ring-1 ring-red-100">
              {errorMessage}
            </p>
          ) : null}
        </SurfaceCard>
      ) : null}

      {phase === 'done' && breakdown ? (
        <ScoreCard
          breakdown={breakdown}
          taskName={dataset.task_name}
        />
      ) : null}

      {phase === 'done' && reputation ? (
        <SurfaceCard className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-stone-500">
                Reputation
              </p>
              <p className="mt-1 text-sm font-semibold text-stone-950 capitalize">
                {reputation.reputation}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500">10-clip avg · total uploads</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">
                {reputation.averageScore}/100 · {reputation.uploads}
              </p>
            </div>
          </div>
          {earnings !== null ? (
            <div className="mt-4 flex items-end justify-between border-t border-stone-100 pt-3">
              <p className="text-xs text-stone-500">Lifetime earnings</p>
              <p className="text-lg font-semibold tracking-tight text-stone-950">
                ${earnings.toFixed(2)}
              </p>
            </div>
          ) : null}
        </SurfaceCard>
      ) : null}

      <ActionStack>
        {phase !== 'done' ? (
          <Button
            size="lg"
            variant="primary"
            onClick={startUpload}
            disabled={isWorking}
          >
            {phase === 'uploading'
              ? 'Uploading'
              : phase === 'scoring'
                ? 'Scoring'
                : phase === 'error'
                  ? 'Retry upload'
                  : 'Upload recording'}
          </Button>
        ) : null}
        <Button
          size="lg"
          variant={phase === 'done' ? 'primary' : 'tertiary'}
          onClick={onReset}
        >
          Start new capture
        </Button>
      </ActionStack>
    </div>
  );
}
