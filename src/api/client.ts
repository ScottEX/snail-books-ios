import { getLang } from '../i18n';

// ── Event bus ──
// The api layer is not a React component, so it cannot render a modal directly
// or call React state setters. Expose a tiny pub/sub so App-level components
// (SessionKickedModal, App.tsx) can subscribe.
type UserChangeListener = () => void;
type SessionKickedListener = () => void;

const _userChangeListeners = new Set<UserChangeListener>();
const _sessionKickedListeners = new Set<SessionKickedListener>();

export function onUserChange(fn: UserChangeListener): () => void {
  _userChangeListeners.add(fn);
  return () => { _userChangeListeners.delete(fn); };
}
// ── Session warm-up: the session cookie from POST /login may not be
// immediately visible to NSHTTPCookieStorage. Track whether we've ever
// succeeded an authFetch this session, and on the very first 401 retry
// once after 1s before treating it as a real logout.
let _lastAuthSuccess = 0;
function _resetAuthSuccess() { _lastAuthSuccess = 0; }

function _emitUserChange() {
  console.error('[AUTH DEBUG] _emitUserChange — resetting _lastAuthSuccess');
  _resetAuthSuccess();  // new session after login → restart warm-up window
  _userChangeListeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

export function onSessionKicked(fn: SessionKickedListener): () => void {
  _sessionKickedListeners.add(fn);
  return () => { _sessionKickedListeners.delete(fn); };
}
function _emitSessionKicked() {
  _sessionKickedListeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

function getApiBase(): string {
  // Allow override via localStorage for development/testing
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('api_base');
    if (saved) return saved;
  }
  // React Native: Metro only serves the JS bundle, not the API. Point
  // directly at the Flask backend. Production server is 8.135.58.90:8601.
  // Override at runtime via localStorage.setItem('api_base', 'http://...') to
  // test against localhost or a LAN dev box.
  if (typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative') {
    return 'http://8.135.58.90:8601';
  }
  // Web / production: use relative URLs (same origin)
  return '';
}

const API_BASE = getApiBase();
export { API_BASE };

/**
 * Resolve an asset URL returned by the server into something RN's
 * <Image> can load. The server returns paths like '/uploads/abc.jpg'
 * (relative) — browsers auto-resolve them via CSS background-image,
 * but RN's Image component does NOT, so a leading '/uploads/...' would
 * silently fail on iOS. If the URL is missing a scheme, prepend
 * API_BASE. data: / blob: / already-absolute https?:// URLs pass
 * through untouched.
 */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(data:|blob:|https?:|file:|content:)/i.test(url)) return url;
  if (url.startsWith('/')) return API_BASE + url;
  return url;
}

// ── Idle timeout: 2 hours no API call → redirect to login ──
const IDLE_MS = 120 * 60_000; // 120 minutes = 2 hours
let lastActivity = Date.now();
let idleTimer: ReturnType<typeof setInterval> | null = null;

// ── Session-expired callback ──
// App.tsx registers a handler so the auth layer can force a route back to
// login when a 401 comes back (RN has no window.location to redirect).
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: () => void) { onSessionExpired = fn; }

function startIdleTimer() {
  if (idleTimer) return;
  idleTimer = setInterval(() => {
    if (!localStorage.getItem('user')) return;
    if (Date.now() - lastActivity > IDLE_MS) {
      localStorage.removeItem('user');
      try { onSessionExpired?.(); } catch {}
    }
  }, 10_000);
}
startIdleTimer();

function bumpActivity() {
  lastActivity = Date.now();
}

function headers(): Record<string, string> {
  return { 'X-Lang': getLang() };
}

async function authFetch<T = any>(url: string, options?: RequestInit): Promise<T> {
  // ── DEBUG: log every authFetch call so we can trace which one triggers logout
  const _debugUrl = url;
  try { console.warn('[AUTH DEBUG] authFetch →', url); } catch {}
  const mergedHeaders: Record<string, string> = {
    ...headers(),
    ...(options?.headers as Record<string, string> || {}),
  };
  if (options?.body && typeof options.body === 'string' && !mergedHeaders['Content-Type']) {
    mergedHeaders['Content-Type'] = 'application/json';
  }
  const resp = await fetch(API_BASE + url, {
    ...options,
    headers: mergedHeaders,
    credentials: 'include' as RequestCredentials,
  });
  if (resp.status === 401) {
    console.error('[AUTH DEBUG] 401 on', url, '— _lastAuthSuccess =', _lastAuthSuccess);
    // ── Session warm-up: if we've never had a successful auth call this
    // session, the session cookie might still be settling in NSHTTPCookieStorage.
    // Retry once after 1s instead of immediately logging out.
    if (_lastAuthSuccess === 0) {
      console.warn('[AUTH DEBUG] warm-up retry after 1s for', url);
      await new Promise(r => setTimeout(r, 1000));
      const retryResp = await fetch(API_BASE + url, {
        ...options,
        headers: mergedHeaders,
        credentials: 'include' as RequestCredentials,
      });
      if (retryResp.ok) {
        console.warn('[AUTH DEBUG] warm-up retry OK for', url);
        _lastAuthSuccess = Date.now();
        bumpActivity();
        return retryResp.json();
      }
      console.error('[AUTH DEBUG] warm-up retry FAILED for', url, 'status', retryResp.status);
    }
    console.error('[AUTH DEBUG] LOGOUT triggered by 401 on', url);
    let kickCode: string | null = null;
    let kickMsg: string | null = null;
    try {
      const body = await resp.clone().json();
      if (body?.code) kickCode = body.code;
      if (body?.message) kickMsg = body.message;
    } catch {}
    localStorage.removeItem('user');
    try { localStorage.removeItem('bg-image'); } catch {}
    _emitUserChange();
    if (kickCode === 'session_kicked') {
      _emitSessionKicked();
    }
    try { onSessionExpired?.(); } catch {}
    return Promise.reject(new Error(kickMsg || 'Unauthorized'));
  }
  if (resp.status === 403) {
    // Read body to distinguish account-disabled from permission-denied.
    // Only logout if the backend explicitly says the account is disabled.
    let isDisabled = false;
    try {
      const body = await resp.clone().json();
      const msg = (body?.message || '').toLowerCase();
      isDisabled = msg.includes('disabled') || msg.includes('禁用') || msg.includes('停用');
    } catch {}
    if (isDisabled) {
      localStorage.removeItem('user');
      try { localStorage.removeItem('bg-image'); } catch {}
      _emitUserChange();
      try { onSessionExpired?.(); } catch {}
      return Promise.reject(new Error('Account disabled'));
    }
    // Permission denied (e.g. non-admin hitting admin endpoint) — just reject, don't logout
    return Promise.reject(new Error('Forbidden'));
  }
  if (!resp.ok) {
    let msg = `API error: ${resp.status} ${resp.statusText}`;
    try { const body = await resp.json(); if (body.message) msg = body.message; } catch {}
    throw new Error(msg);
  }
  bumpActivity();
  _lastAuthSuccess = Date.now();
  return resp.json();
}

/**
 * Silent variant of authFetch — does NOT fire session_expired /
 * onUserChange / onSessionKicked events on 401. Use for optional /
 * informational calls (e.g. LoginScreen checking webauthn status on
 * mount) where a 401 should be silently ignored, not turn into a
 * redirect loop. Returns null on any failure (network error or
 * non-2xx status).
 */
async function silentAuthFetch<T = any>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const mergedHeaders: Record<string, string> = {
      ...headers(),
      ...(options?.headers as Record<string, string> || {}),
    };
    if (options?.body && typeof options.body === 'string' && !mergedHeaders['Content-Type']) {
      mergedHeaders['Content-Type'] = 'application/json';
    }
    const resp = await fetch(API_BASE + url, {
      ...options,
      headers: mergedHeaders,
      credentials: 'include' as RequestCredentials,
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export const api = {
  login: (username: string, password: string, remember = false) => {
    bumpActivity();
    return fetch(API_BASE + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lang': getLang() },
      body: JSON.stringify({ username, password, remember }),
      credentials: 'include' as RequestCredentials,
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || `Login failed (${r.status})`);
      return data;
    });
  },

  register: (username: string, password: string, email: string) =>
    fetch(API_BASE + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lang': getLang() },
      body: JSON.stringify({ username, password, email }),
      credentials: 'include' as RequestCredentials,
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || `Register failed (${r.status})`);
      return data;
    }),

  verify: (email: string, code: string) =>
    fetch(API_BASE + '/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lang': getLang() },
      body: JSON.stringify({ email, code }),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || `Verify failed (${r.status})`);
      return data;
    }),

  resendCode: (email: string) =>
    fetch(API_BASE + '/resend-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lang': getLang() },
      body: JSON.stringify({ email }),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || `Resend failed (${r.status})`);
      return data;
    }),

  forgotPassword: (email: string) =>
    fetch(API_BASE + '/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lang': getLang() },
      body: JSON.stringify({ email }),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || `Request failed (${r.status})`);
      return data;
    }),

  resetPassword: (email: string, code: string, password: string) =>
    fetch(API_BASE + '/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lang': getLang() },
      body: JSON.stringify({ email, code, password }),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || `Reset failed (${r.status})`);
      return data;
    }),

  getSummary: () => authFetch('/api/summary'),
  getTransactions: (page = 1, perPage = 10, filters?: Record<string, string>) => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('per_page', String(perPage));
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    }
    return authFetch(`/api/transactions?${params}`);
  },
  createTransaction: (data: any) => authFetch('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) => authFetch(`/api/transactions/${id}`, { method: 'DELETE' }),
  updateTransaction: (id: number, data: any) => authFetch(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Expense image upload — accepts the { uri, type, name } shape from
  // utils/imagePicker (or anything with a web-compatible File shape) and
  // forwards via RN FormData.
  uploadExpenseImages: async (files: Array<{ uri: string; type?: string; name?: string }>) => {
    bumpActivity();
    const form = new FormData();
    files.forEach(f => form.append('files', f as any));
    const resp = await fetch(API_BASE + '/api/expenses/upload-images', {
      method: 'POST',
      headers: headers(),
      body: form,
      credentials: 'include' as RequestCredentials,
    });
    if (resp.status === 401 || resp.status === 403) {
      localStorage.removeItem('user');
      try { onSessionExpired?.(); } catch {}
      throw new Error('Unauthorized');
    }
    if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
    const data = await resp.json();
    return data as { status: 'ok'; images: string[]; thumb_images: string[]; has_thumbs: boolean };
  },

  getPartners: () => authFetch('/api/partners'),
  getDividends: () => authFetch('/api/dividends'),
  createDividend: (data: any) => authFetch('/api/dividends', { method: 'POST', body: JSON.stringify(data) }),
  deleteDividend: (id: number) => authFetch(`/api/dividends/${id}`, { method: 'DELETE' }),
  deleteDividendByNote: (note: string) => authFetch('/api/dividends/delete', { method: 'POST', body: JSON.stringify({ note }) }),

  // Background image — uses silentAuthFetch so a 401 during session warm-up
  // doesn't trigger logout (the background is cosmetic; default fallback is fine).
  getBackground: () => silentAuthFetch('/api/settings/background'),
  uploadBackground: async (file: { uri: string; type?: string; name?: string }) => {
    bumpActivity();
    const form = new FormData();
    form.append('file', file as any);
    const resp = await fetch(API_BASE + '/api/settings/background', {
      method: 'POST',
      headers: { 'X-Lang': getLang() },
      body: form,
      credentials: 'include' as RequestCredentials,
    });
    if (resp.status === 401) {
      localStorage.removeItem('user');
      try { onSessionExpired?.(); } catch {}
      throw new Error('Unauthorized');
    }
    if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
    return resp.json();
  },
  resetBackground: () => authFetch('/api/settings/background', { method: 'DELETE' }),
  saveBackgroundSettings: (data: any) => authFetch('/api/settings/background', { method: 'PUT', body: JSON.stringify(data) }),

  // Avatar upload — accepts a FormData (caller builds it on web with File, on
  // RN with {uri,type,name}). Returns the JSON the backend responds with.
  uploadAvatar: async (form: FormData) => {
    bumpActivity();
    const resp = await fetch(API_BASE + '/api/users/avatar', {
      method: 'POST',
      headers: headers(),
      body: form,
      credentials: 'include' as RequestCredentials,
    });
    if (resp.status === 401) {
      localStorage.removeItem('user');
      try { onSessionExpired?.(); } catch {}
      throw new Error('Unauthorized');
    }
    if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
    return resp.json();
  },

  // Profile cover
  getProfileCover: () => authFetch('/api/profile/cover'),
  uploadProfileCover: async (file: { uri: string; type?: string; name?: string }) => {
    bumpActivity();
    const form = new FormData();
    form.append('file', file as any);
    const resp = await fetch(API_BASE + '/api/profile/cover', {
      method: 'POST',
      headers: { 'X-Lang': getLang() },
      body: form,
      credentials: 'include' as RequestCredentials,
    });
    if (resp.status === 401) {
      localStorage.removeItem('user');
      try { onSessionExpired?.(); } catch {}
      throw new Error('Unauthorized');
    }
    if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
    return resp.json();
  },
  resetProfileCover: () => authFetch('/api/profile/cover', { method: 'DELETE' }),

  // Signature
  saveSignature: (signature: string) =>
    authFetch('/api/users/signature', { method: 'POST', body: JSON.stringify({ signature }) }),

  // Profile settings
  changePassword: (old_password: string, new_password: string) =>
    authFetch('/api/profile/password', { method: 'POST', body: JSON.stringify({ old_password, new_password }) }),
  sendEmailCode: (email: string) =>
    authFetch('/api/profile/email/send-code', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyEmailCode: (email: string, code: string) =>
    authFetch('/api/profile/email/verify', { method: 'POST', body: JSON.stringify({ email, code }) }),

  // Auth preferences
  getAuthPrefs: () => authFetch('/api/users/me/auth-prefs'),
  updateAuthPrefs: (data: { enforce_single_session?: number; session_timeout_hours?: number }) =>
    authFetch('/api/users/me/auth-prefs', { method: 'PATCH', body: JSON.stringify(data) }),

  // Language preference (stored per-user in user_settings)
  getLang: () => authFetch('/api/settings/lang'),
  // saveLang uses silentAuthFetch so a 401 (no session yet) doesn't
// fire session_expired — LangProvider.setLang() calls this on every
// language switch, and we don't want every 简/繁/EN tap to nuke the
// LoginScreen via the remount chain.
saveLang: (lang: string) => silentAuthFetch('/api/settings/lang', { method: 'PUT', body: JSON.stringify({ lang }) }),

  // Theme preference (stored per-user in user_settings)
  getTheme: () => authFetch('/api/settings/theme'),
  saveTheme: (theme: string) => authFetch('/api/settings/theme', { method: 'PUT', body: JSON.stringify({ theme }) }),

  getProducts: () => authFetch('/api/products'),
  createProduct: (data: any) => authFetch('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (data: any) => authFetch('/api/products', { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: number) => authFetch(`/api/products?id=${id}`, { method: 'DELETE' }),

  createReconciliation: (data: any) => authFetch('/api/reconciliations', { method: 'POST', body: JSON.stringify(data) }),
  getReconciliations: (limit = 30, filters?: Record<string, string>) => {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    }
    return authFetch(`/api/reconciliations?${params}`);
  },

  getReconciliationsPage: (page = 1, perPage = 10, filters?: Record<string, string>) => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('per_page', String(perPage));
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    }
    return authFetch(`/api/reconciliations?${params}`);
  },

  getUsers: () => authFetch('/api/users'),

  // Platform fees
  getPlatformFees: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    if (month) params.append('month', String(month));
    const qs = params.toString();
    return authFetch('/api/platform-fees' + (qs ? '?' + qs : ''));
  },
  addPlatformFeeEntry: (data: any) => authFetch('/api/platform-fees/entry', { method: 'POST', body: JSON.stringify(data) }),
  updatePlatformFee: (id: number, data: any) => authFetch(`/api/platform-fees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getProcurements: () => authFetch('/api/procurements'),
  createProcurement: (data: any) => authFetch('/api/procurements', { method: 'POST', body: JSON.stringify(data) }),
  deleteProcurement: (id: number) => authFetch(`/api/procurements/${id}`, { method: 'DELETE' }),

  // Procurement batches (进货批次)
  getProcurementBatches: (page = 1, perPage = 10) => authFetch(`/api/procurement-batches?page=${page}&per_page=${perPage}`),
  createProcurementBatch: (data: any) => authFetch('/api/procurement-batches', { method: 'POST', body: JSON.stringify(data) }),
  getProcurementBatchDetail: (id: number) => authFetch(`/api/procurement-batches/${id}`),
  updateProcurementBatch: (id: number, data: any) => authFetch(`/api/procurement-batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProcurementBatch: (id: number) => authFetch(`/api/procurement-batches/${id}`, { method: 'DELETE' }),
  settleProcurementBatch: (id: number) => authFetch(`/api/procurement-batches/${id}/settle`, { method: 'POST' }),
  getProcurementStats: () => authFetch('/api/procurement-stats'),
  getProcurementShareLink: (id: number): Promise<{ url: string }> => authFetch(`/api/procurement-batches/${id}/share-link`),
  // Shared cart
  getCart: () => authFetch('/api/procurement-cart'),
  addToCart: (product_id: number, quantity: number) => authFetch('/api/procurement-cart', { method: 'POST', body: JSON.stringify({ product_id, quantity }) }),
  removeFromCart: (product_id: number) => authFetch(`/api/procurement-cart/${product_id}`, { method: 'DELETE' }),
  clearCart: () => authFetch('/api/procurement-cart', { method: 'DELETE' }),

  // Daily revenue (每日营收)
  getDailyRevenue: (page = 1, perPage = 10, year?: number, month?: number, date?: string, days?: number, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('per_page', String(perPage));
    if (year) params.append('year', String(year));
    if (month) params.append('month', String(month));
    if (date) params.append('date', date);
    if (days) params.append('days', String(days));
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const qs = params.toString();
    return authFetch('/api/daily-revenue?' + qs);
  },
  createDailyRevenue: (data: any) => authFetch('/api/daily-revenue', { method: 'POST', body: JSON.stringify(data) }),
  updateDailyRevenue: (id: number, data: any) => authFetch(`/api/daily-revenue/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDailyRevenue: (id: number) => authFetch(`/api/daily-revenue/${id}`, { method: 'DELETE' }),
  getLast7Days: () => authFetch('/api/daily-revenue/last-7'),
  getDailyRevenueTotal: () => authFetch('/api/daily-revenue/total'),
  getBusinessSummary: () => authFetch('/api/business-summary'),
  getServerDate: () => silentAuthFetch('/api/server-date'),

  getChart: () => authFetch('/api/chart'),
  getChartMonthly: () => authFetch('/api/chart/monthly'),
  getStats: () => authFetch('/api/stats'),

  logout: async () => {
    try { await fetch(API_BASE + '/logout', { method: 'POST', credentials: 'include' as RequestCredentials }); } catch {}
    localStorage.removeItem('user');
    _emitUserChange();
  },

  // Delete account (self-deletion only, CASCADE cleans up all user data)
  deleteAccount: (uid: number) => authFetch(`/api/users/${uid}/delete`, { method: 'POST' }),

  // ── Admin ──
  admin: {
    check: () => authFetch('/api/admin/check'),
    getUnreviewedCount: () => authFetch('/api/admin/users/unreviewed-count'),
    markReviewed: (userId?: number) =>
      authFetch('/api/admin/users/mark-reviewed', {
        method: 'POST',
        ...(userId != null ? { body: JSON.stringify({ user_id: userId }) } : {}),
      }),
    getMe: () => authFetch('/api/users/me'),
    getUser: (id: number | string) => authFetch(`/api/admin/users/${id}`),
    updateUser: (id: number | string, body: Record<string, any>) =>
      authFetch(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteUser: (id: number | string) => authFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
    restoreUser: (id: number | string) => authFetch(`/api/admin/users/${id}/restore`, { method: 'POST' }),
  },

  // Current user (non-admin safe — returns 200 for everyone)
  getMe: () => authFetch('/api/users/me'),

  // Invoice info (system-level)
  getInvoice: () => authFetch('/api/admin/invoice'),
  updateInvoice: (data: Record<string, string>) => authFetch('/api/admin/invoice', { method: 'PUT', body: JSON.stringify(data) }),

  // Invoice records
  getInvoiceRecords: (filter?: { status?: 'pending' | 'done'; type?: 'vat' | 'general'; procurement_batch_id?: number }) => {
    const qs = new URLSearchParams();
    if (filter?.status) qs.set('status', filter.status);
    if (filter?.type) qs.set('type', filter.type);
    if (filter?.procurement_batch_id) qs.set('procurement_batch_id', String(filter.procurement_batch_id));
    const q = qs.toString();
    return authFetch(`/api/invoice-records${q ? '?' + q : ''}`);
  },
  getInvoiceRecord: (id: number) => authFetch(`/api/invoice-records/${id}`),
  createInvoiceRecord: (data: Record<string, any>) => authFetch('/api/invoice-records', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoiceRecord: (id: number, data: Record<string, any>) => authFetch(`/api/invoice-records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvoiceRecord: (id: number) => authFetch(`/api/invoice-records/${id}`, { method: 'DELETE' }),
  uploadInvoiceFile: (id: number, file: { uri: string; type?: string; name?: string }): Promise<{ status: string; file_path: string; file_type: string; file_size: number }> => {
    const fd = new FormData();
    fd.append('file', file as any);
    return authFetch(`/api/invoice-records/${id}/file`, { method: 'POST', body: fd });
  },
  getInvoiceFileUrl: (filePath: string) => `${API_BASE}/api/invoice-files/${filePath}`,
  getProcurementBatchesLite: () => authFetch(`/api/procurement-batches-lite`),

  // WebAuthn (Face ID)
  webauthnLoginBegin: (credentialId?: string, username?: string) =>
    fetch(API_BASE + '/api/webauthn/login/begin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lang': getLang() },
      body: JSON.stringify(
        credentialId ? { credential_id: credentialId } :
        username ? { username } : {}
      ),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Login begin failed');
      return data;
    }),
  webauthnLoginComplete: (credential: any) =>
    fetch(API_BASE + '/api/webauthn/login/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lang': getLang() },
      body: JSON.stringify(credential),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Login failed');
      return data;
    }),
  webauthnRegisterBegin: () => authFetch('/api/webauthn/register/begin'),
  webauthnRegisterComplete: (credential: any) =>
    authFetch('/api/webauthn/register/complete', { method: 'POST', body: JSON.stringify(credential) }),
  webauthnStatus: () => silentAuthFetch('/api/webauthn/status'),
  webauthnDelete: () => authFetch('/api/webauthn/credentials', { method: 'DELETE' }),
  webauthnCheck: (username?: string) =>
    fetch(API_BASE + '/api/webauthn/check' + (username ? '?username=' + encodeURIComponent(username) : '')).then(r => r.json()),

  // ── Per-user login-screen images (avatar + background) ──
  // Web returns a Blob and converts to object URL; RN has no Blob
  // URL, so we fetch and read as a data URI (base64) instead. This
  // matches the behavior the user sees on web: typing a known
  // username instantly swaps the avatar/background.
  _blobToDataUri: async (resp: Response): Promise<string | null> => {
    if (!resp.ok) return null;
    try {
      const blob = await resp.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  },
  getUserAvatar: async (userId: number | string): Promise<string | null> => {
    try {
      const resp = await fetch(API_BASE + `/api/users/avatar?user_id=${userId}`, { credentials: 'omit' as RequestCredentials });
      if (!resp.ok) return null;
      return await (api as any)._blobToDataUri(resp);
    } catch { return null; }
  },
  getUserAvatarByLoginUri: async (identifier: string): Promise<string | null> => {
    try {
      let resp = await fetch(API_BASE + `/api/users/avatar?username=${encodeURIComponent(identifier)}`, { credentials: 'omit' as RequestCredentials });
      if (!resp.ok && identifier.includes('@')) {
        resp = await fetch(API_BASE + `/api/users/avatar?email=${encodeURIComponent(identifier)}`, { credentials: 'omit' as RequestCredentials });
      }
      return await (api as any)._blobToDataUri(resp);
    } catch { return null; }
  },
  getUserBackgroundUri: async (identifier: string): Promise<string | null> => {
    try {
      const resp = await fetch(API_BASE + `/api/users/background?username=${encodeURIComponent(identifier)}`, { credentials: 'omit' as RequestCredentials });
      return await (api as any)._blobToDataUri(resp);
    } catch { return null; }
  },
};
