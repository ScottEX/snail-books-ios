/**
 * Platform abstraction layer for React Native
 * Replaces browser-only globals (localStorage, document, window, navigator)
 * with React Native equivalents.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── localStorage: sync cache backed by AsyncStorage ────────────
let _cacheReady = false;
let _storageCache: Record<string, string> = {};

export async function initStorageCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    _storageCache = Object.fromEntries(
      pairs.filter(([, v]) => v != null).map(([k, v]) => [k, v as string])
    );
    _cacheReady = true;
  } catch {
    _cacheReady = true;
  }
}

// Sync-like localStorage facade — reads from cache once ready
export const localStorage = {
  getItem: (key: string): string | null => {
    if (_cacheReady) return _storageCache[key] ?? null;
    return null;
  },
  setItem: (key: string, value: string): void => {
    _storageCache[key] = value;
    AsyncStorage.setItem(key, value).catch(() => {});
  },
  removeItem: (key: string): void => {
    delete _storageCache[key];
    AsyncStorage.removeItem(key).catch(() => {});
  },
  get length() { return Object.keys(_storageCache).length; },
  key: (index: number) => Object.keys(_storageCache)[index] ?? null,
  clear: () => {
    _storageCache = {};
    AsyncStorage.clear().catch(() => {});
  },
};

// ─── navigator shim (RN doesn't expose the full web Navigator) ──
// `product: 'ReactNative'` is the standard sentinel the app code uses to
// decide it's running under RN (vs web), so we set it here. `language` is
// the only field web code reads off navigator directly.
export const navigator = { language: 'zh-CN', product: 'ReactNative' } as any;

// ─── document / window stubs (no-ops for RN) ───────────────────
export const document = {
  getElementById: () => null,
  createElement: () => ({ style: {}, textContent: '', appendChild: () => {} }),
  querySelector: () => null,
  head: { appendChild: () => {}, removeChild: () => {} },
  documentElement: null,
};

export const window = {};