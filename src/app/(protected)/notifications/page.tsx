import { auth } from '@/auth';
import { SurfaceCard } from '@/components/loop/DesignPrimitives';
import { Page } from '@/components/PageLayout';
import { redirect } from 'next/navigation';

export default async function Notifications() {
  const session = await auth();
  const canPreviewLocally = process.env.NODE_ENV === 'development';

  if (!session?.user && !canPreviewLocally) {
    redirect('/');
  }

  return (
    <>
      <Page.Header className="pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
          Notifications
        </h1>
      </Page.Header>

      <Page.Main className="pb-[calc(6rem+env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <SurfaceCard className="p-5">
            <p className="text-sm font-semibold text-stone-950">
              Recording rules
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Keep every recording safe, relevant, and task focused. NSFW
              recording will ban your account permanently.
            </p>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <p className="text-sm font-semibold text-stone-950">
              Camera setup
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Before recording, allow camera and microphone access so Loop can
              validate the capture quality.
            </p>
          </SurfaceCard>
        </div>
      </Page.Main>
    </>
  );
}
