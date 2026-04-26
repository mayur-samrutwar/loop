import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { CapturedClip } from '@/components/loop/types';
import type { SignalSummary } from './signalAggregator';

const MEDIAPIPE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

const MAX_SAMPLES = 60;
const MIN_INTERVAL_SEC = 1;
const MIN_HAND_LANDMARKS = 12;
const MIN_HAND_VISIBLE_AREA = 0.012;

let detectorPromise: Promise<HandLandmarker> | null = null;
let lastTimestampMs = 0;

function getDetector() {
  detectorPromise ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
    return HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: HAND_MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.45,
    });
  })();

  return detectorPromise;
}

function nextMonotonicTimestamp(): number {
  const now = Math.floor(performance.now());
  const next = Math.max(lastTimestampMs + 1, now);
  lastTimestampMs = next;
  return next;
}

function emptySummary(durationSec: number): SignalSummary {
  return {
    frameCount: 0,
    meanLuma: 0,
    lumaUnderRatio: 0,
    lumaOverRatio: 0,
    motionMean: 0,
    motionStd: 0,
    motionActiveRatio: 0,
    handsVisibleRatio: 0,
    taskHintRatio: 0,
    durationSec,
  };
}

function seekTo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = time;
  });
}

type LandmarkPoint = { x: number; y: number };

function landmarkBoundingArea(landmarks: LandmarkPoint[]): number {
  if (!landmarks.length) return 0;
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  return Math.max(0, (maxX - minX) * (maxY - minY));
}

export async function scanClipQuality(
  clip: CapturedClip,
  onProgress?: (progress: number) => void,
): Promise<SignalSummary> {
  const url = URL.createObjectURL(clip.blob);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () =>
      reject(new Error('Could not load recorded video for scoring.'));
  });

  const duration = clip.durationSec || (Number.isFinite(video.duration) ? video.duration : 0);
  if (!duration || duration < 0.5) {
    URL.revokeObjectURL(url);
    return emptySummary(duration);
  }

  const sourceWidth = video.videoWidth || 720;
  const sourceHeight = video.videoHeight || 1280;
  const w = Math.min(640, sourceWidth);
  const h = Math.max(1, Math.floor((sourceHeight / sourceWidth) * w));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error('Quality scan canvas unavailable.');
  }

  const detector = await getDetector();
  const interval = Math.max(MIN_INTERVAL_SEC, duration / MAX_SAMPLES);
  const totalSamples = Math.max(1, Math.floor(duration / interval));

  const lumaSamples: number[] = [];
  const motionSamples: number[] = [];
  let handsFrames = 0;
  let underExposed = 0;
  let overExposed = 0;
  let activeMotion = 0;
  let prior: Uint8ClampedArray | null = null;

  for (let i = 0; i < totalSamples; i += 1) {
    const t = Math.min(duration - 0.05, i * interval);
    await seekTo(video, t);

    ctx.drawImage(video, 0, 0, w, h);

    let handLandmarks: LandmarkPoint[][] = [];
    try {
      const detection = detector.detectForVideo(video, nextMonotonicTimestamp());
      handLandmarks = detection.landmarks ?? [];
    } catch {
      handLandmarks = [];
    }

    const handVisible = handLandmarks.some((lm) => {
      if (!lm || lm.length < MIN_HAND_LANDMARKS) return false;
      return landmarkBoundingArea(lm) >= MIN_HAND_VISIBLE_AREA;
    });
    if (handVisible) handsFrames += 1;

    const data = ctx.getImageData(0, 0, w, h).data;
    const step = 8;
    let lumaSum = 0;
    let count = 0;
    let motionAcc = 0;
    let motionN = 0;

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        lumaSum += luma;
        count += 1;
        if (prior) {
          motionAcc +=
            Math.abs(data[idx] - prior[idx]) +
            Math.abs(data[idx + 1] - prior[idx + 1]) +
            Math.abs(data[idx + 2] - prior[idx + 2]);
          motionN += 1;
        }
      }
    }

    const meanLuma = count ? lumaSum / count : 0;
    const motion = motionN ? motionAcc / (motionN * 3 * 255) : 0;

    lumaSamples.push(meanLuma);
    if (meanLuma < 60) underExposed += 1;
    if (meanLuma > 220) overExposed += 1;

    if (i > 0) {
      motionSamples.push(motion);
      if (motion > 0.01) activeMotion += 1;
    }

    prior = new Uint8ClampedArray(data);
    onProgress?.(Math.min(99, Math.round(((i + 1) / totalSamples) * 100)));
  }

  URL.revokeObjectURL(url);
  onProgress?.(100);

  const sampleCount = lumaSamples.length || 1;
  const meanLuma = lumaSamples.reduce((a, x) => a + x, 0) / sampleCount;
  const motionMean = motionSamples.length
    ? motionSamples.reduce((a, x) => a + x, 0) / motionSamples.length
    : 0;
  const motionVariance = motionSamples.length
    ? motionSamples.reduce((a, x) => a + (x - motionMean) ** 2, 0) /
      motionSamples.length
    : 0;

  return {
    frameCount: sampleCount,
    meanLuma,
    lumaUnderRatio: underExposed / sampleCount,
    lumaOverRatio: overExposed / sampleCount,
    motionMean,
    motionStd: Math.sqrt(motionVariance),
    motionActiveRatio: motionSamples.length ? activeMotion / motionSamples.length : 0,
    handsVisibleRatio: handsFrames / sampleCount,
    taskHintRatio: 0,
    durationSec: duration,
  };
}
