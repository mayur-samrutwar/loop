'use client';

import { HUMAN_CHECK_ACTION } from '@/lib/humanCheck';
import {
  IDKitRequestWidget,
  type IDKitResult,
  type RpContext,
  orbLegacy,
} from '@worldcoin/idkit';
import { useEffect, useState } from 'react';

type HumanCheckDialogProps = {
  /** Whether the verification flow should be active right now. */
  open: boolean;
  /** World App wallet address used as the proof's signal binding. */
  signal: string;
  /** Called after the proof is server-verified. */
  onVerified: () => void | Promise<void>;
  /** Called when the user dismisses or the verification fails. */
  onCancel: () => void;
};

/**
 * Wraps `IDKitRequestWidget` with the boilerplate needed to fetch a fresh
 * Relying-Party signature. Inside World App the widget hands off to the
 * native "Connect your World ID" pop-up; we just orchestrate state.
 */
export function HumanCheckDialog({
  open,
  signal,
  onVerified,
  onCancel,
}: HumanCheckDialogProps) {
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setRpContext(null);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/rp-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: HUMAN_CHECK_ACTION }),
        });
        if (!res.ok) throw new Error('rp-signature failed');
        const sig = (await res.json()) as {
          sig: string;
          nonce: string;
          created_at: number;
          expires_at: number;
        };
        if (cancelled) return;
        setRpContext({
          rp_id: process.env.NEXT_PUBLIC_RP_ID ?? '',
          nonce: sig.nonce,
          created_at: sig.created_at,
          expires_at: sig.expires_at,
          signature: sig.sig,
        });
      } catch (e) {
        if (cancelled) return;
        console.error('Could not prepare World ID request', e);
        setError('Could not start World ID');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open || !rpContext) {
    return error ? (
      <p className="mt-3 text-center text-xs text-red-500">{error}</p>
    ) : null;
  }

  return (
    <IDKitRequestWidget
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      app_id={(process.env.NEXT_PUBLIC_APP_ID ?? '') as `app_${string}`}
      action={HUMAN_CHECK_ACTION}
      rp_context={rpContext}
      allow_legacy_proofs
      preset={orbLegacy({ signal })}
      autoClose={false}
      handleVerify={async (result: IDKitResult) => {
        const res = await fetch('/api/verify-proof', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rp_id: rpContext.rp_id,
            idkitResponse: result,
          }),
        });
        if (!res.ok) {
          throw new Error('Backend verification failed');
        }
        // Sign in immediately while the widget is still active so that we
        // don't race against the widget's cleanup. The parent will navigate
        // to /home as part of `onVerified`.
        await onVerified();
      }}
      onSuccess={() => {
        // Intentionally a no-op: navigation already happened inside
        // `handleVerify` above.
      }}
      onError={(code) => {
        console.error('IDKit error', code);
        onCancel();
      }}
    />
  );
}
