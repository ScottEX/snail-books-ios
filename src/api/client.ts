import { getLang } from '../i18n';

// ── Event bus ──
type UserChangeListener = () => void;
type SessionKickedListener = () => void;

const _userChangeListeners = new Set<UserChangeListener>();
const _sessionKickedListeners = new Set<SessionKickedListener>();

export function onUserChange(fn: UserChangeListener): () => void {
  _userChangeListeners.add(fn);
  return () => { _userChangeListeners.delete(fn); };
}

// ── Session warm-up: NSHTTPCookieStorage may not have the session cookie
// from POST /login ready for the first few authFetch calls. Retry once.
let _lastAuthSuccess = 0;
function _resetAuthSuccess() { _lastAuthSuccess = 0; }

function _emitUserChange() {
  _resetAuthSuccess();
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
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('api_base');
    if (saved) return saved;
  }
  if (typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative') {
    return 'http://8.135.58.90:8601';
  }
  return '';
}

const API_BASE = getApiBase();
export { API_BASE };

export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(data:|blob:|https?:|file:|content:)/i.test(url)) return url;
  if (url.startsWith('/')) return API_BASE + url;
  return url;
}

// ── Idle timeout: 2 hours ──
const IDLE_MS = 120 * 60_000;
let lastActivity = Date.now();
let idleTimer: ReturnType<typeof setInterval> | null = null;

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
  const h: Record<string, string> = { 'X-Lang': getLang() };
  try {
    const token = localStorage.getItem('token');
    if (token) h['Authorization'] = `Bearer ${token}`;
  } catch {}
  return h;
}

async function authFetch<T = any>(url: string, options?: RequestInit): Promise<T> {
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
    // Session warm-up: if we've never had a successful call this session,
    // the cookie may still be settling in NSHTTPCookieStorage. Retry once.
    if (_lastAuthSuccess === 0) {
      await new Promise(r => setTimeout(r, 1000));
      const retryResp = await fetch(API_BASE + url, {
        ...options,
        headers: mergedHeaders,
        credentials: 'include' as RequestCredentials,
      });
      if (retryResp.ok) {
        _lastAuthSuccess = Date.now();
        bumpActivity();
        return retryResp.json();
      }
    }
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

// ── Helper for raw-fetch 401/403 in upload functions ──
function _handleRawAuthError(resp: Response, label: string) {
  if (resp.status === 401 || resp.status === 403) {
    localStorage.removeItem('user');
    try { localStorage.removeItem('bg-image'); } catch {}
    _emitUserChange();
    try { onSessionExpired?.(); } catch {}
    throw new Error('Unauthorized');
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
    authFetch('/register', { method: 'POST', body: JSON.stringify({ username, password, email }) }),
  verify: (email: string, code: string) =>
    authFetch('/verify', { method: 'POST', body: JSON.stringify({ email, code }) }),
  resendCode: (email: string) =>
    authFetch('/resend-code', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email: string) =>
    authFetch('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email: string, code: string, password: string) =>
    authFetch('/reset-password', { method: 'POST', body: JSON.stringify({ email, code, password }) }),

  getSummary: () => authFetch('/api/summary'),
  getTransactions: (page = 1, perPage = 10, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    return authFetch('/api/transactions?' + params.toString());
  },
  createTransaction: (data: any) => authFetch('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) => authFetch(`/api/transactions/${id}`, { method: 'DELETE' }),
  updateTransaction: (id: number, data: any) => authFetch(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

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
    _handleRawAuthError(resp, 'uploadExpenseImages');
    if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
    const data = await resp.json();
    return data as { status: 'ok'; images: string[]; thumb_images: string[]; has_thumbs: boolean };
  },

  getPartners: () => authFetch('/api/partners'),
  getDividends: () => authFetch('/api/dividends'),
  createDividend: (data: any) => authFetch('/api/dividends', { method: 'POST', body: JSON.stringify(data) }),
  deleteDividend: (id: number) => authFetch(`/api/dividends/${id}`, { method: 'DELETE' }),
  deleteDividendByNote: (note: string) => authFetch('/api/dividends/delete', { method: 'POST', body: JSON.stringify({ note }) }),

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
    _handleRawAuthError(resp, 'uploadBackground');
    if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
    return resp.json();
  },
  resetBackground: () => authFetch('/api/settings/background', { method: 'DELETE' }),
  saveBackgroundSettings: (data: any) => authFetch('/api/settings/background', { method: 'PUT', body: JSON.stringify(data) }),

  uploadAvatar: async (form: FormData) => {
    bumpActivity();
    const resp = await fetch(API_BASE + '/api/users/avatar', {
      method: 'POST',
      headers: headers(),
      body: form,
      credentials: 'include' as RequestCredentials,
    });
    _handleRawAuthError(resp, 'uploadAvatar');
    if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
    return resp.json();
  },

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
    _handleRawAuthError(resp, 'uploadProfileCover');
    if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
    return resp.json();
  },
  resetProfileCover: () => authFetch('/api/profile/cover', { method: 'DELETE' }),

  saveSignature: (signature: string) =>
    authFetch('/api/users/signature', { method: 'POST', body: JSON.stringify({ signature }) }),

  changePassword: (old_password: string, new_password: string) =>
    authFetch('/api/profile/password', { method: 'POST', body: JSON.stringify({ old_password, new_password }) }),
  sendEmailCode: (email: string) =>
    authFetch('/api/profile/email/send-code', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyEmailCode: (email: string, code: string) =>
    authFetch('/api/profile/email/verify', { method: 'POST', body: JSON.stringify({ email, code }) }),

  getAuthPrefs: () => authFetch('/api/users/me/auth-prefs'),
  updateAuthPrefs: (data: { enforce_single_session?: number; session_timeout_hours?: number }) =>
    authFetch('/api/users/me/auth-prefs', { method: 'PATCH', body: JSON.stringify(data) }),

  getLang: () => authFetch('/api/settings/lang'),
  saveLang: (lang: string) => silentAuthFetch('/api/settings/lang', { method: 'PUT', body: JSON.stringify({ lang }) }),

  getTheme: () => authFetch('/api/settings/theme'),
  saveTheme: (theme: string) => authFetch('/api/settings/theme', { method: 'PUT', body: JSON.stringify({ theme }) }),

  getProducts: () => authFetch('/api/products'),
  createProduct: (data: any) => authFetch('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (data: any) => authFetch('/api/products', { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: number) => authFetch(`/api/products?id=${id}`, { method: 'DELETE' }),

  createReconciliation: (data: any) => authFetch('/api/reconciliations', { method: 'POST', body: JSON.stringify(data) }),
  getReconciliations: (limit = 30, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    return authFetch('/api/reconciliations?' + params.toString());
  },
  getReconciliationsPage: (page = 1, perPage = 10, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    return authFetch('/api/reconciliations?' + params.toString());
  },

  getUsers: () => authFetch('/api/users'),
  getUser: (id: number) => authFetch(`/api/users/${id}`),
  getUserByLoginUri: (identifier: string) =>
    authFetch(`/api/admin/users/lookup/${encodeURIComponent(identifier)}`),
  deleteUser: (id: number) => authFetch(`/api/admin/users/${id}/delete`, { method: 'POST' }),
  toggleUserDisabled: (id: number, disabled: boolean) =>
    authFetch(`/api/admin/users/${id}/disabled`, { method: 'POST', body: JSON.stringify({ disabled }) }),
  addPlatformFeeEntry: (data: any) => authFetch('/api/platform-fees/entry', { method: 'POST', body: JSON.stringify(data) }),
  updatePlatformFeeEntry: (id: number, data: any) =>
    authFetch(`/api/platform-fees/entry/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlatformFeeEntry: (id: number) =>
    authFetch(`/api/platform-fees/entry/${id}`, { method: 'DELETE' }),
  getPlatformFees: () => authFetch('/api/platform-fees'),
  updatePlatformFee: (id: number, data: any) => authFetch(`/api/platform-fees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getDailyRevenue: (page = 1, perPage = 10, year?: number, month?: number, date?: string, days?: number, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('per_page', String(perPage));
    if (year != null) params.append('year', String(year));
    if (month != null) params.append('month', String(month));
    if (date) params.append('date', date);
    if (days != null) params.append('days', String(days));
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    return authFetch('/api/daily-revenue?' + params.toString());
  },
  createDailyRevenue: (data: any) => authFetch('/api/daily-revenue', { method: 'POST', body: JSON.stringify(data) }),
  updateDailyRevenue: (id: number, data: any) =>
    authFetch(`/api/daily-revenue/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
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

  deleteAccount: (uid: number) => authFetch(`/api/users/${uid}/delete`, { method: 'POST' }),

  admin: {
    check: () => authFetch('/api/admin/check'),
    getUnreviewedCount: () => authFetch('/api/admin/users/unreviewed-count'),
    getUser: (id: number | string) => authFetch(`/api/admin/users/${id}`),
    updateUser: (id: number | string, body: Record<string, any>) =>
      authFetch(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteUser: (id: number | string) => authFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
    markReviewed: (userId?: number) =>
      authFetch('/api/admin/users/mark-reviewed', {
        method: 'POST',
        ...(userId != null ? { body: JSON.stringify({ user_id: userId }) } : {}),
      }),
    getMe: () => authFetch('/api/users/me'),
    getInvoiceInfo: () => authFetch('/api/admin/invoice'),
    updateInvoiceInfo: (data: Record<string, string>) =>
      authFetch('/api/admin/invoice', { method: 'PUT', body: JSON.stringify(data) }),
    getProcurements: (filters?: Record<string, any>) => {
      const params = new URLSearchParams();
      if (filters) Object.entries(filters).forEach(([k, v]) => {
        if (v != null && v !== '') params.append(k, String(v));
      });
      const qs = params.toString();
      return authFetch('/api/procurements' + (qs ? '?' + qs : ''));
    },
    createProcurement: (data: any) => authFetch('/api/procurements', { method: 'POST', body: JSON.stringify(data) }),
    updateProcurement: (data: any) => authFetch('/api/procurements', { method: 'PUT', body: JSON.stringify(data) }),
    deleteProcurement: (id: number) => authFetch(`/api/procurements/${id}`, { method: 'DELETE' }),
    createReconciliation: (data: any) => authFetch('/api/reconciliations', { method: 'POST', body: JSON.stringify(data) }),
    archiveDailyRevenue: (id: number) =>
      authFetch(`/api/daily-revenue/${id}/archive`, { method: 'POST' }),
    restoreUser: (id: number | string) => authFetch(`/api/admin/users/${id}/restore`, { method: 'POST' }),
  },

  getMe: () => authFetch('/api/users/me'),

  getInvoice: () => authFetch('/api/admin/invoice'),
  updateInvoice: (data: Record<string, string>) => authFetch('/api/admin/invoice', { method: 'PUT', body: JSON.stringify(data) }),

  getProcurements: (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => {
      if (v != null && v !== '') params.append(k, String(v));
    });
    const qs = params.toString();
    return authFetch('/api/procurements' + (qs ? '?' + qs : ''));
  },
  createProcurement: (data: any) => authFetch('/api/procurements', { method: 'POST', body: JSON.stringify(data) }),
  updateProcurement: (data: any) => authFetch('/api/procurements', { method: 'PUT', body: JSON.stringify(data) }),
  deleteProcurement: (id: number) => authFetch(`/api/procurements/${id}`, { method: 'DELETE' }),
  getProcurementStats: () => authFetch('/api/procurement-stats'),
  getProcurementBatches: (page = 1, perPage = 10) => authFetch(`/api/procurement-batches?page=${page}&per_page=${perPage}`),
  createProcurementBatch: (data: any) => authFetch('/api/procurement-batches', { method: 'POST', body: JSON.stringify(data) }),
  getProcurementBatchDetail: (id: number) => authFetch(`/api/procurement-batches/${id}`),
  updateProcurementBatch: (id: number, data: any) => authFetch(`/api/procurement-batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProcurementBatch: (id: number) => authFetch(`/api/procurement-batches/${id}`, { method: 'DELETE' }),
  settleProcurementBatch: (id: number) => authFetch(`/api/procurement-batches/${id}/settle`, { method: 'POST' }),
  getProcurementShareLink: (id: number): Promise<{ url: string }> => authFetch(`/api/procurement-batches/${id}/share-link`),
  getProcurementBatchesLite: () => authFetch('/api/procurement-batches-lite'),
  getCart: () => authFetch('/api/procurement-cart'),
  addToCart: (product_id: number, quantity: number) => authFetch('/api/procurement-cart', { method: 'POST', body: JSON.stringify({ product_id, quantity }) }),
  removeFromCart: (product_id: number) => authFetch(`/api/procurement-cart/${product_id}`, { method: 'DELETE' }),
  clearCart: () => authFetch('/api/procurement-cart', { method: 'DELETE' }),

  // Invoice records (开票记录)
  getInvoiceRecords: (filter?: { status?: 'pending' | 'done'; type?: 'vat' | 'general'; procurement_batch_id?: number }) => {
    const params = new URLSearchParams();
    if (filter?.status) params.append('status', filter.status);
    if (filter?.type) params.append('type', filter.type);
    if (filter?.procurement_batch_id) params.append('procurement_batch_id', String(filter.procurement_batch_id));
    const qs = params.toString();
    return authFetch('/api/invoice-records' + (qs ? '?' + qs : ''));
  },
  getInvoiceRecord: (id: number) => authFetch(`/api/invoice-records/${id}`),
  createInvoiceRecord: (data: Record<string, any>) => authFetch('/api/invoice-records', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoiceRecord: (id: number, data: Record<string, any>) => authFetch(`/api/invoice-records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvoiceRecord: (id: number) => authFetch(`/api/invoice-records/${id}`, { method: 'DELETE' }),
  uploadInvoiceFile: async (id: number, file: { uri: string; type?: string; name?: string }) => {
    const form = new FormData();
    form.append('file', file as any);
    const resp = await fetch(API_BASE + `/api/invoice-records/${id}/upload`, {
      method: 'POST',
      headers: headers(),
      body: form,
      credentials: 'include' as RequestCredentials,
    });
    if (!resp.ok) throw new Error('Upload failed');
    return resp.json() as Promise<{ status: string; file_path: string; file_type: string; file_size: number }>;
  },
  getInvoiceFileUrl: (filePath: string) => {
    return `${API_BASE}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
  },
  getUserAvatar: async (userId: number | string): Promise<string | null> => {
    try {
      const resp = await fetch(API_BASE + `/api/users/avatar?user_id=${userId}`, { credentials: 'omit' as RequestCredentials });
      if (!resp.ok) return null;
      return await (api as any)._blobToDataUri(resp);
    } catch { return null; }
  },

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

  webauthnRegisterStart: (username: string) =>
    authFetch('/api/webauthn/register/begin', { method: 'POST', body: JSON.stringify({ username }) }),
  webauthnRegisterComplete: (credential: any) =>
    authFetch('/api/webauthn/register/complete', { method: 'POST', body: JSON.stringify(credential) }),
  webauthnStatus: () => silentAuthFetch('/api/webauthn/status'),
  webauthnDelete: () => authFetch('/api/webauthn/credentials', { method: 'DELETE' }),
  webauthnCheck: (username?: string) =>
    fetch(API_BASE + '/api/webauthn/check' + (username ? '?username=' + encodeURIComponent(username) : '')).then(r => r.json()),

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
