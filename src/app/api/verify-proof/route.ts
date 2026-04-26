import { NextRequest, NextResponse } from 'next/server';

type VerifyRequest = {
  payload: Record<string, unknown>;
  action: string;
  signal?: string;
};

/**
 * Server-side World ID proof verification via Developer Portal HTTP API.
 * IDKit on the client produces the `payload` fields expected by this route.
 *
 * @see https://docs.world.org/api-reference/developer-portal/verify
 */
export async function POST(req: NextRequest) {
  try {
    const { payload, action, signal } = (await req.json()) as VerifyRequest;
    const app_id = process.env.NEXT_PUBLIC_APP_ID;
    if (!app_id) {
      return NextResponse.json(
        { verifyRes: { success: false }, error: 'Missing NEXT_PUBLIC_APP_ID' },
        { status: 500 },
      );
    }

    const url = `https://developer.worldcoin.org/api/v2/verify/${encodeURIComponent(app_id)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        signal: signal ?? '',
        ...payload,
      }),
    });

    const data = (await res.json()) as { success?: boolean };
    const success = Boolean(data.success);
    return NextResponse.json(
      { verifyRes: { success } },
      { status: success ? 200 : 400 },
    );
  } catch {
    return NextResponse.json({ verifyRes: { success: false } }, { status: 400 });
  }
}
