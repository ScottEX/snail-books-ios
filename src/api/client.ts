import { getLang } from '../i18n';

export interface ExpenseDraft {
  amount: string;
  date: string | null;
  category: 'daily' | 'rent' | 'salary' | 'goods' | null;
  account: 'payCash' | 'payWechat' | 'payAlipay' | null;
  note: string | null;
}

export interface LedgerTotal {
  start_date: string | null;
  end_date: string;
  amount: number;
  records: number;
  awaiting_review?: number;
  disabled?: number;
  rounds?: number;
  dividend_amount?: number;
  round?: string;
}

interface LedgerAggregateAnswer {
  metric: 'turnover' | 'received' | 'expense' | 'profit' | 'registered_users' | 'dividend_amount' | 'dividend_rounds'
    | 'procurement_summary' | 'unsettled_procurement';
  category: ExpenseDraft['category'];
  supplier: string | null;
  current: LedgerTotal;
  comparison: LedgerTotal | null;
  difference: number | null;
}

export type LedgerAnswer = LedgerAggregateAnswer | {
  metric: 'shareholders';
  as_of: string;
  shareholders: { id: number; name: string; share: number }[];
} | {
  metric: 'latest_procurement' | 'latest_expense' | 'latest_revenue' | 'latest_reconciliation' | 'latest_invoice';
  record: (AppSearchRecord & { settled?: boolean }) | null;
  category: ExpenseDraft['category'];
  supplier: string | null;
  start_date: string | null;
  end_date: string;
};

export interface AppSearchRecord {
  kind: 'expense' | 'procurement' | 'invoice' | 'product' | 'partner' | 'revenue' | 'reconciliation';
  id: number;
  title: string | null;
  detail: string | null;
  date: string;
  amount: number | null;
  settled?: boolean;
}

export type LedgerAction = 'this_month' | 'last_month' | 'compare_last_month' | 'details' | 'order_value' | 'posted_expense';
export type LedgerRequest =
  | { question: string; context?: string }
  | { example: string; question: string }
  | { action: LedgerAction; context: string; offset?: number };
export type LedgerResponse =
  | { status: 'ok'; answer: LedgerAnswer; context?: string | null; actions?: LedgerAction[] }
  | { status: 'clarify'; reason: 'procurement_basis' | 'period'; context: string; actions: LedgerAction[] }
  | { status: 'details'; records: AppSearchRecord[]; next_offset: number | null };

export interface DividendPreview {
  status: 'ok';
  total: number;
  preview: string;
  allocations: { id: number; name: string; share: number; amount: number }[];
}

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
    // @ts-ignore React Native global
    const port = typeof __DEV__ !== 'undefined' && __DEV__ ? '8601' : '8600';
    return `http://8.135.58.90:${port}`;
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

// ── Idle timeout: default 2h, overridable via setIdleTimeoutHours ──
let IDLE_MS = 120 * 60_000;
export function setIdleTimeoutHours(hours: number) {
  if (hours > 0) IDLE_MS = hours * 60 * 60_000;
}
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
export { bumpActivity };

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
    if (kickCode === 'session_kicked') {
      _emitSessionKicked();
      try { if (typeof window !== 'undefined') (window as any).__expiring = true; } catch {}
    }
    _emitUserChange();
    try { onSessionExpired?.(); } catch {}
    return Promise.reject(new Error(kickCode ? '__EXPIRING__' : kickMsg || 'Unauthorized'));
  }
  if (resp.status === 403) {
    let message = '';
    try {
      const body = await resp.clone().json();
      if (typeof body?.message === 'string') message = body.message;
    } catch {}
    if (url === '/api/ledger/ask' && message === 'ledgerAiAdminOnly') throw new Error(message);
    if (message.toLowerCase().includes('disabled') || message.includes('禁用') || message.includes('停用')) {
      localStorage.removeItem('user');
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
    _emitUserChange();
    try { onSessionExpired?.(); } catch {}
    throw new Error('Unauthorized');
  }
}

function postWrite<T = any>(path: string, data: unknown, key?: string, signal?: AbortSignal) {
  return authFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: key ? { 'Idempotency-Key': key } : undefined,
    signal,
  });
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
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    return authFetch('/api/transactions?' + params.toString());
  },
  createTransaction: (data: unknown, key?: string) => postWrite('/api/transactions', data, key),
  generateExpenseDraft: (text: string, signal: AbortSignal) =>
    authFetch<{ status: 'ok'; draft: ExpenseDraft }>('/api/transactions/expense-draft', {
      method: 'POST',
      body: JSON.stringify({ text }),
      signal,
    }),
  askLedger: (query: LedgerRequest, signal: AbortSignal) =>
    authFetch<LedgerResponse>('/api/ledger/ask', {
      method: 'POST',
      body: JSON.stringify({ ...query, record_queries: true, assistant_v2: true }),
      signal,
    }),
  searchApp: (keyword: string, signal: AbortSignal) =>
    authFetch<{ results: AppSearchRecord[] }>('/api/app/search', {
      method: 'POST',
      body: JSON.stringify({ keyword }),
      signal,
    }),
  getTransaction: (id: number, signal?: AbortSignal) => authFetch(`/api/transactions/${id}`, { signal }),
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

  deleteExpenseImage: async (url: string, txId: number) =>
    authFetch('/api/expenses/images', { method: 'DELETE', body: JSON.stringify({ url, transaction_id: txId }) }),

  getPartners: () => authFetch('/api/partners'),
  getDividends: () => authFetch('/api/dividends'),
  previewDividend: (total: string, signal?: AbortSignal) =>
    postWrite<DividendPreview>('/api/dividends/preview', { total }, undefined, signal),
  createDividend: (data: unknown, key?: string) => postWrite<DividendPreview>('/api/dividends', data, key),
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
  verifyPassword: (password: string) =>
    authFetch('/api/profile/verify-password', { method: 'POST', body: JSON.stringify({ password }) }),
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
  addPlatformFeeEntry: (data: unknown, key?: string) => postWrite('/api/platform-fees/entry', data, key),
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
    check: (signal?: AbortSignal) => authFetch<{ is_admin: boolean }>('/api/admin/check', { signal }),
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
  getInvoiceEmail: () => authFetch('/api/invoice-email'),
  saveInvoiceEmail: (email: string) => authFetch('/api/invoice-email', { method: 'PUT', body: JSON.stringify({ email }) }),
  bankLookup: (prefix: string) => authFetch(`/api/bank-lookup?prefix=${encodeURIComponent(prefix)}`),

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
  createProcurementBatch: (data: unknown, key?: string) => postWrite('/api/procurement-batches', data, key),
  getProcurementBatchDetail: (id: number, signal?: AbortSignal) => authFetch(`/api/procurement-batches/${id}`, { signal }),
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
    const resp = await fetch(API_BASE + `/api/invoice-records/${id}/file`, {
      method: 'POST',
      headers: headers(),
      body: form,
      credentials: 'include' as RequestCredentials,
    });
    if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
    return resp.json() as Promise<{ status: string; file_path: string; thumb_path?: string; file_type: string; file_size: number }>;
  },
  getInvoiceFileUrl: (filePath: string, thumb?: boolean) => {
    if (thumb) {
      const base = filePath.replace(/\.[^.]+$/, '');
      return `${API_BASE}/api/invoice-files/${base}_thumb.jpg`;
    }
    return `${API_BASE}/api/invoice-files/${filePath}`;
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

// ── 开票完成回调（Procurement 进货记录列表局部刷新） ──
let _invoiceDoneHandler: ((batchId: number) => void) | null = null;
export function setInvoiceDoneHandler(fn: ((batchId: number) => void) | null) {
  _invoiceDoneHandler = fn;
}
export async function notifyInvoiceDone(batchId: number) {
  _invoiceDoneHandler?.(batchId);
}
