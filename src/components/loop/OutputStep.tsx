'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Confetti, type ConfettiRef } from '@/components/ui/confetti';
import { blurFacesInClip } from '@/lib/clientFaceBlur';
import { ActionStack, SectionHeader, SurfaceCard } from './DesignPrimitives';
import type { CapturedClip, DatasetOutput } from './types';

type OutputStepProps = {
  clip: CapturedClip;
  dataset: DatasetOutput;
  onReset: () => void;
};

type CreateUploadResponse = {
  key: string;
  uploadUrl: string;
  publicUrl: string | null;
};

export function OutputStep({ clip, dataset, onReset }: OutputStepProps) {
  const confettiRef = useRef<ConfettiRef>(null);
  const [redactedClip, setRedactedClip] = useState<CapturedClip | null>(null);
  const [blurring, setBlurring] = useState(false);
  const [blurProgress, setBlurProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [hasFiredConfetti, setHasFiredConfetti] = useState(false);

  const upload = useCallback(async () => {
    if (blurring || uploading || uploadComplete) return;

    setBlurring(true);
    setUploading(true);
    setProgress(0);
    setBlurProgress(0);
    setUploadError(null);
    setUploadComplete(false);
    setHasFiredConfetti(false);

    try {
      const clipToUpload =
        redactedClip ??
        (await blurFacesInClip(clip, (nextProgress) => {
          setBlurProgress(nextProgress);
        }));
      setRedactedClip(clipToUpload);
      setBlurring(false);

      const response = await fetch('/api/recordings/create-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: clipToUpload.fileName,
          contentType: clipToUpload.mimeType,
          size: clipToUpload.size,
          task: dataset.task,
        }),
      });

      const uploadTarget = (await response.json()) as
        | CreateUploadResponse
        | { error?: string };

      if (!response.ok || !('uploadUrl' in uploadTarget)) {
        const message =
          'error' in uploadTarget && uploadTarget.error
            ? uploadTarget.error
            : 'Could not create upload URL';
        throw new Error(message);
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadTarget.uploadUrl);
        xhr.setRequestHeader('Content-Type', clipToUpload.mimeType);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          setProgress(Math.round((event.loaded / event.total) * 100));
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100);
            setUploadKey(uploadTarget.key);
            setUploadComplete(true);
            resolve();
            return;
          }

          reject(new Error(`Upload failed with status ${xhr.status}`));
        };

        xhr.onerror = () => {
          reject(new Error('Upload failed. Check R2 CORS and network access.'));
        };

        xhr.send(clipToUpload.blob);
      });
    } catch (error) {
      setProgress(0);
      setUploadError(
        error instanceof Error ? error.message : 'Upload failed. Try again.',
      );
    } finally {
      setBlurring(false);
      setUploading(false);
    }
  }, [
    blurring,
    clip,
    dataset.task,
    redactedClip,
    uploadComplete,
    uploading,
  ]);

  useEffect(() => {
    if (!uploadComplete || hasFiredConfetti) return;

    confettiRef.current?.fire();
    setHasFiredConfetti(true);
  }, [hasFiredConfetti, uploadComplete]);

  return (
    <div className="relative flex w-full max-w-md flex-col gap-8">
      <Confetti
        ref={confettiRef}
        className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      />

      {uploadComplete ? (
        <div className="pointer-events-none absolute inset-x-0 -top-4 flex justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="h-3 w-3 rounded-full bg-sky-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
        </div>
      ) : null}

      <SectionHeader
        title={uploadComplete ? 'Upload complete' : 'Ready to upload'}
        description={
          uploadComplete
            ? 'Your recording and generated segments were uploaded to the Loop server.'
            : 'Faces are blurred on-device first, then the redacted video and metadata are uploaded.'
        }
      />

      <SurfaceCard className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-stone-950">
              {dataset.task_name}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {dataset.steps.length} auto segments ·{' '}
              {((redactedClip?.size ?? clip.size) / (1024 * 1024)).toFixed(1)}MB
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700">
            {redactedClip ? 'Blurred' : 'Raw'}
          </span>
        </div>

        {blurring ? (
          <>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-stone-950 transition-all duration-300"
                style={{ width: `${blurProgress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-stone-500">
              Blurring faces on-device · {blurProgress}%
            </p>
          </>
        ) : null}

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-stone-950 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-stone-500">
          {uploadComplete
            ? 'Uploaded successfully.'
            : uploading
              ? blurring
                ? 'Waiting for privacy pass before upload.'
                : `${progress}% uploaded`
              : 'Ready for secure R2 upload.'}
        </p>
        {uploadKey ? (
          <p className="mt-2 break-all text-[11px] leading-relaxed text-stone-400">
            {uploadKey}
          </p>
        ) : null}
        {uploadError ? (
          <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700 ring-1 ring-red-100">
            {uploadError}
          </p>
        ) : null}
      </SurfaceCard>

      <SurfaceCard className="p-5">
        <p className="text-sm font-semibold text-stone-950">Generated segments</p>
        <div className="mt-4 flex flex-col gap-2">
          {dataset.steps.map((step, index) => (
            <div
              key={`${step.label}-${index}`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 px-3 py-3 text-sm"
            >
              <span className="font-medium text-stone-900">{step.label}</span>
              <span className="font-mono text-xs text-stone-500">
                {step.start}s - {step.end}s
              </span>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <ActionStack>
        {!uploadComplete ? (
          <Button size="lg" variant="primary" onClick={upload} disabled={uploading || blurring}>
            {blurring ? 'Blurring faces' : uploading ? 'Uploading' : 'Upload recording'}
          </Button>
        ) : null}
        <Button size="lg" variant={uploadComplete ? 'primary' : 'tertiary'} onClick={onReset}>
          Start new capture
        </Button>
      </ActionStack>
    </div>
  );
}
