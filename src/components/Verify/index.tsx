'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';

/**
 * World ID in-app proofs are handled with IDKit in MiniKit 2.x.
 * Loop gates capture on `MiniKit.user.verificationStatus.isOrbVerified` instead.
 *
 * @see https://docs.world.org/world-id/idkit/integrate
 */
export const Verify = () => {
  return (
    <div className="grid w-full gap-3 rounded-2xl border border-stone-200/90 bg-stone-50/80 p-4 text-left">
      <p className="text-sm font-semibold text-stone-900">World ID</p>
      <p className="text-xs leading-relaxed text-stone-600">
        MiniKit 2 removed <code className="text-[11px]">commandsAsync.verify</code>.
        Use IDKit for fresh proofs, or read Orb status from{' '}
        <code className="text-[11px]">MiniKit.user.verificationStatus</code> as in
        Loop&apos;s entry step.
      </p>
      <Button
        className="w-full"
        onClick={() =>
          window.open('https://docs.world.org/world-id/idkit/integrate', '_blank')
        }
        size="lg"
        variant="tertiary"
      >
        IDKit docs
      </Button>
    </div>
  );
};
