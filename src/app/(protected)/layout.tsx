import { auth } from '@/auth';
import { BottomMenu } from '@/components/BottomMenu';
import { Page } from '@/components/PageLayout';
import { redirect } from 'next/navigation';

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const canPreviewLocally = process.env.NODE_ENV === 'development';

  if (!session?.user && !canPreviewLocally) {
    redirect('/');
  }

  return (
    <Page>
      {children}
      <BottomMenu />
    </Page>
  );
}
