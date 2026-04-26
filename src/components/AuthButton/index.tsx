'use client';
import { completeSignIn, walletAuth, type WalletAuthCredentials } from '@/auth/wallet';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HumanCheckDialog } from './HumanCheckDialog';

type Phase = 'idle' | 'wallet' | 'human' | 'finalizing';

/**
 * Two-step World App login button:
 *   1. Wallet pop-up (`MiniKit.walletAuth`) — proves wallet ownership.
 *   2. World ID pop-up (`IDKitRequestWidget`) — proves the wallet is being
 *      driven by a unique human, every login.
 *
 * Only after both pop-ups resolve do we mint a NextAuth session.
 *
 * @see https://docs.world.org/mini-apps/commands/wallet-auth
 * @see https://docs.world.org/world-id/idkit/integrate
 */
export const AuthButton = () => {
  const { isInstalled } = useMiniKit();
  const [phase, setPhase] = useState<Phase>('idle');
  const [signal, setSignal] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // Ref so the credentials don't disappear from a closure when phase changes
  // and the parent re-renders mid-IDKit-flow.
  const credsRef = useRef<WalletAuthCredentials | null>(null);
  const autoTriggeredRef = useRef(false);

  const startWallet = useCallback(async () => {
    if (!isInstalled || phase !== 'idle') return;
    setError(null);
    setPhase('wallet');
    try {
      const next = await walletAuth();
      if (!next) {
        setPhase('idle');
        return;
      }
      credsRef.current = next;
      setSignal(next.address);
      setPhase('human');
    } catch (e) {
      console.error('Wallet authentication error', e);
      setPhase('idle');
    }
  }, [isInstalled, phase]);

  useEffect(() => {
    if (!isInstalled || autoTriggeredRef.current) return;
    autoTriggeredRef.current = true;
    void startWallet();
  }, [isInstalled, startWallet]);

  const onVerified = useCallback(async () => {
    const creds = credsRef.current;
    if (!creds) return;
    setPhase('finalizing');
    const result = await completeSignIn(creds);
    if (!result.ok) {
      console.error('Sign-in failed', result.error);
      setError('Could not start your session. Try again.');
      credsRef.current = null;
      setPhase('idle');
    }
    // On success `completeSignIn` navigates the page; no further state work
    // is needed because this component will unmount.
  }, []);

  const onCancel = useCallback(() => {
    credsRef.current = null;
    setSignal('');
    setPhase('idle');
  }, []);

  const isPending = phase !== 'idle';
  const label =
    phase === 'wallet'
      ? 'Confirm wallet'
      : phase === 'human'
        ? 'Confirm you are human'
        : phase === 'finalizing'
          ? 'Signing in'
          : isInstalled
            ? 'Login with Wallet'
            : 'Open in World App';

  return (
    <>
      <LiveFeedback
        label={{
          failed: 'Failed to login',
          pending: label,
          success: 'Logged in',
        }}
        state={isPending ? 'pending' : undefined}
      >
        <Button
          onClick={startWallet}
          disabled={isPending || !isInstalled}
          size="lg"
          variant="primary"
          className="w-full"
        >
          {label}
        </Button>
      </LiveFeedback>

      {error ? (
        <p className="text-center text-xs text-red-500">{error}</p>
      ) : null}

      <HumanCheckDialog
        open={phase === 'human' && Boolean(credsRef.current)}
        signal={signal}
        onVerified={onVerified}
        onCancel={onCancel}
      />
    </>
  );
};
