'use client';

import { useSession } from 'next-auth/react';

/**
 * Compact pill that indicates the user passed Loop's mandatory World ID
 * proof-of-personhood gate.
 *
 * Source of truth: the NextAuth session. We only mint a session after the
 * `orbLegacy` IDKit preset succeeds in `AuthButton`, so any authenticated
 * viewer has, by definition, just proven Orb verification on this login.
 *
 * (We deliberately do not read `MiniKit.user.verificationStatus.isOrbVerified`
 * because that flag isn't reliably populated in every World App context.)
 */
export function VerificationBadge() {
  const { status } = useSession();

  if (status !== 'authenticated') return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
      <Dot className="bg-emerald-400" />
      Orb verified
    </span>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${className}`} />;
}
