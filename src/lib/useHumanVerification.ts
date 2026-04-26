'use client';

import { MiniKit } from '@worldcoin/minikit-js';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useCallback, useEffect, useState } from 'react';

export type HumanVerificationLevel =
  | 'orb'
  | 'secure_document'
  | 'document'
  | 'none';

export type HumanVerificationState = {
  /** Whether the World App bridge is installed (mini app is open inside World App). */
  isInstalled: boolean | undefined;
  /** True when the user has Orb-verified proof of personhood. */
  isOrbVerified: boolean;
  /** Highest verification level the user has reached. */
  level: HumanVerificationLevel;
  /** Convenience flag — Loop only treats Orb verification as "verified human". */
  isVerifiedHuman: boolean;
  /** Re-read MiniKit.user.verificationStatus on demand (after the user verifies). */
  refresh: () => void;
};

/**
 * Reads World ID verification flags published by World App into MiniKit.user.
 *
 * Loop gates capture on `isOrbVerified` because Orb verification is the
 * proof-of-personhood signal we trust for data quality and reward integrity.
 */
export function useHumanVerification(): HumanVerificationState {
  const { isInstalled } = useMiniKit();
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onFocus = () => setTick((n) => n + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  void tick;
  void isInstalled;

  const status = isInstalled ? MiniKit.user?.verificationStatus : undefined;
  const isOrbVerified = Boolean(status?.isOrbVerified);
  const isSecureDocumentVerified = Boolean(status?.isSecureDocumentVerified);
  const isDocumentVerified = Boolean(status?.isDocumentVerified);

  let level: HumanVerificationLevel = 'none';
  if (isOrbVerified) level = 'orb';
  else if (isSecureDocumentVerified) level = 'secure_document';
  else if (isDocumentVerified) level = 'document';

  return {
    isInstalled,
    isOrbVerified,
    level,
    isVerifiedHuman: isOrbVerified,
    refresh,
  };
}
