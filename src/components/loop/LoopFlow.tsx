'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TASK_CATEGORIES,
  type CapturedClip,
  type DatasetOutput,
  type LoopStep,
  type TaskCategory,
  type TimelineSegment,
} from './types';
import { EntryStep } from './EntryStep';
import { InstructionsStep } from './InstructionsStep';
import { OutputStep } from './OutputStep';
import { ProcessingStep } from './ProcessingStep';
import { RecordingStep } from './RecordingStep';

const FLOW_STORAGE_KEY = 'loop.capture.flow';

function emitFlowChange() {
  window.dispatchEvent(new Event('loop-flow-change'));
}

function buildInitialSegments(
  duration: number,
  labels: TaskCategory['labels'],
): TimelineSegment[] {
  const d = Math.max(8, duration);
  const fifth = d / labels.length;
  return labels.map((label, i) => {
    const start = Math.round(fifth * i * 10) / 10;
    const end =
      i === labels.length - 1 ? d : Math.round(fifth * (i + 1) * 10) / 10;
    return { id: `seg-${i}`, start, end, label };
  });
}

export function LoopFlow() {
  const [step, setStep] = useState<LoopStep>('entry');
  const [humanVerified, setHumanVerified] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskCategory>(
    TASK_CATEGORIES[0],
  );
  const [durationSec, setDurationSec] = useState(40);
  const [baseQuality, setBaseQuality] = useState(0.82);
  const [dataset, setDataset] = useState<DatasetOutput | null>(null);
  const [clip, setClip] = useState<CapturedClip | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(FLOW_STORAGE_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as {
        taskId?: TaskCategory['id'];
      };
      const task = TASK_CATEGORIES.find((item) => item.id === saved.taskId);
      if (!task) return;

      setSelectedTask(task);
      setHumanVerified(true);
      setStep('instructions');
    } catch {
      window.localStorage.removeItem(FLOW_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!humanVerified || step === 'entry' || step === 'output') {
      window.localStorage.removeItem(FLOW_STORAGE_KEY);
      emitFlowChange();
      return;
    }

    window.localStorage.setItem(
      FLOW_STORAGE_KEY,
      JSON.stringify({
        taskId: selectedTask.id,
        step: step === 'recording' ? 'instructions' : step,
      }),
    );
    emitFlowChange();
  }, [humanVerified, selectedTask.id, step]);

  const initialSegments = useMemo(
    () => buildInitialSegments(durationSec, selectedTask.labels),
    [durationSec, selectedTask.labels],
  );

  const reset = useCallback(() => {
    setStep('entry');
    setHumanVerified(false);
    setSelectedTask(TASK_CATEGORIES[0]);
    setDurationSec(40);
    setBaseQuality(0.82);
    setDataset(null);
    setClip(null);
    window.localStorage.removeItem(FLOW_STORAGE_KEY);
    emitFlowChange();
  }, []);

  const onRecordingComplete = useCallback(
    (meta: {
      durationSec: number;
      qualityHint: number;
      clip: CapturedClip;
    }) => {
      setDurationSec(meta.durationSec);
      setBaseQuality(meta.qualityHint);
      setClip(meta.clip);
      setStep('processing');
    },
    [],
  );

  const onProcessingDone = useCallback(() => {
    const steps = initialSegments.map(({ start, end, label }) => ({
      start: Math.round(start * 10) / 10,
      end: Math.round(end * 10) / 10,
      label,
    }));
    setDataset({
      task: selectedTask.id,
      task_name: selectedTask.title,
      steps,
      quality_score: Math.min(0.98, Math.round((baseQuality + 0.05) * 100) / 100),
    });
    setStep('output');
  }, [baseQuality, initialSegments, selectedTask.id, selectedTask.title]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 pb-8">
      {!humanVerified && step === 'entry' ? (
        <EntryStep
          onContinue={(task) => {
            setSelectedTask(task);
            setHumanVerified(true);
            setStep('instructions');
          }}
        />
      ) : null}

      {humanVerified && step === 'instructions' ? (
        <InstructionsStep
          task={selectedTask}
          onBack={() => {
            setHumanVerified(false);
            setStep('entry');
          }}
          onContinue={() => setStep('recording')}
        />
      ) : null}

      {humanVerified && step === 'recording' ? (
        <RecordingStep
          task={selectedTask}
          onBack={() => setStep('instructions')}
          onComplete={onRecordingComplete}
        />
      ) : null}

      {humanVerified && step === 'processing' ? (
        <ProcessingStep onDone={onProcessingDone} />
      ) : null}

      {humanVerified && step === 'output' && dataset && clip ? (
        <OutputStep clip={clip} dataset={dataset} onReset={reset} />
      ) : null}
    </div>
  );
}
