export type SignalSummary = {
  frameCount: number;
  meanLuma: number;
  lumaUnderRatio: number;
  lumaOverRatio: number;
  motionMean: number;
  motionStd: number;
  motionActiveRatio: number;
  handsVisibleRatio: number;
  taskHintRatio: number;
  durationSec: number;
};
