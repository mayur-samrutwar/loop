'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  sampleFrameSignals,
  type FrameSignals,
} from '@/lib/frameQuality';
import {
  ActionStack,
  BackIconButton,
  SectionHeader,
  StatusMessage,
  SurfaceCard,
} from './DesignPrimitives';
import type { CapturedClip, TaskCategory } from './types';

const MAX_RECORDING_SECONDS = 30 * 60;

type RecordingStepProps = {
  task: TaskCategory;
  onBack: () => void;
  onComplete: (meta: {
    durationSec: number;
    qualityHint: number;
    clip: CapturedClip;
  }) => void;
};

export function RecordingStep({ task, onBack, onComplete }: RecordingStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const priorRef = useRef<Uint8ClampedArray | null>(null);
  const rafRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [signals, setSignals] = useState<FrameSignals | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recordingStartRef = useRef<number | null>(null);

  const getSupportedMimeType = useCallback(() => {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];

    return (
      candidates.find((type) => MediaRecorder.isTypeSupported(type)) ??
      'video/webm'
    );
  }, []);

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    priorRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const startCamera = useCallback(async () => {
    if (requestingPermission || started) return;

    setError(null);
    setRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (!v) return;
      v.srcObject = stream;
      await v.play();
      setStarted(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not access the camera or microphone in this context.',
      );
    } finally {
      setRequestingPermission(false);
    }
  }, [requestingPermission, started]);

  useEffect(() => {
    if (!started) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const tick = () => {
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const w = Math.min(480, video.videoWidth);
      const h = Math.floor((w / video.videoWidth) * video.videoHeight) || 360;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.drawImage(video, 0, 0, w, h);
      const sig = sampleFrameSignals(ctx, w, h, priorRef.current);
      const img = ctx.getImageData(0, 0, w, h);
      priorRef.current = new Uint8ClampedArray(img.data);
      setSignals(sig);

      if (recordingStartRef.current) {
        const nextElapsed =
          (performance.now() - recordingStartRef.current) / 1000;
        setElapsed(nextElapsed);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [started]);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (!started) return;

    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    void video.play();
  }, [started]);

  const beginCountdown = useCallback(() => {
    if (!started || recording || countdown !== null) return;

    setCountdown(5);
    setElapsed(0);
    recordingStartRef.current = null;
  }, [countdown, recording, started]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      const stream = streamRef.current;
      if (!stream) {
        setError('Camera stream is not available. Please go back and try again.');
        setCountdown(null);
        return;
      }

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(1000);

      setCountdown(null);
      setRecording(true);
      recordingStartRef.current = performance.now();
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((current) => (current === null ? null : current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown, getSupportedMimeType]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    const mimeType = recorder?.mimeType || getSupportedMimeType();
    setRecording(false);
    const durationSec = Math.min(
      MAX_RECORDING_SECONDS,
      Math.max(3, Math.round(elapsed * 10) / 10),
    );
    const qualityHint =
      signals == null
        ? 0.75
        : Math.min(
            0.97,
            0.72 +
              Math.min(signals.skinRatioLower * 8, 0.12) +
              Math.min(signals.sinkBlueRatio * 6, 0.1) -
              Math.max(0, signals.motion - 0.04) * 2,
          );

    if (!recorder || recorder.state === 'inactive') {
      stopStream();
      setError('Recording was not available. Please try again.');
      return;
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      recorderRef.current = null;
      stopStream();

      if (!blob.size) {
        setError('No video data was captured. Please try again.');
        return;
      }

      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const safeTask = task.id.replace(/[^a-z0-9-_]/g, '-');
      onComplete({
        durationSec,
        qualityHint,
        clip: {
          blob,
          fileName: `${safeTask}-${Date.now()}.${extension}`,
          mimeType,
          size: blob.size,
          durationSec,
        },
      });
    };

    recorder.stop();
  }, [
    elapsed,
    getSupportedMimeType,
    onComplete,
    signals,
    stopStream,
    task.id,
  ]);

  useEffect(() => {
    if (recording && elapsed >= MAX_RECORDING_SECONDS) {
      stopRecording();
    }
  }, [elapsed, recording, stopRecording]);

  if (started) {
    return (
      <div className="fixed inset-0 z-50 bg-stone-950">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" aria-hidden />

        {recording ? (
          <div className="absolute inset-x-0 top-[calc(18px+env(safe-area-inset-top))] flex justify-center px-6">
            <div className="rounded-full bg-black/45 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              {elapsed.toFixed(1)}s
            </div>
          </div>
        ) : null}

        {countdown !== null ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-black/45 text-5xl font-semibold text-white backdrop-blur">
              {countdown}
            </div>
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-[calc(28px+env(safe-area-inset-bottom))] flex justify-center px-6">
          {recording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="h-16 w-16 rounded-full bg-red-500 text-white shadow-[0_18px_45px_rgba(0,0,0,0.28)] ring-4 ring-white/20 transition active:scale-95"
              aria-label="Stop recording"
            >
              <span className="mx-auto block h-5 w-5 rounded bg-white" />
            </button>
          ) : (
            <button
              type="button"
              disabled={countdown !== null}
              onClick={beginCountdown}
              className="rounded-full bg-stone-950 px-7 py-4 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(0,0,0,0.28)] ring-1 ring-white/15 transition active:scale-95 disabled:opacity-70"
            >
              Start record
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <BackIconButton onClick={onBack} />

      <SectionHeader
        title={task.title}
      />

      <SurfaceCard className="overflow-hidden bg-stone-950 shadow-stone-900/10">
        <video
          ref={videoRef}
          className="aspect-video w-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          muted
          playsInline
        />
      </SurfaceCard>
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      {!started ? (
        <ActionStack>
          <Button className="w-full" onClick={startCamera} size="lg" variant="primary">
            {requestingPermission ? 'Requesting access' : 'Allow camera'}
          </Button>
        </ActionStack>
      ) : null}

      {error ? (
        <StatusMessage tone="error">{error}</StatusMessage>
      ) : null}

    </div>
  );
}
