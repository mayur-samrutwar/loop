import { NextRequest, NextResponse } from 'next/server';
import { signRequest } from '@worldcoin/idkit/signing';

type Body = { action?: string };

/**
 * Issues a fresh Relying-Party signature so the client can ask World App for a
 * proof of personhood. The signing key NEVER leaves the server.
 *
 * @see https://docs.world.org/world-id/idkit/integrate
 */
export async function POST(req: NextRequest) {
  const signingKeyHex = process.env.RP_SIGNING_KEY;
  if (!signingKeyHex) {
    return NextResponse.json(
      { error: 'Missing RP_SIGNING_KEY' },
      { status: 500 },
    );
  }

  let action: string | undefined;
  try {
    const body = (await req.json()) as Body;
    action = body.action;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!action) {
    return NextResponse.json({ error: 'Missing action' }, { status: 400 });
  }

  const { sig, nonce, createdAt, expiresAt } = signRequest({
    signingKeyHex,
    action,
  });

  return NextResponse.json({
    sig,
    nonce,
    created_at: createdAt,
    expires_at: expiresAt,
  });
}
