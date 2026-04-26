'use client';

import { requestMicrophonePermission } from '@/lib/requestMicrophone';
import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);
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
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const startCamera = useCallback(async () => {
    if (requestingPermission || started) return;

    setError(null);
    setRequestingPermission(true);
    try {
      // World App requires us to request microphone access through MiniKit
      // before `getUserMedia` will hand back an audio track.
      // https://docs.world.org/mini-apps/reference/microphone
      const mic = await requestMicrophonePermission();
      if (!mic.ok) {
        const message =
          mic.reason === 'disabled'
            ? 'Microphone is disabled for World App. Enable it in your phone Settings, then try again.'
            : mic.reason === 'rejected'
              ? 'Microphone access was declined. Tap "Allow camera" again to retry.'
              : mic.reason === 'unsupported'
                ? 'This World App version cannot grant microphone access. Update World App and try again.'
                : 'Could not request microphone access. Please try again.';
        setError(message);
        return;
      }

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
    if (!recording) return;

    tickRef.current = window.setInterval(() => {
      if (recordingStartRef.current) {
        setElapsed((performance.now() - recordingStartRef.current) / 1000);
      }
    }, 100);

    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [recording]);

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
      Math.max(1, Math.round(elapsed * 10) / 10),
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
        qualityHint: 0.8,
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
  }, [elapsed, getSupportedMimeType, onComplete, stopStream, task.id]);

  useEffect(() => {
    if (recording && elapsed >= MAX_RECORDING_SECONDS) {
      stopRecording();
    }
  }, [elapsed, recording, stopRecording]);

  const cancelPreview = useCallback(() => {
    setCountdown(null);
    setRecording(false);
    setStarted(false);
    stopStream();
    onBack();
  }, [onBack, stopStream]);

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

        {!recording ? (
          <button
            type="button"
            onClick={cancelPreview}
            aria-label="Cancel recording"
            className="absolute left-5 top-[calc(18px+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition active:scale-95"
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
        ) : null}

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
              className="flex h-14 min-w-[168px] items-center justify-center rounded-full border-0 px-8 text-base font-semibold shadow-[0_18px_45px_rgba(0,0,0,0.28)] transition active:scale-95 disabled:opacity-70"
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: '0',
                borderRadius: 9999,
                WebkitAppearance: 'none',
                appearance: 'none',
                lineHeight: 1,
              }}
            >
              I am ready
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
