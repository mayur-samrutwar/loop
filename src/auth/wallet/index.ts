import { MiniKit } from '@worldcoin/minikit-js';
import { signIn } from 'next-auth/react';
import { getNewNonces } from './server-helpers';

function isWalletAuthSuccess(
  data: unknown,
): data is { message: string; signature: string; address: string } {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.message === 'string' &&
    typeof d.signature === 'string' &&
    typeof d.address === 'string' &&
    (d.status === undefined || d.status === 'success')
  );
}

/**
 * Authenticates a user via their wallet using a nonce-based challenge-response mechanism.
 *
 * @see https://docs.world.org/mini-apps/commands/wallet-auth
 */
export const walletAuth = async () => {
  const { nonce, signedNonce } = await getNewNonces();

  const result = await MiniKit.walletAuth({
    nonce,
    expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000),
    statement: `Authenticate (${crypto.randomUUID().replace(/-/g, '')}).`,
  });

  if (!result?.data) {
    throw new Error('No response from wallet auth');
  }

  if (!isWalletAuthSuccess(result.data)) {
    console.error('Wallet authentication failed', result.data);
    return;
  }

  await signIn('credentials', {
    redirectTo: '/home',
    nonce,
    signedNonce,
    finalPayloadJson: JSON.stringify({
      status: 'success',
      version: 1,
      message: result.data.message,
      signature: result.data.signature,
      address: result.data.address,
    }),
  });
};
