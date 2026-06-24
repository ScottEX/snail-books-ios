/**
 * Biometric helpers — wraps expo-local-authentication + react-native-keychain.
 *
 * The iOS app uses cookie-based session auth (the server sets a session
 * cookie via Set-Cookie on POST /login and the app's fetch calls use
 * `credentials: 'include'`). That means we can't auto-login from a
 * stored bearer token without backend changes — so the Face ID flow is:
 *
 *   1. After a successful password login, prompt the user to enable
 *      Face ID. If they accept, we prompt biometric once and write
 *      (username, password) into iOS Keychain protected by
 *      BIOMETRY_CURRENT_SET — i.e. the credential can only be
 *      retrieved after a successful Face ID / Touch ID prompt.
 *
 *   2. On next launch / when the user taps the Face ID button, we
 *      prompt biometric, read the credential back from Keychain, and
 *      POST it to /login — the server sets a fresh session cookie and
 *      we transition to Home as if the user had typed their password.
 *
 * Tradeoff vs proper WebAuthn (asymmetric challenge-response):
 *   - We store the actual password (in Keychain with biometric gating).
 *   - Any backend compromise of the password list would still expose
 *     these passwords — but the Keychain itself never leaves the
 *     device's secure enclave, and biometric gating prevents the most
 *     common threat (a stolen, unlocked phone).
 *   - When Expo 52 gains a stable RN WebAuthn lib we should migrate.
 *
 * Never write to Keychain without first confirming the user really
 * wants biometric unlock; the App.tsx logout handler clears the
 * credential so it can't outlive a logout.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as Keychain from 'react-native-keychain';

const KEYCHAIN_SERVICE = 'snailbooks.biometric';
const KEYCHAIN_USERNAME = 'snailbooks-biometric-user';

export type BiometricCredential = {
  username: string;
  password: string;
};

export async function isBiometricAvailable(): Promise<{
  available: boolean;
  reason?: string;
}> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return { available: false, reason: 'no-hardware' };
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { available: false, reason: 'not-enrolled' };
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (!supportedTypes || supportedTypes.length === 0) {
      return { available: false, reason: 'no-types' };
    }
    return { available: true };
  } catch {
    return { available: false, reason: 'error' };
  }
}

export async function promptBiometric(
  promptMessage: string,
  cancelLabel = 'Cancel',
  fallbackLabel = 'Use Password',
): Promise<{ success: boolean; error?: string }> {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      fallbackLabel,
      disableDeviceFallback: false,
    });
    if (r.success) return { success: true };
    return { success: false, error: r.error || 'cancelled' };
  } catch (e: any) {
    return { success: false, error: e?.message || 'unknown' };
  }
}

export async function saveCredential(
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    // BIOMETRY_CURRENT_SET: the credential is invalidated if the user
    // adds a new fingerprint / face. WHEN_UNLOCKED_THIS_DEVICE_ONLY:
    // the credential isn't included in iCloud / device-to-device
    // backups and isn't readable while the device is locked.
    await Keychain.setGenericPassword(username, password, {
      service: KEYCHAIN_SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    try { localStorage.setItem(KEYCHAIN_USERNAME, username); } catch {}
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'unknown' };
  }
}

export async function getCredential(): Promise<BiometricCredential | null> {
  try {
    const r = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    if (!r) return null;
    return { username: r.username, password: r.password };
  } catch {
    return null;
  }
}

export async function hasStoredCredential(): Promise<boolean> {
  try {
    const r = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    return !!r;
  } catch {
    return false;
  }
}

export async function clearCredential(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    try { localStorage.removeItem(KEYCHAIN_USERNAME); } catch {}
  } catch {}
}