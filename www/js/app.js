/**
 * Snail Books iOS App — Main Application Logic
 * SPA with hash routing: #login, #bills, #partner
 */

// ═══════════════════════════════════════════
// 1. ROUTER & PAGE MANAGEMENT
// ═══════════════════════════════════════════

var currentHash = '';

function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRoute() {
  var hash = window.location.hash || '#login';
  if (hash === currentHash) return;
  currentHash = hash;

  // Hide all pages
  document.querySelectorAll('[id^="page-"]').forEach(function(el) { el.style.display = 'none'; });

  if (hash === '#login') {
    document.getElementById('page-login').style.display = 'block';
    var bw = document.querySelector('.bg-wrapper'); if (bw) bw.style.display = '';
    var bo = document.querySelector('.bg-overlay'); if (bo) bo.style.display = '';
    refreshLoginLang();
    var saved = localStorage.getItem('saved_login');
    if (saved) { document.getElementById('login-username').value = saved; }
  } else if (hash === '#bills' || hash === '') {
    document.getElementById('page-main').style.display = 'block';
    document.getElementById('bottom-nav').style.display = '';
    refreshMainLang();
    loadData();
  } else if (hash === '#partner') {
    document.getElementById('page-partner').style.display = 'block';
    document.getElementById('bottom-nav').style.display = 'none';
    // Ensure login bg elements are hidden (WKWebView may not hide fixed children of display:none)
    var bw = document.querySelector('.bg-wrapper'); if (bw) bw.style.display = 'none';
    var bo = document.querySelector('.bg-overlay'); if (bo) bo.style.display = 'none';
    refreshPartnerLang();
    loadPartners();
  }
}

window.addEventListener('hashchange', handleRoute);

// ═══════════════════════════════════════════
// 2. I18N HELPERS
// ═══════════════════════════════════════════

function t(key) { return (window.I18N && window.I18N[window.curLang || 'zh-CN'] && window.I18N[window.curLang || 'zh-CN'][key]) || key; }

function refreshLoginLang() {
  var els = {
    'login-subtitle': 'subtitle', 'tab-login': 'tabLogin', 'tab-register': 'tabRegister',
    'lbl-username': 'labelUsername', 'lbl-password': 'labelPassword',
    'btn-login': 'btnLogin', 'forgot-pw-link': 'forgotPw',
    'lbl-reg-username': 'labelUsername', 'lbl-email': 'labelEmail',
    'lbl-reg-pw': 'labelPassword', 'pw-hint': 'pwHint', 'lbl-password2': 'labelPassword2',
    'btn-register': 'btnRegister', 'verify-sent': 'verifySent',
    'lbl-code': 'labelCode', 'btn-verify': 'btnVerify', 'resend-btn': 'resendCode',
    'forgot-title': 'forgotTitle', 'forgot-hint': 'forgotHint', 'lbl-email-reg': 'labelEmailReg',
    'btn-send-code': 'btnSendCode', 'back-login-link': 'backLogin',
    'forgot-title2': 'forgotTitle2', 'verify-sent2': 'verifySent',
    'lbl-code2': 'labelCode', 'lbl-new-pw': 'labelNewPw', 'pw-hint2': 'pwHint',
    'lbl-new-pw2': 'labelNewPw2', 'btn-reset-pw': 'btnResetPw',
    'forgot-resend-btn': 'resendCode', 'login-footer': 'footer'
  };
  Object.keys(els).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = t(els[id]);
  });
  // Placeholders
  ['login-username','reg-username','reg-email','login-password','reg-password','reg-password2','forgot-email','verify-code','forgot-code','forgot-new-password','forgot-new-password2'].forEach(function(id) {
    var el = document.getElementById(id);
    var key = id.replace('login-','').replace('reg-','').replace('forgot-','');
    var phKeys = {
      'username': 'phUsername', 'email': 'phEmail', 'password': 'phPassword',
      'password2': 'phPassword2', 'code': 'phCode', 'new-password': 'phPasswordReg', 'new-password2': 'phPassword2'
    };
    if (el && phKeys[key]) el.placeholder = t(phKeys[key]);
  });
}

function refreshMainLang() {
  document.getElementById('app-title').textContent = t('appTitle');
  document.getElementById('today-label').textContent = new Date().toLocaleDateString(window.curLang==='en'?'en-US':window.curLang==='zh-TW'?'zh-TW':'zh-CN',{month:'long',day:'numeric',weekday:'short'});
  document.getElementById('lbl-income').textContent = t('income');
  document.getElementById('lbl-expense').textContent = t('expense');
  document.getElementById('lbl-profit').textContent = t('profit');
  document.getElementById('lbl-procurement').textContent = t('procurement');
  document.getElementById('type-income').textContent = t('income');
  document.getElementById('type-expense').textContent = t('expense');
  document.getElementById('submit-btn').textContent = t('save');
  document.getElementById('lbl-trend-title').textContent = t('trend12Month');

  // Tabs
  var tabs = document.getElementById('main-tabs');
  tabs.innerHTML = '';
  ['tabBills','tabRecord','tabSupply','tabTrends'].forEach(function(key, i) {
    var div = document.createElement('div');
    div.className = 'tab' + (i === 0 ? ' active' : '');
    div.id = 'tab-' + ['list','add','supply','chart'][i];
    div.textContent = t(key);
    div.onclick = function() { switchTab(['list','add','supply','chart'][i]); };
    tabs.appendChild(div);
  });

  // Bottom nav
  var nav = document.getElementById('bottom-nav');
  var navItems = [
    {key:'tabBills', label:'bills'},
    {key:'tabRecord', label:'record'},
    {key:'tabSupply', label:'supply'},
    {key:'tabTrends', label:'chart'},
    {key:'navPartner', label:'partner'}
  ];
  nav.innerHTML = navItems.map(function(item, i) {
    var icons = ['list','plus-circle','package','bar-chart-2','users'];
    return '<button class="nav-item'+(i===0?' active':'')+'" onclick="'+(item.label==='partner'?"navigateTo('#partner')":"switchTab('"+{bills:'list',record:'add',supply:'supply',chart:'chart'}[item.label]+"')")+'"><svg class="nav-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+getNavIcon(icons[i])+'</svg><span>'+t(item.key)+'</span></button>';
  }).join('');

  updateCats('income');
  loadSupplyTab();
}

function getNavIcon(name) {
  var icons = {
    'list': '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    'plus-circle': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
    'package': '<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>',
    'bar-chart-2': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
  };
  return icons[name] || '';
}

function refreshPartnerLang() {
  var els = {
    'back-home': 'backHome', 'partner-title': 'partnerTitle',
    'lbl-total-capital': 'totalCapital', 'paid-in-rate': 'paidInRate',
    'lbl-distributed-pool': 'distributedPool', 'cumulative-by-share': 'cumulativeByShare',
    'btn-issue-dividend': 'issueDividend', 'lbl-partner-seats': 'partnerSeats',
    'shareholders': 'shareholders', 'lp-structure': 'lpStructure',
    'lbl-ledger': 'capitalLedger', 'by-round': 'byRoundAndInvest',
    'modal-div-title': 'issueProportional', 'modal-div-sub': 'autoByShare',
    'lbl-div-amount': 'totalToPool', 'lbl-div-note': 'roundNote',
    'lbl-share-calc': 'shareCalcResult', 'btn-cancel-div': 'cancel', 'btn-confirm-div': 'confirmIssue',
    'lbl-confirm-del': 'confirmDeleteRecord', 'lbl-irreversible': 'irreversible',
    'will-delete': 'willDelete', 'all-div-records': 'allDividendRecords',
    'btn-cancel-del': 'cancel', 'btn-confirm-del': 'confirmDeleteRecord',
    'lbl-share-percent': 'sharePercent', 'lbl-total-invest': 'totalInvest',
    'lbl-total-divs': 'totalDividends', 'lbl-init-invest': 'initialInvest',
    'lbl-additional': 'additional', 'lbl-payback-progress': 'paybackProgress',
    'lbl-div-history': 'dividendHistory', 'lbl-org-title': 'partnerStructure', 'lbl-org-sub': 'lpControl'
  };
  Object.keys(els).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = t(els[id]);
  });
  // Language switcher
  var langBtns = document.getElementById('partner-lang-btns');
  if (langBtns) {
    var curLang = window.curLang || 'zh-CN';
    var langs = [['zh-CN','简'],['zh-TW','繁'],['en','EN']];
    langBtns.innerHTML = langs.map(function(l) {
      return '<span class="lang-btn-dark'+(curLang===l[0]?' active':'')+'" data-lang="'+l[0]+'" onclick="setLang(\''+l[0]+'\')">'+l[1]+'</span>';
    }).join('');
  }
  // Ledger filters
  var filters = document.getElementById('ledger-filters');
  if (filters) {
    filters.innerHTML = ['all','invest','additional','dividend'].map(function(f) {
      return '<button class="px-3 py-1.5 rounded-full text-[10px] font-medium '+(f==='all'?'bg-gray-800 text-white font-bold':'bg-gray-100 text-gray-500')+'" onclick="filterLedger(\''+f+'\')">'+t(f)+'</button>';
    }).join('');
  }
}

// ═══════════════════════════════════════════
// 3. AUTH: LOGIN / REGISTER / FORGOT PASSWORD
// ═══════════════════════════════════════════

var isLogin = true;
var pendingEmail = '';
var forgotEmail = '';
var resendCooldown = false;

function hideAll() {
  ['login-fields','register-fields','verify-fields','forgot-step1','forgot-step2'].forEach(function(id) {
    document.getElementById(id).style.display = 'none';
  });
  hideError();
}

function showTabs(show) {
  document.getElementById('tabs-row').style.display = show ? '' : 'none';
  document.getElementById('divider-row').style.display = show ? '' : 'none';
}

function switchLoginMode(login) {
  isLogin = login;
  hideAll(); showTabs(true);
  document.getElementById('login-fields').style.display = !login ? 'none' : 'block';
  document.getElementById('register-fields').style.display = login ? 'none' : 'block';
  document.getElementById('tab-login').className = 'flex-1 py-2 text-[12px] font-medium rounded-lg transition-all ' + (login ? 'tab-active' : 'tab-inactive');
  document.getElementById('tab-register').className = 'flex-1 py-2 text-[12px] font-medium rounded-lg transition-all ' + (!login ? 'tab-active' : 'tab-inactive');
}

function backToLogin() { hideAll(); showTabs(true); document.getElementById('login-fields').style.display = 'block'; }
function showForgotStep1() { hideAll(); showTabs(false); document.getElementById('forgot-step1').style.display = 'block'; document.getElementById('forgot-email').focus(); }
function showForgotStep2(email) { hideAll(); showTabs(false); forgotEmail = email; document.getElementById('forgot-step2').style.display = 'block'; document.getElementById('forgot-email-text').textContent = email; ['forgot-code','forgot-new-password','forgot-new-password2'].forEach(function(id){document.getElementById(id).value='';}); document.getElementById('forgot-code').focus(); }

function showError(msg) {
  var el = document.getElementById('error-msg');
  el.textContent = msg; el.style.display = 'block';
  el.className = 'text-[11px] rounded-xl px-4 py-3 font-medium bg-[#FEF2F2]/90 text-[#991B1B]';
  document.getElementById('form-box').classList.add('shake');
  setTimeout(function() { document.getElementById('form-box').classList.remove('shake'); }, 400);
}
function showSuccess(msg) {
  var el = document.getElementById('error-msg');
  el.textContent = msg; el.style.display = 'block';
  el.className = 'text-[11px] rounded-xl px-4 py-3 font-medium bg-[#F0FDF4]/90 text-[#166534]';
}
function hideError() { document.getElementById('error-msg').style.display = 'none'; }

function showVerifyStep(email) {
  hideError(); hideAll(); showTabs(false);
  document.getElementById('verify-fields').style.display = 'block';
  document.getElementById('verify-email-text').textContent = email;
  document.getElementById('verify-code').value = '';
  document.getElementById('verify-code').focus();
}

async function doLogin() {
  hideError();
  var u = document.getElementById('login-username').value.trim();
  var p = document.getElementById('login-password').value;
  if (!u || !p) return showError(t('errEmpty'));
  try {
    var result = await API.login(u, p);
    if (result.ok) {
      localStorage.setItem('saved_login', u);
      var redir = localStorage.getItem('redirect_after_login') || '#bills';
      localStorage.removeItem('redirect_after_login');
      navigateTo(redir);
    } else if (result.data && result.data.need_verify) {
      pendingEmail = result.data.email;
      ['reg-username','reg-password','reg-password2'].forEach(function(id) { document.getElementById(id).value = ''; });
      document.getElementById('reg-username').value = u;
      document.getElementById('reg-password').value = p;
      document.getElementById('reg-password2').value = p;
      showVerifyStep(result.data.email);
    } else {
      showError(result.data.message || t('errLoginFailed'));
    }
  } catch(e) {
    showError(e.message);
  }
}

async function doRegister() {
  hideError();
  var u = document.getElementById('reg-username').value.trim();
  var e = document.getElementById('reg-email').value.trim();
  var p = document.getElementById('reg-password').value;
  var p2 = document.getElementById('reg-password2').value;
  if (!u || !e || !p) return showError(t('errEmptyAll'));
  if (p.length < 6) return showError(t('errPwLen'));
  if (!/[A-Za-z]/.test(p)) return showError(t('errPwLetter'));
  if (!/[0-9]/.test(p)) return showError(t('errPwNum'));
  if (p !== p2) return showError(t('errPwMismatch'));

  var result = await API.register(u, p, e);
  if (result.ok) { pendingEmail = e; showVerifyStep(e); }
  else showError(result.data.message || t('errRegFailed'));
}

async function doVerify() {
  hideError();
  var c = document.getElementById('verify-code').value.trim();
  if (!c) return showError(t('errEmptyCode'));
  if (c.length !== 6) return showError(t('errCodeLen'));

  var result = await API.verify(pendingEmail, c);
  if (result.ok) {
    hideAll(); showTabs(true);
    document.getElementById('login-fields').style.display = 'block';
    document.getElementById('tab-login').className = 'flex-1 py-2 text-[12px] font-medium rounded-lg transition-all tab-active';
    document.getElementById('tab-register').className = 'flex-1 py-2 text-[12px] font-medium rounded-lg transition-all tab-inactive';
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
    showSuccess(t('verifyOk'));
  } else {
    showError(result.data.message || t('errVerifyFailed'));
  }
}

async function doResend(type) {
  hideError();
  var btnId = type === 'forgot' ? 'forgot-resend-btn' : 'resend-btn';
  var btn = document.getElementById(btnId);
  if (resendCooldown) return;
  resendCooldown = true;
  btn.textContent = t('sending'); btn.disabled = true;
  var email = type === 'forgot' ? forgotEmail : pendingEmail;
  var fn = type === 'forgot' ? API.forgotPassword : API.resendCode;
  var result = await fn(email);
  if (result.ok) showSuccess(t('resentOk'));
  else showError(result.data.message || t('errSendFailed'));
  btn.textContent = t('resendCode');
  setTimeout(function() { btn.disabled = false; resendCooldown = false; }, 30000);
}

async function doForgotSend() {
  hideError();
  var e = document.getElementById('forgot-email').value.trim();
  if (!e) return showError(t('errEmptyEmail'));
  var result = await API.forgotPassword(e);
  if (result.ok) showForgotStep2(e);
  else showError(result.data.message || t('errSendFailed'));
}

async function doResetPassword() {
  hideError();
  var c = document.getElementById('forgot-code').value.trim();
  var p = document.getElementById('forgot-new-password').value;
  var p2 = document.getElementById('forgot-new-password2').value;
  if (!c || !p || !p2) return showError(t('errEmptyAll'));
  if (c.length !== 6) return showError(t('errCodeLen'));
  if (p.length < 6) return showError(t('errPwLen'));
  if (!/[A-Za-z]/.test(p)) return showError(t('errPwLetter'));
  if (!/[0-9]/.test(p)) return showError(t('errPwNum'));
  if (p !== p2) return showError(t('errPwMismatch'));

  var result = await API.resetPassword(forgotEmail, c, p);
  if (result.ok) { backToLogin(); showSuccess(t('resetOk')); }
  else showError(result.data.message || t('errResetFailed'));
}

// ═══════════════════════════════════════════
// 4. MAIN APP: BILLS / RECORD / SUPPLY / CHART
// ═══════════════════════════════════════════

var currentPage = 1;
var products = [];
var currentTab = 'list';
var tabsList = ['list', 'add', 'supply', 'chart'];

// Categories
var INCOME_CATS = ['🍜 堂食', '🛵 美团外卖', '🛵 饿了吗外卖', '🎫 美团团购', '📦 京东', '🔧 其他收入'];
var EXPENSE_CATS = ['📦 原材料进货', '🏠 房租', '⚡ 水电煤气', '👨‍🍳 人工工资', '🔧 设备/工具', '🏗️ 装修', '📋 培训/证件', '🧹 卫生/清洁', '🧻 餐具/纸巾', '📦 包装/打包', '📢 广告/推广', '💊 杂项/烟酒', '📝 其他'];
var ACCOUNTS = ['💚 微信收款', '💙 支付宝收款', '💵 现金', '🏦 银行卡'];

var CAT_KEY_MAP = {
  '🍜 堂食':'catDineIn','🛵 美团外卖':'catMeituan','🛵 饿了吗外卖':'catEleme','🎫 美团团购':'catMeituanGroup','📦 京东':'catJD','🔧 其他收入':'catOtherIncome',
  '📦 原材料进货':'catRawMaterials','🏠 房租':'catRent','⚡ 水电煤气':'catUtilities','👨‍🍳 人工工资':'catLabor','🔧 设备/工具':'catEquipment',
  '🏗️ 装修':'catRenovation','📋 培训/证件':'catTraining','🧹 卫生/清洁':'catCleaning','🧻 餐具/纸巾':'catTableware','📦 包装/打包':'catPackaging',
  '📢 广告/推广':'catAdvertising','💊 杂项/烟酒':'catMisc','📝 其他':'catOther'
};

function trCat(raw) { return t(CAT_KEY_MAP[raw]) || raw; }

function updateCats(type) {
  var sel = document.getElementById('form-category');
  if (!sel) return;
  var cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  sel.innerHTML = cats.map(function(c) { return '<option>' + trCat(c) + '</option>'; }).join('');
  // Accounts
  var acc = document.getElementById('form-account');
  if (acc) acc.innerHTML = ACCOUNTS.map(function(a) { return '<option>' + a + '</option>'; }).join('');
}

function setType(type) {
  document.getElementById('form-type').value = type;
  document.getElementById('type-income').className = 'type-btn' + (type === 'income' ? ' active inc' : '');
  document.getElementById('type-expense').className = 'type-btn' + (type === 'expense' ? ' active exp' : '');
  document.getElementById('submit-btn').style.background = type === 'income' ? '#059669' : '#DC2626';
  updateCats(type);
}

async function loadData() {
  try {
    var r = await API.getSummary();
    if (!r.ok) return;
    var s = r.data;
    document.getElementById('today-income').textContent = '¥' + (s.today && s.today.income ? s.today.income.toFixed(2) : '0.00');
    document.getElementById('today-expense').textContent = '¥' + (s.today && s.today.expense ? s.today.expense.toFixed(2) : '0.00');
    document.getElementById('today-profit').textContent = '¥' + (s.today && s.today.profit ? s.today.profit.toFixed(2) : '0.00');
    document.getElementById('month-income-sub').textContent = (t('monthPrefix')||'月') + '¥' + (s.month && s.month.income ? s.month.income.toFixed(2) : '0.00');
    document.getElementById('month-expense-sub').textContent = (t('monthPrefix')||'月') + '¥' + (s.month && s.month.expense ? s.month.expense.toFixed(2) : '0.00');
    document.getElementById('month-profit-sub').textContent = (t('monthPrefix')||'月') + '¥' + (s.month && s.month.profit ? s.month.profit.toFixed(2) : '0.00');
    document.getElementById('month-procurement').textContent = '¥' + (s.month && s.month.procurement ? s.month.procurement.toFixed(2) : '0.00');
    loadTransactions();
  } catch(e) { console.error('loadData error:', e); }
}

async function loadTransactions(page) {
  if (page) currentPage = page; else page = currentPage;
  try {
    var r = await API.getTransactions(currentPage);
    if (!r.ok) return;
    var d = r.data;
    var list = document.getElementById('transaction-list');
    list.innerHTML = d.transactions && d.transactions.length
      ? d.transactions.map(function(tx) {
          return '<div class="tx-row"><div class="tx-dot '+tx.type+'"></div><div class="flex-1 min-w-0"><div class="text-sm font-medium truncate">'+trCat(tx.category)+'</div><div class="text-xs mt-0.5" style="color:#bbb">'+tx.account+(tx.note?' · '+tx.note:'')+'</div></div><div class="text-right shrink-0"><div class="text-sm font-semibold '+(tx.type==='income'?'text-emerald-700':'text-red-600')+'">'+(tx.type==='income'?'+':'-')+'¥'+tx.amount.toFixed(2)+'</div><div class="text-xs mt-0.5" style="color:#ddd">'+(tx.created_at||'').slice(5,16)+'</div></div></div>';
        }).join('')
      : '<div class="text-center py-12" style="color:#ccc">'+t('noRecords')+'</div>';
    var pag = document.getElementById('pagination');
    if (d.pages > 1) {
      pag.innerHTML = '<button onclick="loadTransactions('+(d.page-1)+')" '+(d.page<=1?'disabled':'')+' style="color:'+(d.page<=1?'#ddd':'#1A1A1A')+';font-size:13px">‹ '+t('prevPage')+'</button><span style="color:#999;font-size:12px">'+d.page+'/'+d.pages+'</span><button onclick="loadTransactions('+(d.page+1)+')" '+(d.page>=d.pages?'disabled':'')+' style="color:'+(d.page>=d.pages?'#ddd':'#1A1A1A')+';font-size:13px">'+t('nextPage')+' ›</button>';
    } else pag.innerHTML = '';
  } catch(e) { console.error(e); }
}

async function addTx(e) {
  e.preventDefault();
  var fd = new FormData(e.target);
  var d = {type: fd.get('tx-type'), amount: parseFloat(fd.get('amount')), category: fd.get('category'), account: fd.get('account'), note: fd.get('note')||''};
  if (!d.amount || d.amount <= 0) return;
  await API.addTransaction(d);
  e.target.reset(); document.getElementById('form-type').value = 'income'; setType('income');
  loadData(); switchTab('list');
}

// Supply chain
function loadSupplyTab() {
  var tab = document.getElementById('tab-supply');
  tab.innerHTML = '<div class="card mb-3"><div class="text-[13px] font-semibold mb-3"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> <span>'+t('quickProcure')+'</span></div>'+
    '<form onsubmit="quickProcurement(event)"><div class="mb-3"><select name="pid" class="input" id="proc-product" onchange="updateProcPrice()" required><option value="">'+t('selectProduct')+'</option></select></div>'+
    '<div class="mb-3"><input type="number" name="qty" class="input" placeholder="'+t('procureQuantity')+'" step="1" min="1" required id="proc-qty" onchange="updateProcPrice()"></div>'+
    '<div class="mb-3 flex items-center gap-2"><input type="number" name="price" class="input" placeholder="'+t('unitPrice')+'" step="0.01" id="proc-price" style="flex:1" required><span style="font-size:24px;font-weight:700;min-width:80px;text-align:right" id="proc-total">¥0</span></div>'+
    '<button type="submit" class="btn btn-primary">'+t('confirmProcure')+'</button></form></div>'+
    '<div class="flex justify-between items-center mb-2"><span class="text-[13px] font-medium text-gray-500">'+t('productCatalog')+'</span><button class="btn btn-sm btn-outline" onclick="openProductForm()">'+t('addProduct')+'</button></div>'+
    '<div class="card overflow-hidden mb-4"><div id="product-list" style="max-height:45vh;overflow-y:auto"></div></div>'+
    '<div class="text-[13px] font-medium text-gray-500 mb-2 mt-4">'+t('recentProcure')+'</div><div id="procurement-list"></div>';
}

async function loadProducts() {
  try {
    var r = await API.getProducts();
    if (!r.ok) return;
    products = r.data;
    var sel = document.getElementById('proc-product');
    if (sel) {
      sel.innerHTML = '<option value="">'+t('selectProduct')+'</option>' + products.map(function(p) { return '<option value="'+p.id+'" data-price="'+p.price+'" data-name="'+translateName(p.name)+' '+p.spec+'">'+translateName(p.name)+' '+p.spec+' · ¥'+p.price+'/'+(p.unit||'件')+'</option>'; }).join('');
    }
    renderProductList();
  } catch(e) { console.error(e); }
}

function renderProductList() {
  var grouped = {};
  products.forEach(function(p) { (grouped[p.name] = grouped[p.name] || []).push(p); });
  var list = document.getElementById('product-list');
  if (!list) return;
  list.innerHTML = Object.entries(grouped).map(function(entry) {
    var name = entry[0], items = entry[1];
    return '<div style="padding:8px 12px;background:#FAFAFA;border-bottom:1px solid #F0F0F0;font-size:12px;font-weight:600;color:#999">'+name+'</div>' +
      items.map(function(p) { return '<div class="tx-row" style="padding:10px 12px;cursor:pointer" onclick="openProductForm('+p.id+')"><div class="flex-1 min-w-0"><div class="text-sm">'+(p.spec||p.name)+'</div><div class="text-xs mt-0.5" style="color:#bbb">'+(p.unit||'')+(p.note?' · '+p.note:'')+'</div></div><div class="font-semibold text-sm">¥'+p.price.toFixed(2)+'</div></div>'; }).join('');
  }).join('') || '<div class="text-center py-8" style="color:#ccc">'+t('noProducts')+'</div>';
}

function updateProcPrice() {
  var sel = document.getElementById('proc-product');
  var opt = sel && sel.selectedOptions[0];
  if (opt && opt.dataset.price) document.getElementById('proc-price').value = opt.dataset.price;
  var qty = parseFloat(document.getElementById('proc-qty').value) || 0;
  var price = parseFloat(document.getElementById('proc-price').value) || 0;
  document.getElementById('proc-total').textContent = '¥' + (qty * price).toFixed(2);
}

async function quickProcurement(e) {
  e.preventDefault();
  var pid = parseInt(document.getElementById('proc-product').value);
  var qty = parseInt(document.getElementById('proc-qty').value);
  var price = parseFloat(document.getElementById('proc-price').value);
  if (!pid || !qty || !price) return;
  var product = products.find(function(p) { return p.id === pid; });
  var total = qty * price;
  await API.addProcurement({ product_id: pid, product_name: product.name + ' ' + product.spec, quantity: qty, unit_price: price, total: total });
  e.target.reset(); document.getElementById('proc-total').textContent = '¥0';
  loadData(); loadProcurements();
}

async function loadProcurements() {
  try {
    var r = await API.getProcurements();
    if (!r.ok) return;
    var d = r.data;
    var list = document.getElementById('procurement-list');
    if (!list) return;
    list.innerHTML = d.length ? d.map(function(p) {
      return '<div class="tx-row"><div class="tx-dot expense"></div><div class="flex-1 min-w-0"><div class="text-sm truncate">'+p.product_name+'</div><div class="text-xs mt-0.5" style="color:#bbb">×'+p.quantity+' · ¥'+p.unit_price+'/件</div></div><div class="text-right shrink-0"><div class="text-sm font-semibold text-red-600">¥'+p.total.toFixed(2)+'</div><div class="text-xs mt-0.5" style="color:#ddd">'+(p.created_at||'').slice(5,16)+'</div></div></div>';
    }).join('') : '<div class="text-center py-6" style="color:#ccc">'+t('noProcurement')+'</div>';
  } catch(e) { console.error(e); }
}

// Product modal (simplified - use a simple prompt for now)
function openProductForm(pid) {
  // Simplified: just toggle add form
  var name = prompt(pid ? t('editProductTitle') : t('addProductTitle') + '\n' + t('productName'));
  if (!name) return;
  var spec = prompt(t('productSpec')) || '';
  var unit = prompt(t('productUnit')) || '件';
  var price = parseFloat(prompt(t('productPrice'))) || 0;
  if (!price) return;
  if (pid) {
    API.updateProduct({ id: pid, name: name, spec: spec, unit: unit, price: price }).then(loadProducts);
  } else {
    API.addProduct({ name: name, spec: spec, unit: unit, price: price }).then(loadProducts);
  }
}

// Chart
async function loadChart() {
  try {
    var r = await API.getChart();
    if (!r.ok || !r.data || !r.data.length) {
      document.getElementById('chart-bars').innerHTML = '<div class="text-center py-8" style="color:#ccc">'+t('noData')+'</div>';
      return;
    }
    var data = r.data;
    var max = Math.max.apply(null, data.map(function(d) { return Math.max(d.income, d.expense); })) || 1;
    document.getElementById('chart-bars').innerHTML = data.map(function(d) {
      return '<div class="bar-row"><div class="bar-label">'+d.month.slice(5)+'</div><div class="bar-wrap"><div class="bar-income" style="width:'+(d.income/max*100).toFixed(0)+'%"></div><div class="bar-expense" style="width:'+(d.expense/max*100).toFixed(0)+'%"></div></div><div style="font-size:9px;width:56px;flex-shrink:0"><span class="text-emerald-700 font-medium">+'+d.income.toFixed(0)+'</span> <span class="text-red-600 font-medium">-'+d.expense.toFixed(0)+'</span></div></div>';
    }).join('');
  } catch(e) { console.error(e); }
}

// Tab switching
function switchTab(tab) {
  currentTab = tab;
  tabsList.forEach(function(t, i) {
    var contentEl = document.getElementById('tab-' + (t === 'add' ? 'record' : t));
    if (contentEl) contentEl.style.display = t !== tab ? 'none' : 'block';
    var tabEl = document.getElementById('tab-' + t);
    if (tabEl) tabEl.classList.toggle('active', t === tab);
    var navItems = document.querySelectorAll('.nav-item');
    if (navItems[i]) navItems[i].classList.toggle('active', t === tab);
  });
  if (tab === 'chart') loadChart();
  if (tab === 'list') loadTransactions();
  if (tab === 'supply') { loadProducts(); loadProcurements(); }
}

// ═══════════════════════════════════════════
// 5. PARTNER PAGE
// ═══════════════════════════════════════════

var partnersData = [];
var dividendRounds = [];
var allGroups = [];

function getPartnerRole(name) {
  var roles = {'张安武': t('chairman'), '江宽': t('ceo'), '蓝柳富': t('janitor')};
  return roles[name] || t('partner');
}

function translateName(name) {
  var map = {'张安武': 'nameZhang', '江宽': 'nameJiang', '蓝柳富': 'nameLan'};
  return map[name] ? t(map[name]) : name;
}

function translateDividendNote(note) {
  var m = note.match(/^第(\d+)次分红 \((.+)\)$/);
  if (m) {
    return t('dividendRoundFmt').replace('{n}', m[1]).replace('{date}', m[2]);
  }
  return note;
}

async function loadPartners() {
  try {
    var r = await API.getPartners();
    if (!r.ok) return;
    partnersData = r.data;
    var totalDiv = partnersData.reduce(function(s, p) { return s + p.total_dividends; }, 0);
    document.getElementById('stat-dividends').textContent = '¥' + totalDiv.toLocaleString();

    document.getElementById('partner-cards').innerHTML = partnersData.map(function(p, i) {
      var pct = p.investment > 0 ? (p.total_dividends / p.investment * 100).toFixed(0) : 0;
      var rem = p.investment - p.total_dividends;
      var isBack = p.total_dividends >= p.investment;
      var initInvest = p.name === '张安武' ? 44200 : 42900;
      var midInvest = p.investment - initInvest;
      var role = getPartnerRole(p.name);
      return '<div onclick="showPartnerDetail('+i+')" class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2.5 cursor-pointer">'+
        '<div class="flex justify-between items-center"><div class="flex items-center gap-1.5"><h3 class="text-[13px] font-bold text-gray-800">'+translateName(p.name)+'</h3><span class="text-[10px] text-gray-400">'+(p.share*100).toFixed(0)+'%</span></div><span class="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">'+t('investComplete')+'</span></div>'+
        '<div class="grid grid-cols-3 gap-1 text-[10px]"><div class="text-center"><span class="text-gray-400 block">'+t('subscribedTotal')+'</span><span class="font-semibold text-gray-900 tabular-nums">¥'+p.investment.toLocaleString()+'</span></div><div class="text-center"><span class="text-gray-400 block">'+t('initial')+'</span><span class="font-semibold text-gray-700 tabular-nums">¥'+initInvest.toLocaleString()+'</span></div><div class="text-center"><span class="text-gray-400 block">'+t('additional')+'</span><span class="font-semibold text-gray-700 tabular-nums">¥'+midInvest.toLocaleString()+'</span></div></div>'+
        '<div class="flex justify-between text-[11px] pt-1.5 border-t border-gray-50"><span class="text-amber-700 font-medium">'+t('totalDividendsPaid')+'</span><span class="font-bold text-amber-600 tabular-nums">¥'+p.total_dividends.toLocaleString()+'</span></div>'+
        '<div class="flex justify-between text-[10px]"><span class="text-gray-400">'+t('paybackRate')+' '+pct+'%</span><span>'+(isBack?'<span class="text-emerald-500 font-medium">'+t('fullyPaidBack')+'</span>':'<span class="text-amber-500 font-medium">'+t('pendingPayback')+' ¥'+rem.toLocaleString()+'</span>')+'</span></div></div>';
    }).join('');
    await loadHistory();
  } catch(e) { if (e.message !== 'auth_required') console.error(e); }
}

function showPartnerDetail(index) {
  var p = partnersData[index];
  var role = getPartnerRole(p.name);
  var pct = p.investment > 0 ? (p.total_dividends / p.investment * 100).toFixed(0) : 0;
  var rem = p.investment - p.total_dividends;
  var isBack = p.total_dividends >= p.investment;
  var initInvest = p.name === '张安武' ? 44200 : 42900;
  var midInvest = p.investment - initInvest;

  document.getElementById('pdetail-name').textContent = translateName(p.name);
  document.getElementById('pdetail-role').textContent = role;
  document.getElementById('pdetail-share').textContent = (p.share*100).toFixed(0)+'%';
  document.getElementById('pdetail-total').textContent = '¥'+p.investment.toLocaleString();
  document.getElementById('pdetail-dividends').textContent = '¥'+p.total_dividends.toLocaleString();
  document.getElementById('pdetail-init').textContent = '¥'+initInvest.toLocaleString();
  document.getElementById('pdetail-mid').textContent = '¥'+midInvest.toLocaleString();
  document.getElementById('pdetail-pct').textContent = t('paybackRate')+' '+pct+'%';
  document.getElementById('pdetail-bar').style.width = Math.min(pct, 100)+'%';
  document.getElementById('pdetail-bar').className = 'h-full rounded-full transition-all duration-500 '+(isBack?'bg-emerald-500':'bg-amber-500');
  document.getElementById('pdetail-rem').innerHTML = isBack ? '<span class="text-emerald-500 font-medium">'+t('fullyPaidBackDetail')+'</span>' : '<span class="text-amber-500 font-medium">'+t('pendingPayback')+' ¥'+rem.toLocaleString()+'</span>';

  var history = [];
  dividendRounds.forEach(function(round) {
    round.forEach(function(d) { if (d.partner === p.name && d.amount > 0) history.push({note: translateDividendNote(d.note) || t('dividend'), amount: d.amount}); });
  });
  document.getElementById('pdetail-history').innerHTML = history.length ? history.map(function(h) {
    return '<div class="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-amber-50/40 text-[11px]"><span class="text-gray-600">'+h.note+'</span><span class="font-bold text-amber-600">¥'+h.amount.toLocaleString()+'</span></div>';
  }).join('') : '<div class="text-[10px] text-gray-400 text-center py-3">'+t('noDividendRecords')+'</div>';

  document.getElementById('partner-detail-modal').style.display = 'flex';
}

function closePartnerDetail() {
  document.getElementById('partner-detail-modal').style.display = 'none';
}

function showOrgChart() {
  document.getElementById('orgchart-content').innerHTML =
    '<div class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 w-full text-center mb-0"><div class="text-[13px] font-bold text-[#8B1E22]">'+t('nameZhang')+'</div><div class="text-[10px] text-gray-500 mt-0.5 font-bold">'+t('chairman')+' · 34%</div></div>'+
    '<div class="flex flex-col items-center -my-1"><div class="w-0.5 h-6 bg-gray-300"></div></div>'+
    '<div class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 w-full text-center"><div class="text-[13px] font-bold text-gray-800">'+t('nameJiang')+'</div><div class="text-[10px] text-gray-500 mt-0.5">'+t('ceo')+' · 33%</div></div>'+
    '<div class="flex flex-col items-center -my-1"><div class="w-0.5 h-6 bg-gray-300"></div></div>'+
    '<div class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 w-full text-center"><div class="text-[13px] font-bold text-gray-800">'+t('nameLan')+'</div><div class="text-[10px] text-gray-500 mt-0.5">'+t('janitor')+' · 33%</div></div>'+
    '<p class="text-[10px] text-gray-400 text-center mt-5 leading-relaxed font-semibold">'+t('jokeClosedLoop')+'</p>';
  document.getElementById('orgchart-modal').style.display = 'flex';
}

function closeOrgChart() {
  document.getElementById('orgchart-modal').style.display = 'none';
}

async function loadHistory() {
  allGroups = [];
  try {
    var r = await API.getDividends();
    if (!r.ok) return;
    var byNote = {};
    r.data.forEach(function(d) {
      var key = d.note || '__no_note__';
      if (!byNote[key]) byNote[key] = [];
      byNote[key].push(d);
    });
    dividendRounds = Object.values(byNote);

    allGroups.push({title: t('initialApr2024'), type: 'invest', items: [{name:t('nameZhang'),amount:44200,sub:'34%'},{name:t('nameLan'),amount:42900,sub:'33%'},{name:t('nameJiang'),amount:42900,sub:'33%'}], total: 130000});
    allGroups.push({title: t('additionalJan2025'), type: 'additional', items: [{name:t('nameZhang'),amount:10255.08,sub:'34%'},{name:t('nameLan'),amount:9953.46,sub:'33%'},{name:t('nameJiang'),amount:9953.46,sub:'33%'}], total: 30162});

    dividendRounds.forEach(function(items) {
      var sorted = items.slice().sort(function(a,b) { return b.amount - a.amount; });
      var total = items.reduce(function(s,d) { return s + d.amount; }, 0);
      allGroups.push({title: translateDividendNote(items[0].note) || t('dividend'), type: 'dividend', items: sorted.map(function(d) { return {name:translateName(d.partner), amount:d.amount, sub:''}; }), total: total, note: items[0].note});
    });
    filterLedger('all');
  } catch(e) { if (e.message !== 'auth_required') console.error(e); }
}

function filterLedger(filter) {
  var btns = document.querySelectorAll('#ledger-filters button');
  btns.forEach(function(b) { b.className = 'px-3 py-1.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 transition-all'; });
  var activeBtn = document.querySelector('#ledger-filters button[onclick*="'+filter+'"]');
  if (activeBtn) activeBtn.className = 'px-3 py-1.5 rounded-full text-[10px] font-bold bg-gray-800 text-white transition-all';

  var groups = filter === 'all' ? allGroups : allGroups.filter(function(g) { return g.type === filter; });
  renderLedger(groups);
}

function renderLedger(groups) {
  var colors = {
    invest: {dot:'bg-blue-500', headerBg:'bg-blue-50/60', typeText:'text-blue-600', amt:'text-gray-900'},
    additional: {dot:'bg-purple-500', headerBg:'bg-purple-50/60', typeText:'text-purple-600', amt:'text-gray-900'},
    dividend: {dot:'bg-amber-500', headerBg:'bg-amber-50/60', typeText:'text-amber-600', amt:'text-amber-600'}
  };

  // Desktop
  document.getElementById('ledger-desktop').innerHTML = groups.map(function(g) {
    var c = colors[g.type];
    var typeLabel = g.type === 'invest' ? t('invest') : (g.type === 'additional' ? t('additional') : t('dividend'));
    return '<div class="rounded-xl border border-gray-100 overflow-hidden mb-3 shadow-sm"><table class="w-full"><thead><tr class="'+c.headerBg+' border-b border-gray-100/80"><th class="text-left px-4 py-2.5 text-[12px] font-semibold text-gray-800">'+g.title+'</th><th class="text-center px-0 py-2.5 w-[2.5rem] text-[11px] '+c.typeText+' font-semibold">'+typeLabel+'</th><th class="text-right px-4 py-2.5 w-[6.5rem] text-xs font-bold '+c.amt+' tabular-nums tracking-tight">¥'+g.total.toLocaleString()+(g.type==='dividend'?'<button onclick="deleteRound(this)" data-note="'+g.note.replace(/"/g,'&quot;')+'" class="text-[10px] text-red-400 font-medium transition-colors ml-2 font-normal">'+t('deleteRecord')+'</button>':'')+'</th></tr></thead><tbody>'+g.items.map(function(d) { return '<tr class="border-t border-gray-50/80"><td class="px-4 py-2.5 text-xs font-medium text-gray-700">'+d.name+'</td><td class="text-center px-0 py-2.5 text-[11px] text-gray-400">'+d.sub+'</td><td class="text-right px-4 py-2.5 text-xs font-bold '+c.amt+' tabular-nums tracking-tight">¥'+d.amount.toLocaleString()+'</td></tr>'; }).join('')+'</tbody></table></div>';
  }).join('');

  // Mobile
  document.getElementById('ledger-mobile').innerHTML = groups.map(function(g) {
    var c = colors[g.type];
    return '<div class="px-4 py-3.5"><div class="flex items-center justify-between mb-2.5"><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full '+(g.type==='invest'?'bg-blue-500':g.type==='additional'?'bg-purple-500':'bg-amber-500')+'"></span><span class="text-[12px] font-semibold text-gray-800">'+g.title+'</span></div><div class="flex items-center gap-2"><span class="text-[11px] '+c.typeText+' font-semibold">¥'+g.total.toLocaleString()+'</span>'+(g.type==='dividend'?'<button onclick="deleteRound(this)" data-note="'+g.note.replace(/"/g,'&quot;')+'" class="text-[10px] text-red-400 font-medium">'+t('deleteRecord')+'</button>':'')+'</div></div><div class="space-y-1.5">'+g.items.map(function(d) { return '<div class="flex justify-between items-center py-1.5 px-2.5 rounded-lg '+(g.type==='invest'?'bg-blue-50/40':g.type==='additional'?'bg-purple-50/40':'bg-amber-50/40')+'"><span class="text-xs text-gray-600">'+d.name+(d.sub?' <span class="text-gray-400">· '+d.sub+'</span>':'')+'</span><span class="text-xs font-bold '+c.amt+' tabular-nums text-right">¥'+d.amount.toLocaleString()+'</span></div>'; }).join('')+'</div></div>';
  }).join('');
}

async function deleteRound(btn) {
  var note = btn.dataset.note;
  document.getElementById('delete-note').value = note;
  document.getElementById('delete-round-name').textContent = note;
  document.getElementById('delete-confirm-modal').style.display = 'flex';
}

function confirmDeleteRound() {
  var note = document.getElementById('delete-note').value;
  document.getElementById('delete-confirm-modal').style.display = 'none';
  // Delete all dividends with this note
  API.getDividends().then(function(r) {
    if (!r.ok) return;
    var toDelete = r.data.filter(function(d) { return d.note === note; });
    Promise.all(toDelete.map(function(d) {
      return API.call('DELETE', '/api/dividends/' + d.id);
    })).then(function() { loadPartners(); });
  });
}

function cancelDeleteRound() {
  document.getElementById('delete-confirm-modal').style.display = 'none';
}

function openDividendModal() {
  document.getElementById('dividend-modal').style.display = 'flex';
  document.getElementById('dividend-amount').value = '';
  document.getElementById('dividend-note').value = '';
  calcDividendPreview();
}

function closeDividendModal() {
  document.getElementById('dividend-modal').style.display = 'none';
}

function calcDividendPreview() {
  var amount = parseFloat(document.getElementById('dividend-amount').value) || 0;
  document.getElementById('dividend-preview').innerHTML = partnersData.map(function(p) {
    return '<div class="flex justify-between text-xs text-gray-600"><span>'+translateName(p.name)+' ('+(p.share*100).toFixed(0)+'%)</span><span class="font-medium text-gray-900">¥ '+(amount * p.share).toFixed(2)+'</span></div>';
  }).join('');
}

async function executeDividend() {
  var amount = parseFloat(document.getElementById('dividend-amount').value);
  var note = document.getElementById('dividend-note').value.trim() || t('dividend');
  if (!amount || amount <= 0) return;
  for (var i = 0; i < partnersData.length; i++) {
    var p = partnersData[i];
    var share = parseFloat((amount * p.share).toFixed(2));
    await API.addDividend({ partner: p.name, amount: share, note: note });
  }
  closeDividendModal();
  loadPartners();
}

// ═══════════════════════════════════════════
// 6. HOT UPDATE
// ═══════════════════════════════════════════

var pendingUpdateVersion = '';

async function checkForUpdate() {
  var result = await Updater.check();
  if (result.hasUpdate) {
    pendingUpdateVersion = result.version;
    document.getElementById('update-msg').textContent = t('updateAvailable') || 'New version available: v' + result.version;
    document.getElementById('update-dialog').style.display = 'flex';
    document.getElementById('update-dialog').style.display = 'flex';
  }
}

async function doUpdate() {
  document.getElementById('update-dialog').style.display = 'none';
  document.getElementById('update-dialog').style.display = 'none';
  var ok = await Updater.download(pendingUpdateVersion);
  if (ok) {
    // In a real app, reload the WebView
    if (window.location.reload) window.location.reload();
  }
}

function skipUpdate() {
  document.getElementById('update-dialog').style.display = 'none';
  document.getElementById('update-dialog').style.display = 'none';
}

// ═══════════════════════════════════════════
// 7. INITIALIZATION
// ═══════════════════════════════════════════

(function init() {
  // Clear any stale API base from localStorage (force default)
  API.setBase('http://8.135.58.90:8600');

  // Set initial hash
  if (!window.location.hash) window.location.hash = '#login';

  // Handle route
  handleRoute();

  // Auto-fill & auto-login on login page
  if (window.location.hash === '#login') {
    document.getElementById('login-username').value = 'Rowan Lan';
    document.getElementById('login-password').value = 'Lan123456';
  }

  // Check for updates — disabled during dev
  // setTimeout(checkForUpdate, 1000);

  // i18n change handler
  if (window.onLangChange) {
    window.onLangChange(function(lang) {
      if (currentHash === '#login') refreshLoginLang();
      else if (currentHash === '#bills' || currentHash === '') refreshMainLang();
      else if (currentHash === '#partner') { refreshPartnerLang(); loadPartners(); }
    });
  }
})();
