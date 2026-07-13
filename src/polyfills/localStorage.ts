/**
 * Polyfills for React Native (iOS)
 *
 * Provides browser APIs that don't exist in Hermes but are used by
 * the app's dependencies (recharts, react-pdf, etc.).
 *
 * Loaded as a side-effect import from index.js (the very first line)
 * BEFORE any other module — so the polyfills exist when theme/i18n
 * init runs and reads localStorage on the first render.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── localStorage ──────────────────────────────────────────────────
const cache = new Map<string, string>();

// Expose a promise that resolves once the AsyncStorage cache is warmed.
// App.tsx awaits this before reading localStorage so the first read sees
// the real persisted state instead of an empty cache.
export const storageReady: Promise<void> = (async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [k, v] of pairs) {
      if (v !== null) cache.set(k, v);
    }
  } catch {}
})();

(globalThis as any).localStorage = {
  get length() { return cache.size; },
  key(index: number): string | null {
    const keys = Array.from(cache.keys());
    return keys[index] ?? null;
  },
  getItem(key: string): string | null {
    return cache.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    cache.set(key, value);
    AsyncStorage.setItem(key, value).catch(() => {});
  },
  removeItem(key: string): void {
    cache.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
  },
  clear(): void {
    cache.clear();
    AsyncStorage.clear().catch(() => {});
  },
};

// ── DOMMatrix ─────────────────────────────────────────────────────
// victory-vendor (recharts/d3-interpolate) and react-pdf reference
// DOMMatrix. Hermes throws ReferenceError on undefined globals; this
// stub prevents the crash without forking the libraries.
(globalThis as any).DOMMatrix = class {
  a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
  constructor(transform?: string) {
    if (transform) {
      const m = transform.match(/matrix\(([^)]+)\)/);
      if (m) {
        const vals = m[1].split(',').map(parseFloat);
        if (vals.length === 6) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = vals;
        }
      }
    }
  }
  isIdentity = true;
  is2D = true;
};

// ── window.location ───────────────────────────────────────────────
// Some libraries (expo devtools, recharts) probe window.location.
const win = (globalThis as any).window || {};
if (!win.location) {
  win.location = {
    protocol: 'http:',
    host: 'localhost',
    hostname: 'localhost',
    port: '8081',
    href: 'http://localhost:8081/',
    origin: 'http://localhost:8081',
    pathname: '/',
    search: '',
    hash: '',
  };
}
(globalThis as any).window = win;

// ── navigator (for i18n init that reads navigator.language) ──────
if (!(globalThis as any).navigator) {
  (globalThis as any).navigator = {
    language: 'zh-CN',
    product: 'ReactNative',
  };
}

export {};
