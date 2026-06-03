import { getLang } from '../i18n';

function getApiBase(): string {
  // Allow override via localStorage for development/testing
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('api_base');
    if (saved) return saved;
  }
  // React Native: Metro only serves the JS bundle, not the API. Point
  // directly at the Flask backend. Production server is 8.135.58.90:8601
  // (see snail-books-web/dist/index.html). Override at runtime via
  // localStorage.setItem('api_base', 'http://...') to test against
  // localhost or a LAN dev box.
  if (typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative') {
    return 'http://8.135.58.90:8601';
  }
  // Web / production: use relative URLs (same origin)
  return '';
}

const API_BASE = getApiBase();

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
    // Only check when user is logged in (has user in localStorage)
    if (!localStorage.getItem('user')) return;
    if (Date.now() - lastActivity > IDLE_MS) {
      localStorage.removeItem('user');
      // Notify App so it can re-route to login
      try { onSessionExpired?.(); } catch {}
    }
  }, 10_000); // check every 10s
}
startIdleTimer();

function bumpActivity() {
  lastActivity = Date.now();
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    'X-Lang': getLang(),
  };
  // Only set Content-Type for requests with a body (FormData sets its own)
  return h;
}

async function authFetch<T = any>(url: string, options?: RequestInit): Promise<T> {
  const mergedHeaders: Record<string, string> = {
    ...headers(),
    ...(options?.headers as Record<string, string> || {}),
  };
  // Auto-set Content-Type: application/json for requests with a JSON body
  if (options?.body && typeof options.body === 'string' && !mergedHeaders['Content-Type']) {
    mergedHeaders['Content-Type'] = 'application/json';
  }
  const resp = await fetch(API_BASE + url, {
    ...options,
    headers: mergedHeaders,
    // Backend uses Flask session cookies for auth. iOS sim is cross-origin
    // (Metro at localhost:8081, API at 8.135.58.90:8601) so the default
    // 'omit' credentials silently drops the session cookie — login would
    // "succeed" but every subsequent call would 401. 'include' makes RN
    // send + accept cookies cross-origin. Backend already returns
    // Access-Control-Allow-Credentials: true (see app.py add_cors_headers).
    credentials: 'include' as RequestCredentials,
  });
  if (resp.status === 401) {
    localStorage.removeItem('user');
    try { onSessionExpired?.(); } catch {}
    throw new Error('Unauthorized');
  }
  if (!resp.ok) {
    throw new Error(`API error: ${resp.status} ${resp.statusText}`);
  }
  bumpActivity();
  return resp.json();
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

  // Expense image upload — returns { images: [...], thumb_images: [...], has_thumbs: bool }
  // Accepts the { uri, type, name } shape from utils/imagePicker (or anything
  // with a web-compatible File shape) and forwards via RN FormData.
  uploadExpenseImages: async (files: Array<{ uri: string; type?: string; name?: string }>) => {
    bumpActivity();
    const form = new FormData();
    files.forEach(f => form.append('files', f as any));
    const resp = await fetch(API_BASE + '/api/expenses/upload-images', {
      method: 'POST',
      headers: headers(),  // Use shared headers() for consistency
      body: form,
      credentials: 'include' as RequestCredentials,
    });
    if (resp.status === 401) {
      localStorage.removeItem('user');
      try { onSessionExpired?.(); } catch {}
      throw new Error('Unauthorized');
    }
    if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
    bumpActivity();
    const data = await resp.json();
    return data as { status: 'ok'; images: string[]; thumb_images: string[]; has_thumbs: boolean };
  },

  getPartners: () => authFetch('/api/partners'),
  getDividends: () => authFetch('/api/dividends'),
  createDividend: (data: any) => authFetch('/api/dividends', { method: 'POST', body: JSON.stringify(data) }),
  deleteDividend: (id: number) => authFetch(`/api/dividends/${id}`, { method: 'DELETE' }),
  deleteDividendByNote: (note: string) => authFetch('/api/dividends/delete', { method: 'POST', body: JSON.stringify({ note }) }),

  // Background image
  getBackground: () => authFetch('/api/settings/background'),
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
  resetBackground: () => authFetch('/api/settings/background', { method: 'DELETE' }),
  saveBackgroundSettings: (data: any) => authFetch('/api/settings/background', { method: 'PUT', body: JSON.stringify(data) }),

  // Language preference (stored per-user in user_settings)
  getLang: () => authFetch('/api/settings/lang'),
  saveLang: (lang: string) => authFetch('/api/settings/lang', { method: 'PUT', body: JSON.stringify({ lang }) }),

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

  // Paginated reconciliation query — returns { records, total, pages, page, per_page }
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
  getProcurementStats: () => authFetch('/api/procurement-stats'),

  // Daily revenue (每日营收)
  getDailyRevenue: (page = 1, perPage = 30, year?: number, month?: number, date?: string, days?: number) => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('per_page', String(perPage));
    if (year) params.append('year', String(year));
    if (month) params.append('month', String(month));
    if (date) params.append('date', date);
    if (days) params.append('days', String(days));
    const qs = params.toString();
    return authFetch('/api/daily-revenue?' + qs);
  },
  createDailyRevenue: (data: any) => authFetch('/api/daily-revenue', { method: 'POST', body: JSON.stringify(data) }),
  updateDailyRevenue: (id: number, data: any) => authFetch(`/api/daily-revenue/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDailyRevenue: (id: number) => authFetch(`/api/daily-revenue/${id}`, { method: 'DELETE' }),
  getLast7Days: () => authFetch('/api/daily-revenue/last-7'),

  getChart: () => authFetch('/api/chart'),
  getStats: () => authFetch('/api/stats'),

  logout: async () => {
    // Backend implements POST /logout (Flask @app.route('/logout', methods=['POST'])).
    // credentials: 'include' so the server can actually clear the session cookie.
    // Best-effort: if the network call fails, still clear the local marker.
    try { await fetch(API_BASE + '/logout', { method: 'POST', credentials: 'include' as RequestCredentials }); } catch {}
    localStorage.removeItem('user');
  },
};
