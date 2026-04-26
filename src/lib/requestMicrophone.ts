import { MiniKit } from '@worldcoin/minikit-js';
import { Permission } from '@worldcoin/minikit-js/commands';

export type MicrophonePermissionResult =
  | { ok: true }
  | { ok: false; reason: 'rejected' | 'disabled' | 'unsupported' | 'unknown' };

/**
 * Asks World App for microphone permission for THIS mini app.
 *
 * In a World App webview, `getUserMedia({ audio: true })` is rejected with a
 * "permission denied" DOMException unless this command has been called and
 * the user has granted access. Outside World App (e.g. dev in a browser) we
 * skip the bridge and let the browser's native permission prompt handle it.
 *
 * @see https://docs.world.org/mini-apps/reference/microphone
 * @see https://docs.world.org/mini-apps/commands/request-permission
 */
export async function requestMicrophonePermission(): Promise<MicrophonePermissionResult> {
  if (!MiniKit.isInstalled()) {
    return { ok: true };
  }

  try {
    const result = await MiniKit.requestPermission({
      permission: Permission.Microphone,
    });

    const data = result?.data as
      | { status?: string; error_code?: string }
      | undefined;

    if (data?.status === 'success') return { ok: true };

    switch (data?.error_code) {
      case 'already_granted':
        return { ok: true };
      case 'user_rejected':
      case 'already_requested':
        return { ok: false, reason: 'rejected' };
      case 'permission_disabled':
        return { ok: false, reason: 'disabled' };
      case 'unsupported_permission':
        return { ok: false, reason: 'unsupported' };
      default:
        return { ok: false, reason: 'unknown' };
    }
  } catch (error) {
    console.error('Microphone permission request failed', error);
    return { ok: false, reason: 'unknown' };
  }
}
