import { auth, signOut } from '@/auth';
import { SurfaceCard } from '@/components/loop/DesignPrimitives';
import { VerificationBadge } from '@/components/loop/VerificationBadge';
import { Page } from '@/components/PageLayout';
import { formatLoop } from '@/lib/formatLoop';
import { reputation, totalEarnings } from '@/lib/scoreStore';
import { resolveUserId } from '@/lib/serverUser';
import { Marble } from '@worldcoin/mini-apps-ui-kit-react';
import { redirect } from 'next/navigation';

export default async function Profile() {
  const session = await auth();
  const canPreviewLocally = process.env.NODE_ENV === 'development';

  if (!session?.user && !canPreviewLocally) {
    redirect('/');
  }

  const user = {
    username: session?.user.username ?? 'demo human',
    profilePictureUrl: session?.user.profilePictureUrl,
  };

  const userId = await resolveUserId();
  const earnings = userId ? totalEarnings(userId) : 0;
  const stats = userId
    ? reputation(userId)
    : { averageScore: 0, uploads: 0, reputation: 'rookie' as const };

  async function logout() {
    'use server';

    await signOut({ redirectTo: '/' });
  }

  return (
    <>
      <Page.Header className="pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
          Profile
        </h1>
      </Page.Header>

      <Page.Main className="pb-[calc(6rem+env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-md flex-col gap-5">
          <SurfaceCard className="p-5">
            <div className="flex items-center gap-4">
              <Marble className="h-16 w-16 shrink-0" src={user.profilePictureUrl} />
              <div className="min-w-0">
                <p className="truncate text-xl font-semibold capitalize tracking-tight text-stone-950">
                  {user.username}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xs capitalize text-stone-500">
                    {stats.reputation} contributor
                  </p>
                  <VerificationBadge />
                </div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-stone-950">Your earnings</p>
                <p className="mt-1 text-xs text-stone-500">
                  Rewards from approved recordings.
                </p>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-stone-950">
                {formatLoop(earnings)}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 text-xs">
              <div>
                <p className="text-stone-500">Avg quality</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">
                  {stats.averageScore}/100
                </p>
              </div>
              <div>
                <p className="text-stone-500">Uploads</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">
                  {stats.uploads}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-full bg-stone-950 px-5 py-4 text-sm font-semibold text-white shadow-sm shadow-stone-950/15 transition active:scale-[0.99]"
            >
              Logout
            </button>
          </form>
        </div>
      </Page.Main>
    </>
  );
}
