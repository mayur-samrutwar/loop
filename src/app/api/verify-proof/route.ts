import { NextRequest, NextResponse } from 'next/server';

type Body = {
  rp_id?: string;
  idkitResponse?: unknown;
};

/**
 * Verifies an IDKit proof-of-personhood payload through the Worldcoin
 * Developer Portal. Loop re-runs this on every login so we can be sure the
 * authenticated wallet is being driven by a real human.
 *
 * Forward the IDKit result payload AS-IS — the portal expects the exact shape
 * IDKit emits, no field remapping.
 *
 * @see https://docs.world.org/world-id/idkit/integrate#step-5-verify-the-proof-in-your-backend
 */
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rpId = body.rp_id ?? process.env.NEXT_PUBLIC_RP_ID;
  if (!rpId) {
    return NextResponse.json(
      { error: 'Missing rp_id (set NEXT_PUBLIC_RP_ID)' },
      { status: 500 },
    );
  }

  if (!body.idkitResponse) {
    return NextResponse.json(
      { error: 'Missing idkitResponse' },
      { status: 400 },
    );
  }

  const url = `https://developer.world.org/api/v4/verify/${encodeURIComponent(rpId)}`;
  const portalRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body.idkitResponse),
  });

  if (!portalRes.ok) {
    const detail = await portalRes.text().catch(() => '');
    return NextResponse.json(
      { success: false, detail: detail.slice(0, 500) },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
