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
    // isEnrolledAsync may return true for passcode-only devices on some
    // iOS versions. getEnrolledLevelAsync returns 0=NONE / 1=SECRET
    // (passcode) / 2=BIOMETRIC, giving a reliable distinction.
    // Use raw values (not LocalAuthentication.SecurityLevel) in case the
    // enum isn't exported on the current SDK version.
    try {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level <= 1) {
        return { available: false, reason: level === 0 ? 'none' : 'passcode-only' };
      }
    } catch {
      // Fall through — getEnrolledLevelAsync unavailable on older SDKs
    }
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
    await Keychain.setGenericPassword(username, password, {
      service: KEYCHAIN_SERVICE,
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
