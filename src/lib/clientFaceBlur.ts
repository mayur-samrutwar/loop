import type { CapturedClip } from '@/components/loop/types';
import {
  FaceDetector,
  FilesetResolver,
  type Detection,
} from '@mediapipe/tasks-vision';

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Track = {
  box: Box;
  lastFrame: number;
};

const DETECTOR_FRAME_STEP = 8;
const MAX_TRACK_STALENESS = 18;
const SMOOTHING_ALPHA = 0.55;
const MAX_CENTER_DISTANCE = 96;
const TARGET_FPS = 24;
const BLUR_PX = 20;
const PADDING_RATIO = 0.18;
const MEDIAPIPE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const FACE_DETECTOR_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite';

let detectorPromise: Promise<FaceDetector> | null = null;

function getDetector() {
  detectorPromise ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

    return FaceDetector.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: FACE_DETECTOR_MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      minDetectionConfidence: 0.45,
    });
  })();

  return detectorPromise;
}

function boxFromDetection(detection: Detection): Box | null {
  const box = detection.boundingBox;
  if (!box) return null;

  return {
    x: box.originX,
    y: box.originY,
    width: box.width,
    height: box.height,
  };
}

function center(box: Box) {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

function distance(left: Box, right: Box) {
  const a = center(left);
  const b = center(right);
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function blend(previous: Box, next: Box) {
  const inverse = 1 - SMOOTHING_ALPHA;

  return {
    x: previous.x * inverse + next.x * SMOOTHING_ALPHA,
    y: previous.y * inverse + next.y * SMOOTHING_ALPHA,
    width: previous.width * inverse + next.width * SMOOTHING_ALPHA,
    height: previous.height * inverse + next.height * SMOOTHING_ALPHA,
  };
}

function expandBox(box: Box, width: number, height: number) {
  const padX = box.width * PADDING_RATIO;
  const padY = box.height * PADDING_RATIO;
  const x = Math.max(0, box.x - padX);
  const y = Math.max(0, box.y - padY);
  const x2 = Math.min(width, box.x + box.width + padX);
  const y2 = Math.min(height, box.y + box.height + padY);

  return {
    x,
    y,
    width: Math.max(1, x2 - x),
    height: Math.max(1, y2 - y),
  };
}

function updateTracks(
  tracks: Track[],
  detections: Box[],
  frameIndex: number,
) {
  const freshTracks = tracks.filter(
    (track) => frameIndex - track.lastFrame <= MAX_TRACK_STALENESS,
  );
  const usedDetections = new Set<number>();

  for (const track of freshTracks) {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    detections.forEach((detection, index) => {
      if (usedDetections.has(index)) return;
      const d = distance(track.box, detection);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = index;
      }
    });

    if (bestIndex !== -1 && bestDistance <= MAX_CENTER_DISTANCE) {
      track.box = blend(track.box, detections[bestIndex]);
      track.lastFrame = frameIndex;
      usedDetections.add(bestIndex);
    }
  }

  detections.forEach((detection, index) => {
    if (usedDetections.has(index)) return;
    freshTracks.push({ box: detection, lastFrame: frameIndex });
  });

  return freshTracks;
}

function drawBlurredFace(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  box: Box,
) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    box.x + box.width / 2,
    box.y + box.height / 2,
    box.width / 2,
    box.height / 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.clip();
  ctx.filter = `blur(${BLUR_PX}px)`;
  ctx.drawImage(
    video,
    box.x,
    box.y,
    box.width,
    box.height,
    box.x,
    box.y,
    box.width,
    box.height,
  );
  ctx.restore();
}

function chooseMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  return (
    candidates.find((type) => MediaRecorder.isTypeSupported(type)) ??
    'video/webm'
  );
}

export async function blurFacesInClip(
  clip: CapturedClip,
  onProgress?: (progress: number) => void,
): Promise<CapturedClip> {
  const sourceUrl = URL.createObjectURL(clip.blob);
  const video = document.createElement('video');
  video.src = sourceUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Could not load recorded video.'));
  });

  const width = video.videoWidth || 720;
  const height = video.videoHeight || 1280;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    URL.revokeObjectURL(sourceUrl);
    throw new Error('Could not initialize face blur canvas.');
  }

  const detector = await getDetector();
  const stream = canvas.captureStream(TARGET_FPS);
  const mimeType = chooseMimeType();
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  let tracks: Track[] = [];
  let frameIndex = 0;

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const completed = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Face blur recording failed.'));
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  recorder.start(1000);
  await video.play();

  const frameDelayMs = 1000 / TARGET_FPS;

  while (!video.ended) {
    ctx.filter = 'none';
    ctx.drawImage(video, 0, 0, width, height);

    if (frameIndex % DETECTOR_FRAME_STEP === 0) {
      const result = detector.detectForVideo(video, performance.now());
      tracks = updateTracks(
        tracks,
        result.detections
          .map(boxFromDetection)
          .filter((box): box is Box => box !== null),
        frameIndex,
      );
    } else {
      tracks = updateTracks(tracks, [], frameIndex);
    }

    for (const track of tracks) {
      drawBlurredFace(ctx, video, expandBox(track.box, width, height));
    }

    if (video.duration > 0) {
      onProgress?.(Math.min(99, Math.round((video.currentTime / video.duration) * 100)));
    }

    frameIndex += 1;
    await new Promise((resolve) => window.setTimeout(resolve, frameDelayMs));
  }

  recorder.stop();
  const redactedBlob = await completed;
  stream.getTracks().forEach((track) => track.stop());
  URL.revokeObjectURL(sourceUrl);
  onProgress?.(100);

  if (!redactedBlob.size) {
    throw new Error('Face blur produced an empty video.');
  }

  return {
    blob: redactedBlob,
    fileName: clip.fileName.replace(/\.[^.]+$/, '.webm'),
    mimeType,
    size: redactedBlob.size,
    durationSec: clip.durationSec,
  };
}
