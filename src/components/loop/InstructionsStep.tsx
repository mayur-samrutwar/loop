'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import {
  ActionStack,
  BackIconButton,
  SectionHeader,
  StatusMessage,
  SurfaceCard,
} from './DesignPrimitives';
import type { TaskCategory } from './types';

type InstructionsStepProps = {
  task: TaskCategory;
  onBack: () => void;
  onContinue: () => void;
};

export function InstructionsStep({
  task,
  onBack,
  onContinue,
}: InstructionsStepProps) {
  return (
    <div className="relative flex w-full max-w-md flex-col">
      <div className="flex flex-col gap-6 pb-28">
        <BackIconButton onClick={onBack} />

        <div className="flex items-start justify-between gap-4">
          <SectionHeader title={task.title} />
          <span className="shrink-0 rounded-full bg-stone-950 px-3 py-1.5 text-xs font-semibold text-white">
            $0.25
          </span>
        </div>

        <SurfaceCard className="aspect-square overflow-hidden bg-stone-950 shadow-[0_24px_70px_rgba(28,25,23,0.08)]">
          <video
            className="demo-video pointer-events-none h-full w-full object-cover"
            src={task.demoVideo}
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            preload="metadata"
          />
        </SurfaceCard>

        <SurfaceCard className="p-4 shadow-[0_18px_45px_rgba(28,25,23,0.05)]">
          <p className="text-sm font-semibold text-stone-950">
            Before recording
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {[...task.checks, 'Maximum recording time is 30 minutes'].map((check) => (
              <li
                key={check}
                className="flex items-center gap-3 rounded-2xl bg-stone-50 px-3 py-3 text-sm font-medium text-stone-800 ring-1 ring-stone-200/70"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-stone-950" />
                {check}
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <StatusMessage tone="warning">
          Record only the selected task. NSFW recording will ban your account
          permanently.
        </StatusMessage>
      </div>

      <ActionStack className="fixed inset-x-0 bottom-[calc(18px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md px-6">
        <Button className="w-full !rounded-full !bg-stone-950" onClick={onContinue} size="lg" variant="primary">
          I&apos;m ready
        </Button>
      </ActionStack>
    </div>
  );
}
