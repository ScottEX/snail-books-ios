// ═══════════════════════════════════════════════════════════════
// backgroundCache — download bg image to local FileSystem so
// Image can render from file:// instantly, no network flash.
// ═══════════════════════════════════════════════════════════════

import * as FileSystem from 'expo-file-system';

const KEY_LOCAL = 'bg-local-path';
const KEY_REMOTE = 'bg-remote-url';

/** Download remote URL → local file, record mapping in localStorage. */
export async function cacheBackground(remoteUrl: string): Promise<string> {
  // Delete old cached file before writing new one
  await clearBackgroundFile();

  const filename = `bg_${Date.now()}.jpg`;
  const localPath = `${FileSystem.cacheDirectory}${filename}`;

  const result = await FileSystem.downloadAsync(remoteUrl, localPath);
  if (result.status !== 200) throw new Error(`Download failed: ${result.status}`);

  try { localStorage.setItem(KEY_LOCAL, result.uri); } catch {}
  try { localStorage.setItem(KEY_REMOTE, remoteUrl); } catch {}

  return result.uri;
}

/**
 * Return the local file path if a valid cached background exists.
 * Returns null if no cache or file was deleted by the OS.
 */
export async function getCachedLocalPath(): Promise<string | null> {
  try {
    const path = localStorage.getItem(KEY_LOCAL);
    if (!path) return null;

    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      // File was evicted (cache dir cleanup), clear stale metadata
      try { localStorage.removeItem(KEY_LOCAL); } catch {}
      try { localStorage.removeItem(KEY_REMOTE); } catch {}
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

/**
 * Get cached local path, or download + cache if not available.
 * @returns local path, or null if download fails
 */
export async function getOrDownloadBackground(remoteUrl: string): Promise<string | null> {
  // Return existing cache if it matches this URL
  try {
    const cachedUrl = localStorage.getItem(KEY_REMOTE);
    const cachedPath = localStorage.getItem(KEY_LOCAL);
    if (cachedUrl === remoteUrl && cachedPath) {
      const info = await FileSystem.getInfoAsync(cachedPath);
      if (info.exists) return cachedPath;
    }
  } catch {}

  // Download fresh
  try {
    return await cacheBackground(remoteUrl);
  } catch {
    return null;
  }
}

/** Delete cached file + clear localStorage metadata. */
async function clearBackgroundFile(): Promise<void> {
  try {
    const path = localStorage.getItem(KEY_LOCAL);
    if (path) await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {}
}

/** Full cleanup — call on logout or theme reset. */
export async function clearBackgroundCache(): Promise<void> {
  await clearBackgroundFile();
  try { localStorage.removeItem(KEY_LOCAL); } catch {}
  try { localStorage.removeItem(KEY_REMOTE); } catch {}
}
