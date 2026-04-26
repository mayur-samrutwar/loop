import { auth } from '@/auth';
import { LoopFlow } from '@/components/loop/LoopFlow';
import { Page } from '@/components/PageLayout';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();
  const canPreviewLocally = process.env.NODE_ENV === 'development';
  if (!session?.user && !canPreviewLocally) {
    redirect('/');
  }

  return (
    <>
      <Page.Main className="flex flex-col gap-8 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-8">
        <LoopFlow />
      </Page.Main>
    </>
  );
}
