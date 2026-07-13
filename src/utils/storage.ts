/** Safe localStorage helpers — centralize user identity retrieval. */

/** Get current username from localStorage, with fallback. */
export function getCurrentUser(): string {
  try { return localStorage.getItem('user') || ''; } catch { return ''; }
}

/** Get current user ID from localStorage, or null. */
export function getCurrentUserId(): string | null {
  try { return localStorage.getItem('user_id'); } catch { return null; }
}

/* ---------- WebAuthn state (mirrors web/src/utils/storage.ts) ---------- */
/* The web LoginScreen writes 4 keys when a WebAuthn credential is bound
 * on this device; iOS reads them so the Face ID button shows up on the
 * login screen for returning users. Write paths land in Commit 4
 * (real biometric prompt + keychain) — for now we only add the readers
 * and the post-login re-sync so the state plumbing is in place. */

export function getWebAuthnBound(): {
  bound: boolean;
  user: string;
  credentialId: string;
  userIdB64: string;
} {
  try {
    return {
      bound: localStorage.getItem('webauthn_bound') === '1',
      user: localStorage.getItem('webauthn_user') || '',
      credentialId: localStorage.getItem('webauthn_credential_id') || '',
      userIdB64: localStorage.getItem('webauthn_user_id_b64') || '',
    };
  } catch {
    return { bound: false, user: '', credentialId: '', userIdB64: '' };
  }
}

export function setWebAuthnBound(username: string, credentialId: string, userIdB64 = ''): void {
  try {
    localStorage.setItem('webauthn_bound', '1');
    localStorage.setItem('webauthn_user', username);
    localStorage.setItem('webauthn_credential_id', credentialId);
    if (userIdB64) localStorage.setItem('webauthn_user_id_b64', userIdB64);
  } catch {}
}

export function clearWebAuthn(): void {
  try {
    localStorage.removeItem('webauthn_bound');
    localStorage.removeItem('webauthn_user');
    localStorage.removeItem('webauthn_credential_id');
    localStorage.removeItem('webauthn_user_id_b64');
  } catch {}
}
