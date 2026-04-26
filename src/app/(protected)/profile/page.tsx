import { auth, signOut } from '@/auth';
import { SurfaceCard } from '@/components/loop/DesignPrimitives';
import { Page } from '@/components/PageLayout';
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
              <p className="text-2xl font-semibold tracking-tight text-stone-950">$0.00</p>
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
