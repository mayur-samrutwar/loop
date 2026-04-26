export type LoopStep =
  | 'entry'
  | 'instructions'
  | 'recording'
  | 'processing'
  | 'output';

export type TaskId =
  | 'dishwashing'
  | 'laundry'
  | 'meal_prep'
  | 'surface_cleaning';

export type StepLabel = string;

export type TimelineSegment = {
  id: string;
  start: number;
  end: number;
  label: StepLabel;
};

export type DatasetOutput = {
  task: TaskId;
  task_name: string;
  steps: { start: number; end: number; label: StepLabel }[];
  quality_score: number;
};

export type CapturedClip = {
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  durationSec: number;
};

export type TaskCategory = {
  id: TaskId;
  title: string;
  subtitle: string;
  demoVideo: string;
  labels: StepLabel[];
  checks: string[];
};

export const TASK_CATEGORIES: TaskCategory[] = [
  {
    id: 'dishwashing',
    title: 'Dishwashing',
    subtitle: 'Sink, hands, utensils',
    demoVideo: '/dishes.mp4',
    labels: ['pick', 'soap', 'scrub', 'rinse', 'place'],
    checks: ['Hands visible', 'Sink in frame', 'Good lighting', 'Stable phone'],
  },
  {
    id: 'laundry',
    title: 'Laundry',
    subtitle: 'Fold, stack, sort',
    demoVideo: '/folding.mp4',
    labels: ['pick', 'fold', 'smooth', 'stack', 'sort'],
    checks: ['Full table view', 'Clothes visible', 'Hands visible', 'Stable phone'],
  },
  {
    id: 'meal_prep',
    title: 'Meal prep',
    subtitle: 'Cut, mix, arrange',
    demoVideo: '/food.mp4',
    labels: ['pick', 'cut', 'mix', 'move', 'place'],
    checks: ['Tool visible', 'Board visible', 'Hands visible', 'Good lighting'],
  },
  {
    id: 'surface_cleaning',
    title: 'Surface cleaning',
    subtitle: 'Wipe, spray, clear',
    demoVideo: '/toilet.mp4',
    labels: ['spray', 'wipe', 'move', 'inspect', 'finish'],
    checks: ['Surface visible', 'Tool visible', 'Hands visible', 'Stable phone'],
  },
];
