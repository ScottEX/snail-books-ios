/**
 * Snail Books iOS App — API Client
 * Uses CapacitorHttp (native HTTP, bypasses WKWebView CORS)
 */
var API = (function() {
  'use strict';

  var BASE_URL = localStorage.getItem('api_base') || 'http://8.135.58.90:8600';

  function setBase(url) { BASE_URL = url; localStorage.setItem('api_base', url); }
  function getBase() { return BASE_URL; }

  function getToken() { return localStorage.getItem('auth_token'); }
  function setToken(t) { localStorage.setItem('auth_token', t); }
  function clearToken() { localStorage.removeItem('auth_token'); }
  function isLoggedIn() { return !!getToken(); }

  async function call(method, path, body) {
    var url = BASE_URL + path;
    var headers = {
      'Content-Type': 'application/json',
      'X-Lang': window.curLang || 'zh-CN'
    };
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    var opts = {
      method: method,
      url: url,
      headers: headers,
      connectTimeout: 10000,
      readTimeout: 10000
    };
    if (body) opts.data = body;

    try {
      // Use Capacitor native HTTP if available, fallback to XHR
      var r;
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp) {
        r = await window.Capacitor.Plugins.CapacitorHttp.request(opts);
        var data = r.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch(e) { data = {}; }
        }
        if (r.status === 401 && !path.startsWith('/login') && !path.startsWith('/register')) {
          clearToken();
          localStorage.setItem('redirect_after_login', window.location.hash || '#bills');
          window.location.hash = '#login';
          throw new Error('auth_required');
        }
        return { ok: r.status >= 200 && r.status < 300, status: r.status, data: data };
      }
    } catch(e) {
      if (e.message === 'auth_required') throw e;
      console.log('CapacitorHttp failed, falling back to XHR:', e.message);
    }

    // Fallback: XHR
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('X-Lang', window.curLang || 'zh-CN');
      if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);

      xhr.onload = function() {
        var data;
        try { data = JSON.parse(xhr.responseText); } catch(e) { data = {}; }
        if (xhr.status === 401 && !path.startsWith('/login') && !path.startsWith('/register')) {
          clearToken();
          localStorage.setItem('redirect_after_login', window.location.hash || '#bills');
          window.location.hash = '#login';
          reject(new Error('auth_required'));
          return;
        }
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data: data });
      };
      xhr.onerror = function() { reject(new Error('Network error')); };
      xhr.timeout = 15000;
      xhr.ontimeout = function() { reject(new Error('Timeout')); };
      xhr.send(body ? JSON.stringify(body) : undefined);
    });
  }

  return {
    setBase: setBase, getBase: getBase,
    getToken: getToken, setToken: setToken, clearToken: clearToken, isLoggedIn: isLoggedIn,
    call: call,

    login: async function(username, password) {
      var result = await call('POST', '/login', {username: username, password: password});
      if (result.ok && result.data.token) {
        setToken(result.data.token);
      }
      return result;
    },

    register: async function(username, email, password) {
      return await call('POST', '/register', {username: username, email: email, password: password});
    },

    verify: async function(email, code) {
      return await call('POST', '/verify', {email: email, code: code});
    },

    forgotSendCode: async function(email) {
      return await call('POST', '/forgot-password', {email: email});
    },

    resetPassword: async function(email, code, password) {
      return await call('POST', '/reset-password', {email: email, code: code, password: password});
    },

    resendCode: async function(email) {
      return await call('POST', '/resend-code', {email: email});
    },

    getTransactions: function(params) { return call('GET', '/api/transactions' + (params || '')); },
    addTransaction: function(t) { return call('POST', '/api/transactions', t); },
    deleteTransaction: function(id) { return call('DELETE', '/api/transactions/' + id); },

    getSummary: function() { return call('GET', '/api/summary'); },
    getStats: function() { return call('GET', '/api/stats'); },

    getPartners: function() { return call('GET', '/api/partners'); },
    getDividends: function() { return call('GET', '/api/dividends'); },
    addDividend: function(item) { return call('POST', '/api/dividends', item); },

    getProducts: function() { return call('GET', '/api/products'); },
    addProduct: function(p) { return call('POST', '/api/products', p); },
    updateProduct: function(p) { return call('PUT', '/api/products', p); },
    deleteProduct: function(id) { return call('DELETE', '/api/products?id=' + id); },

    getProcurements: function() { return call('GET', '/api/procurements'); },
    addProcurement: function(p) { return call('POST', '/api/procurements', p); },

    getChart: function() { return call('GET', '/api/chart'); },
    getFrontendVersion: function() { return call('GET', '/api/frontend-version'); },
    getFrontendZip: function() { return BASE_URL + '/api/frontend.zip'; }
  };
})();
