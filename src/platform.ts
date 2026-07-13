/**
 * Platform abstraction layer for React Native.
 *
 * Re-exports the global localStorage (which is shimmed by
 * ./polyfills/localStorage — installed as the first import in index.js)
 * so existing code that does `import { localStorage } from '../platform'`
 * continues to work, and `initStorageCache` awaits the polyfill's
 * AsyncStorage warm-up promise so App.tsx can read localStorage after
 * the real persisted state is loaded.
 */

import { storageReady } from './polyfills/localStorage';

const _localStorage = (globalThis as any).localStorage as {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  length: number;
  key: (index: number) => string | null;
};

export const localStorage = _localStorage;

/**
 * Wait for the AsyncStorage → localStorage cache to finish warming.
 * App.tsx calls this before reading localStorage for the first time,
 * otherwise the first read might see an empty cache and miss the
 * "user is logged in" state, sending the user to the login screen.
 */
export async function initStorageCache(): Promise<void> {
  await storageReady;
}

// `navigator` shim: React Native doesn't expose the full web Navigator. We
// use it to detect RN vs web (`navigator.product === 'ReactNative'`) and to
// read the user's language preference.
export const navigator = (globalThis as any).navigator || { language: 'zh-CN', product: 'ReactNative' };

// `document` / `window` are exposed for any code that probes them. They are
// stub objects — the polyfill installs a real window.location shim if you
// need URL access.
export const document = (globalThis as any).document || {
  getElementById: () => null,
  createElement: () => ({ style: {}, textContent: '', appendChild: () => {} }),
  querySelector: () => null,
  head: { appendChild: () => {}, removeChild: () => {} },
  documentElement: null,
};
export const window = (globalThis as any).window || {};
