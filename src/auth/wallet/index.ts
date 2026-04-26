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
 * Credentials gathered from the World App wallet-auth pop-up. Stash these on
 * the client until the user has also passed the World ID human-check, then
 * forward them to NextAuth via {@link completeSignIn}.
 */
export type WalletAuthCredentials = {
  nonce: string;
  signedNonce: string;
  finalPayloadJson: string;
  address: string;
};

/**
 * Asks World App for an SIWE wallet-auth signature only. We deliberately
 * stop short of calling NextAuth `signIn` so we can chain the World ID
 * proof-of-personhood pop-up before granting a session.
 *
 * @see https://docs.world.org/mini-apps/commands/wallet-auth
 */
export const walletAuth = async (): Promise<WalletAuthCredentials | null> => {
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
    return null;
  }

  return {
    nonce,
    signedNonce,
    address: result.data.address,
    finalPayloadJson: JSON.stringify({
      status: 'success',
      version: 1,
      message: result.data.message,
      signature: result.data.signature,
      address: result.data.address,
    }),
  };
};

/**
 * Hands the wallet-auth payload off to NextAuth and navigates to /home.
 *
 * NOTE: We use `redirect: false` + an explicit `window.location.assign`
 * because NextAuth v5's built-in `redirectTo` for credentials sign-in
 * silently fails to navigate in some embedded webviews (notably World App).
 *
 * @see https://github.com/nextauthjs/next-auth/discussions/11168
 */
export const completeSignIn = async (
  creds: WalletAuthCredentials,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const result = await signIn('credentials', {
    redirect: false,
    nonce: creds.nonce,
    signedNonce: creds.signedNonce,
    finalPayloadJson: creds.finalPayloadJson,
  });

  if (!result || result.error) {
    return { ok: false, error: result?.error ?? 'sign-in failed' };
  }

  window.location.assign('/home');
  return { ok: true };
};
