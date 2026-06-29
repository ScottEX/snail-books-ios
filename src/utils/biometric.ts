/**
 * Biometric helpers — wraps expo-local-authentication + react-native-keychain.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as Keychain from 'react-native-keychain';

const KEYCHAIN_SERVICE = 'snailbooks.biometric.v2';
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
    console.log('[saveCredential] saving, service:', KEYCHAIN_SERVICE, 'user:', username);
    await Keychain.setGenericPassword(username, password, {
      service: KEYCHAIN_SERVICE,
    });
    console.log('[saveCredential] OK');
    try { localStorage.setItem(KEYCHAIN_USERNAME, username); } catch {}
    return { ok: true };
  } catch (e: any) {
    console.log('[saveCredential] FAIL:', e?.message);
    return { ok: false, error: e?.message || 'unknown' };
  }
}

export async function getCredential(): Promise<BiometricCredential | null> {
  try {
    console.log('[getCredential] reading, service:', KEYCHAIN_SERVICE);
    const r = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    console.log('[getCredential] result:', r ? 'found' : 'NULL');
    if (!r) return null;
    return { username: r.username, password: r.password };
  } catch (e: any) {
    console.log('[getCredential] FAIL:', e?.message);
    return null;
  }
}

export async function hasStoredCredential(): Promise<boolean> {
  try {
    const r = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    console.log('[hasStoredCredential]', !!r);
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
