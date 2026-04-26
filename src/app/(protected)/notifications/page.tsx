import { auth } from '@/auth';
import { SurfaceCard } from '@/components/loop/DesignPrimitives';
import { ScoreHistoryItem } from '@/components/loop/ScoreHistoryItem';
import { Page } from '@/components/PageLayout';
import { listScores, reputation } from '@/lib/scoreStore';
import { resolveUserId } from '@/lib/serverUser';
import { redirect } from 'next/navigation';

export default async function Notifications() {
  const session = await auth();
  const canPreviewLocally = process.env.NODE_ENV === 'development';

  if (!session?.user && !canPreviewLocally) {
    redirect('/');
  }

  const userId = await resolveUserId();
  const entries = userId ? listScores(userId) : [];
  const stats = userId
    ? reputation(userId)
    : { averageScore: 0, uploads: 0, reputation: 'rookie' as const };

  return (
    <>
      <Page.Header className="pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
          Notifications
        </h1>
      </Page.Header>

      <Page.Main className="pb-[calc(6rem+env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          {entries.length > 0 ? (
            <SurfaceCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-stone-500">
                    Reputation
                  </p>
                  <p className="mt-1 text-sm font-semibold capitalize text-stone-950">
                    {stats.reputation}
                  </p>
                </div>
                <p className="text-sm font-semibold text-stone-900">
                  {stats.averageScore}/100 · {stats.uploads} uploads
                </p>
              </div>
            </SurfaceCard>
          ) : null}

          {entries.map((entry) => (
            <ScoreHistoryItem key={entry.id} entry={entry} />
          ))}

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
              How scoring works
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Every recording is scored on hand visibility, useful motion,
              lighting, stability, and duration. Higher scores earn larger
              rewards and build your reputation over time.
            </p>
          </SurfaceCard>
        </div>
      </Page.Main>
    </>
  );
}
