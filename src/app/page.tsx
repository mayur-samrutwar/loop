import { auth } from '@/auth';
import { AuthButton } from '@/components/AuthButton';
import { BrandCredit } from '@/components/loop/BrandCredit';
import { Page } from '@/components/PageLayout';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect('/home');
  }

  return (
    <Page>
      <Page.Main className="flex flex-col px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-10">
        <div className="mx-auto grid min-h-full w-full max-w-[340px] flex-1 grid-rows-[1fr_auto]">
          <div className="flex flex-col items-center justify-center pb-24 text-center">
            <h1
              className="text-6xl font-bold leading-none text-stone-950"
              style={{ fontSize: 64, letterSpacing: '-0.04em' }}
            >
              Loop
            </h1>
            <div className="h-4" aria-hidden />
            <p className="whitespace-nowrap text-xs font-normal leading-none tracking-[-0.01em] text-stone-500">
              Real-world motion data for embodied AI
            </p>
          </div>

          <div className="space-y-5">
            <AuthButton />
            <BrandCredit />
          </div>
        </div>
      </Page.Main>
    </Page>
  );
}
