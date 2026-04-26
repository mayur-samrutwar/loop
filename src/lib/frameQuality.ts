export type FrameSignals = {
  meanLuma: number;
  skinRatioLower: number;
  sinkBlueRatio: number;
  motion: number;
};

function isSkinish(r: number, g: number, b: number): boolean {
  if (r < 60 || r > 255) return false;
  if (g < 40 || g > 220) return false;
  if (b < 20 || b > 210) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 12) return false;
  if (r <= g || r <= b) return false;
  if (r - g < 10) return false;
  return true;
}

function isBlueSinkish(r: number, g: number, b: number): boolean {
  return b > r + 18 && b > g + 12 && b > 70;
}

/**
 * Lightweight heuristics on a downsampled frame (not ML).
 * Tuned for hackathon demos: lighting, rough “hands in lower frame”, sink hint, motion vs prior.
 */
export function sampleFrameSignals(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  prior: Uint8ClampedArray | null,
): FrameSignals {
  const step = 6;
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;
  let lumaSum = 0;
  let count = 0;
  let skinLower = 0;
  let lowerCount = 0;
  let blueMid = 0;
  let midCount = 0;
  const lowerY = Math.floor(height * 0.52);
  const midY0 = Math.floor(height * 0.18);
  const midY1 = Math.floor(height * 0.52);

  let motionAcc = 0;
  let motionN = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      lumaSum += luma;
      count++;

      if (y >= lowerY) {
        lowerCount++;
        if (isSkinish(r, g, b)) skinLower++;
      }
      if (y >= midY0 && y < midY1) {
        midCount++;
        if (isBlueSinkish(r, g, b)) blueMid++;
      }

      if (prior) {
        const j = i;
        motionAcc +=
          Math.abs(d[j] - prior[j]) +
          Math.abs(d[j + 1] - prior[j + 1]) +
          Math.abs(d[j + 2] - prior[j + 2]);
        motionN++;
      }
    }
  }

  const meanLuma = count ? lumaSum / count : 0;
  const skinRatioLower = lowerCount ? skinLower / lowerCount : 0;
  const sinkBlueRatio = midCount ? blueMid / midCount : 0;
  const motion = motionN ? motionAcc / (motionN * 3 * 255) : 0;

  return { meanLuma, skinRatioLower, sinkBlueRatio, motion };
}

export type QualityGate = {
  lightingOk: boolean;
  handsLikelyOk: boolean;
  sinkLikelyOk: boolean;
  cameraStableOk: boolean;
  canSubmit: boolean;
};

export function evaluateGates(s: FrameSignals): QualityGate {
  const lightingOk = s.meanLuma > 38 && s.meanLuma < 245;
  const handsLikelyOk = s.skinRatioLower > 0.008;
  const sinkLikelyOk = s.sinkBlueRatio > 0.02;
  const cameraStableOk = s.motion < 0.12;
  const canSubmit =
    lightingOk && handsLikelyOk && sinkLikelyOk && cameraStableOk;
  return { lightingOk, handsLikelyOk, sinkLikelyOk, cameraStableOk, canSubmit };
}
