/**
 * Biometric helpers — wraps expo-local-authentication + react-native-keychain.
 *
 * Each user gets their own Keychain slot: `snailbooks.biometric.v2.<username>`.
 * When `username` is omitted, falls back to `saved_login` from localStorage.
 * On first upgrade, migrates old global-slot credentials to user-specific slots.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as Keychain from 'react-native-keychain';

const SERVICE_PREFIX = 'snailbooks.biometric.v2';
const SERVICE_LEGACY = 'snailbooks.biometric.v2'; // pre-user-specific global slot
const KEYCHAIN_USERNAME = 'snailbooks-biometric-user';

export type BiometricCredential = {
  username: string;
  password: string;
};

function resolveService(username?: string): string {
  const u = username || (() => { try { return localStorage.getItem('saved_login') || ''; } catch { return ''; } })();
  return u ? `${SERVICE_PREFIX}.${u}` : SERVICE_LEGACY;
}

export async function isBiometricAvailable(): Promise<{
  available: boolean;
  reason?: string;
}> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return { available: false, reason: 'no-hardware' };
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { available: false, reason: 'not-enrolled' };
    try {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level <= 1) {
        return { available: false, reason: level === 0 ? 'none' : 'passcode-only' };
      }
    } catch {}
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
      service: resolveService(username),
    });
    try { localStorage.setItem(KEYCHAIN_USERNAME, username); } catch {}
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'unknown' };
  }
}

/** Read credential for a specific user. Tries user slot first, then
 *  legacy global slot (migrates to user slot on hit). */
export async function getCredential(username?: string): Promise<BiometricCredential | null> {
  const service = resolveService(username);
  try {
    // 1. Try user-specific slot
    let r = await Keychain.getGenericPassword({ service });
    if (r) return { username: r.username, password: r.password };

    // 2. Migration: try legacy global slot
    r = await Keychain.getGenericPassword({ service: SERVICE_LEGACY });
    if (r) {
      // Migrate to user-specific slot and clear legacy
      await saveCredential(r.username, r.password);
      try { await Keychain.resetGenericPassword({ service: SERVICE_LEGACY }); } catch {}
      return { username: r.username, password: r.password };
    }
    return null;
  } catch {
    return null;
  }
}

export async function hasStoredCredential(username?: string): Promise<boolean> {
  const c = await getCredential(username);
  return !!c;
}

export async function clearCredential(username?: string): Promise<void> {
  const service = resolveService(username);
  try {
    await Keychain.resetGenericPassword({ service });
    try { localStorage.removeItem(KEYCHAIN_USERNAME); } catch {}
  } catch {}
}
