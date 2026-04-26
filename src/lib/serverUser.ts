import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { PREVIEW_COOKIE_KEY, PREVIEW_HEADER_KEY } from './userIdConstants';

export async function resolveUserId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.walletAddress) {
    return session.user.walletAddress;
  }

  if (process.env.NODE_ENV !== 'development') return null;

  const jar = await cookies();
  const previewId = jar.get(PREVIEW_COOKIE_KEY)?.value;
  return previewId ?? null;
}

export async function resolveUserIdFromRequest(
  request: Request,
): Promise<string | null> {
  const session = await auth();
  if (session?.user?.walletAddress) {
    return session.user.walletAddress;
  }

  if (process.env.NODE_ENV !== 'development') return null;

  const headerId = request.headers.get(PREVIEW_HEADER_KEY);
  if (headerId) return headerId;

  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${PREVIEW_COOKIE_KEY}=([^;]+)`),
  );
  return match?.[1] ?? null;
}
