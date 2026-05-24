/**
 * Snail Noodle Bookkeeping — i18n (plain global JS)
 * Shared across login.html, index.html, partner.html
 * No ES modules — loaded via <script src="/static/i18n.js"></script>
 */
(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // 1. TRANSLATION TABLES
  // ──────────────────────────────────────────────
  var I18N = {
    'zh-CN': {
      // ── COMMON ──
      appTitle: '不简单Life',
      appFooter: '蓝姐螺蛳粉',

      // ── LOGIN PAGE ──
      subtitle: '生活不简单，尽量简单过',
      tabLogin: '登录',
      tabRegister: '注册',
      labelUsername: '用户名',
      phUsername: '请输入用户名',
      phUsernameReg: '请设置用户名',
      labelPassword: '密码',
      phPassword: '请输入密码',
      phPassword2: '请再次输入密码',
      labelPassword2: '确认密码',
      phPasswordReg: '请设置密码',
      pwHint: '6-20位，需包含字母和数字',
      labelEmail: '邮箱',
      phEmail: '请输入邮箱地址',
      btnLogin: '登 录',
      btnRegister: '注 册',
      forgotPw: '忘记密码？',
      verifySent: '验证码已发送至您的邮箱',
      labelCode: '验证码',
      phCode: '请输入验证码',
      btnVerify: '验证并登录',
      resendCode: '重新发送',
      forgotTitle: '找回密码',
      forgotHint: '请输入注册邮箱，我们将发送验证码',
      labelEmailReg: '注册邮箱',
      phEmailReg: '请输入注册时使用的邮箱',
      btnSendCode: '发送验证码',
      backLogin: '去登录',
      forgotTitle2: '重置密码',
      labelNewPw: '新密码',
      labelNewPw2: '确认新密码',
      btnResetPw: '重置密码',
      footer: '蓝姐螺蛳粉',

      // ── ERRORS ──
      errEmpty: '请填写此字段',
      errEmptyAll: '请填写所有字段',
      errPwLen: '密码长度需为6-20位',
      errPwLetter: '密码需包含字母',
      errPwNum: '密码需包含数字',
      errPwMismatch: '两次密码输入不一致',
      errNet: '网络错误，请稍后重试',
      errCodeLen: '验证码为6位数字',
      errEmptyCode: '请输入验证码',
      errEmptyEmail: '请输入邮箱地址',
      errLoginFailed: '登录失败，请检查用户名和密码',
      errRegFailed: '注册失败，请稍后重试',
      errVerifyFailed: '验证失败，请检查验证码',
      errSendFailed: '发送验证码失败，请稍后重试',
      errResetFailed: '重置密码失败，请稍后重试',
  errSessionExpired: '登录已过期，请重新登录',

      // ── STATUS ──
      sending: '发送中...',
      resentOk: '验证码已重新发送',
      verifyOk: '验证成功，正在跳转...',
      resetOk: '密码重置成功，请重新登录',

      // ── INDEX PAGE ──
      income: '收入',
      expense: '支出',
      profit: '利润',
      procurement: '进货',
      monthPrefix: '月',
      tabBills: '账单',
      tabRecord: '记账',
      tabSupply: '供应链',
      tabTrends: '趋势',
      navPartner: '合伙人',
      notePlaceholder: '备注',
      save: '保存',
      noRecords: '暂无记录',
      prevPage: '上页',
      nextPage: '下页',
      quickProcure: '快速进货',
      selectProduct: '选择产品...',
      procureQuantity: '进货数量',
      unitPrice: '单价',
      confirmProcure: '确认进货',
      productCatalog: '产品目录',
      addProduct: '+ 添加',
      recentProcure: '最近进货',
      noProducts: '暂无产品',
      noProcurement: '暂无进货记录',
      addProductTitle: '添加产品',
      editProductTitle: '编辑产品',
      productName: '产品名称 *',
      productSpec: '规格型号',
      productUnit: '单位',
      productPrice: '单价 *',
      cancel: '取消',
      delete: '删除',
      confirmDelete: '确定删除？',
      pieceUnit: '件',
      trend12Month: '近 12 月收支趋势',
      noData: '暂无数据',
      note: '笔记',

      // ── CATEGORIES (INDEX) ──
      catDineIn: '🍜 堂食',
      catMeituan: '🛵 美团外卖',
      catEleme: '🛵 饿了吗外卖',
      catMeituanGroup: '🎫 美团团购',
      catJD: '📦 京东',
      catOtherIncome: '🔧 其他收入',
      catRawMaterials: '📦 原材料进货',
      catRent: '🏠 房租',
      catUtilities: '⚡ 水电煤气',
      catLabor: '👨‍🍳 人工工资',
      catEquipment: '🔧 设备/工具',
      catRenovation: '🏗️ 装修',
      catTraining: '📋 培训/证件',
      catCleaning: '🧹 卫生/清洁',
      catTableware: '🧻 餐具/纸巾',
      catPackaging: '📦 包装/打包',
      catAdvertising: '📢 广告/推广',
      catMisc: '💊 杂项/烟酒',
      catOther: '📝 其他',
      // ── INDEX PARTNER SECTION ──
      investDividendLabel: '投入/已分红',
      paybackLabel: '回本',
      dividendLabel: '分红',
      shareOf: '占比',

      // ── PARTNER PAGE ──
      backHome: '返回首页',
      partnerTitle: '蓝姐螺蛳粉合伙人资产',
      totalCapital: '合伙初始基金总额',
      paidInRate: '实缴率',
      distributedPool: '已派发分红池',
      cumulativeByShare: '累计派发 · 按比例分配',
      issueDividend: '发起分红',
      partnerSeats: '合伙席位',
      shareholders: '位股东',
      lpStructure: '有限合伙控股结构',
      capitalLedger: '合伙人资本账目流水表',
      byRoundAndInvest: '按分红轮次与出资分组',
      all: '全部',
      invest: '出资',
      additional: '追加',
      dividend: '分红',
      deleteRecord: '删除',
      issueProportional: '发起比例分红',
      autoByShare: '按股权穿透比例自动分配',
      totalToPool: '拟向红利池注入的总金额 (元)',
      enterAmount: '输入金额',
      roundNote: '轮次备注',
      roundNoteExample: '如：第6次分红',
      shareCalcResult: '穿透股权计算结果：',
      confirmIssue: '确认发放并记账',
      confirmDeleteRecord: '确认删除',
      irreversible: '此操作不可恢复',
      willDelete: '将删除「',
      allDividendRecords: '」的所有分红记录',
      sharePercent: '持股',
      totalInvest: '总出资',
      totalDividends: '累计分红',
      initialInvest: '初始出资',
      paybackProgress: '回本进度',
      dividendHistory: '分红历史',
      noDividendRecords: '暂无分红记录',
      partnerStructure: '合伙架构',
      lpControl: '有限合伙控股',
      chairman: '董事长',
      ceo: 'CEO',
      janitor: '打杂',
      partner: '合伙人',
      investComplete: '出资完结',
      subscribedTotal: '认缴总额',
      initial: '初始',
      totalDividendsPaid: '累计分红',
      paybackRate: '回本率',
      fullyPaidBack: '已回本 ✓',
      pendingPayback: '待回',
      fullyPaidBackDetail: '已完全回本 ✓',
      initialApr2024: '初始出资 · 2024年4月',
      additionalJan2025: '追加 · 2025年1月21日',
      jokeClosedLoop: '一个董事长负责画饼，一个CEO负责烙饼，一个打杂的负责吃饼 —— 完美的商业闭环',
      dividendRoundFmt: '第{n}次分红 ({date})',

      // ── NAMES (untranslated) ──
      nameZhang: '张安武',
      nameJiang: '江宽',
      nameLan: '蓝柳富'
    },

    'zh-TW': {
      // ── COMMON ──
      appTitle: '藍姐螺螄粉',
      appFooter: '藍姐螺螄粉',

      // ── LOGIN PAGE ──
      subtitle: '生活不簡單，盡量簡單過',
      tabLogin: '登入',
      tabRegister: '註冊',
      labelUsername: '使用者名稱',
      phUsername: '請輸入使用者名稱',
      phUsernameReg: '請設定使用者名稱',
      labelPassword: '密碼',
      phPassword: '請輸入密碼',
      phPassword2: '請再次輸入密碼',
      labelPassword2: '確認密碼',
      phPasswordReg: '請設定密碼',
      pwHint: '6-20位，需包含字母和數字',
      labelEmail: '電子郵箱',
      phEmail: '請輸入郵箱地址',
      btnLogin: '登 入',
      btnRegister: '註 冊',
      forgotPw: '忘記密碼？',
      verifySent: '驗證碼已發送至您的郵箱',
      labelCode: '驗證碼',
      phCode: '請輸入驗證碼',
      btnVerify: '驗證並登入',
      resendCode: '重新發送',
      forgotTitle: '找回密碼',
      forgotHint: '請輸入註冊郵箱，我們將發送驗證碼',
      labelEmailReg: '註冊郵箱',
      phEmailReg: '請輸入註冊時使用的郵箱',
      btnSendCode: '發送驗證碼',
      backLogin: '去登入',
      forgotTitle2: '重設密碼',
      labelNewPw: '新密碼',
      labelNewPw2: '確認新密碼',
      btnResetPw: '重設密碼',
      footer: '藍姐螺螄粉',

      // ── ERRORS ──
      errEmpty: '請填寫此欄位',
      errEmptyAll: '請填寫所有欄位',
      errPwLen: '密碼長度需為6-20位',
      errPwLetter: '密碼需包含字母',
      errPwNum: '密碼需包含數字',
      errPwMismatch: '兩次密碼輸入不一致',
      errNet: '網路錯誤，請稍後重試',
      errCodeLen: '驗證碼為6位數字',
      errEmptyCode: '請輸入驗證碼',
      errEmptyEmail: '請輸入郵箱地址',
      errLoginFailed: '登入失敗，請檢查使用者名稱和密碼',
      errRegFailed: '註冊失敗，請稍後重試',
      errVerifyFailed: '驗證失敗，請檢查驗證碼',
      errSendFailed: '發送驗證碼失敗，請稍後重試',
      errResetFailed: '重設密碼失敗，請稍後重試',
  errSessionExpired: '登錄已過期，請重新登錄',

      // ── STATUS ──
      sending: '發送中...',
      resentOk: '驗證碼已重新發送',
      verifyOk: '驗證成功，正在跳轉...',
      resetOk: '密碼重設成功，請重新登入',

      // ── INDEX PAGE ──
      income: '收入',
      expense: '支出',
      profit: '利潤',
      procurement: '進貨',
      monthPrefix: '月',
      tabBills: '帳單',
      tabRecord: '記帳',
      tabSupply: '供應鏈',
      tabTrends: '趨勢',
      navPartner: '合夥人',
      notePlaceholder: '備註',
      save: '儲存',
      noRecords: '暫無記錄',
      prevPage: '上頁',
      nextPage: '下頁',
      quickProcure: '快速進貨',
      selectProduct: '選擇產品...',
      procureQuantity: '進貨數量',
      unitPrice: '單價',
      confirmProcure: '確認進貨',
      productCatalog: '產品目錄',
      addProduct: '+ 新增',
      recentProcure: '最近進貨',
      noProducts: '暫無產品',
      noProcurement: '暫無進貨記錄',
      addProductTitle: '新增產品',
      editProductTitle: '編輯產品',
      productName: '產品名稱 *',
      productSpec: '規格型號',
      productUnit: '單位',
      productPrice: '單價 *',
      cancel: '取消',
      delete: '刪除',
      confirmDelete: '確定刪除？',
      pieceUnit: '件',
      trend12Month: '近 12 月收支趨勢',
      noData: '暫無資料',
      note: '筆記',

      // ── CATEGORIES (INDEX) ──
      catDineIn: '🍜 堂食',
      catMeituan: '🛵 美團外賣',
      catEleme: '🛵 餓了嗎外賣',
      catMeituanGroup: '🎫 美團團購',
      catJD: '📦 京東',
      catOtherIncome: '🔧 其他收入',
      catRawMaterials: '📦 原材料進貨',
      catRent: '🏠 房租',
      catUtilities: '⚡ 水電煤氣',
      catLabor: '👨‍🍳 人工工資',
      catEquipment: '🔧 設備/工具',
      catRenovation: '🏗️ 裝修',
      catTraining: '📋 培訓/證件',
      catCleaning: '🧹 衛生/清潔',
      catTableware: '🧻 餐具/紙巾',
      catPackaging: '📦 包裝/打包',
      catAdvertising: '📢 廣告/推廣',
      catMisc: '💊 雜項/煙酒',
      catOther: '📝 其他',
      // ── INDEX PARTNER SECTION ──
      investDividendLabel: '投入/已分紅',
      paybackLabel: '回本',
      dividendLabel: '分紅',
      shareOf: '佔比',

      // ── PARTNER PAGE ──
      backHome: '返回首頁',
      partnerTitle: '藍姐螺螄粉合夥人資產',
      totalCapital: '合夥初始基金總額',
      paidInRate: '實繳率',
      distributedPool: '已派發分紅池',
      cumulativeByShare: '累計派發 · 按比例分配',
      issueDividend: '發起分紅',
      partnerSeats: '合夥席位',
      shareholders: '位股東',
      lpStructure: '有限合夥控股結構',
      capitalLedger: '合夥人資本帳目流水表',
      byRoundAndInvest: '按分紅輪次與出資分組',
      all: '全部',
      invest: '出資',
      additional: '追加',
      dividend: '分紅',
      deleteRecord: '刪除',
      issueProportional: '發起比例分紅',
      autoByShare: '按股權穿透比例自動分配',
      totalToPool: '擬向紅利池注入的總金額 (元)',
      enterAmount: '輸入金額',
      roundNote: '輪次備註',
      roundNoteExample: '如：第6次分紅',
      shareCalcResult: '穿透股權計算結果：',
      confirmIssue: '確認發放並記帳',
      confirmDeleteRecord: '確認刪除',
      irreversible: '此操作不可恢復',
      willDelete: '將刪除「',
      allDividendRecords: '」的所有分紅記錄',
      sharePercent: '持股',
      totalInvest: '總出資',
      totalDividends: '累計分紅',
      initialInvest: '初始出資',
      paybackProgress: '回本進度',
      dividendHistory: '分紅歷史',
      noDividendRecords: '暫無分紅記錄',
      partnerStructure: '合夥架構',
      lpControl: '有限合夥控股',
      chairman: '董事長',
      ceo: 'CEO',
      janitor: '打雜',
      partner: '合夥人',
      investComplete: '出資完結',
      subscribedTotal: '認繳總額',
      initial: '初始',
      totalDividendsPaid: '累計分紅',
      paybackRate: '回本率',
      fullyPaidBack: '已回本 ✓',
      pendingPayback: '待回',
      fullyPaidBackDetail: '已完全回本 ✓',
      initialApr2024: '初始出資 · 2024年4月',
      additionalJan2025: '追加 · 2025年1月21日',
      jokeClosedLoop: '一個董事長負責畫餅，一個CEO負責烙餅，一個打雜的負責吃餅 —— 完美的商業閉環',
      dividendRoundFmt: '第{n}次分紅 ({date})',

      // ── NAMES (untranslated) ──
      nameZhang: '張安武',
      nameJiang: '江寬',
      nameLan: '藍柳富'
    },

    'en': {
      // ── COMMON ──
      appTitle: "Lan's Luosifen",
      appFooter: "Lan's Luosifen",

      // ── LOGIN PAGE ──
      subtitle: 'Life is not simple, keep it simple',
      tabLogin: 'Login',
      tabRegister: 'Register',
      labelUsername: 'Username',
      phUsername: 'Enter username',
      phUsernameReg: 'Choose a username',
      labelPassword: 'Password',
      phPassword: 'Enter password',
      phPassword2: 'Re-enter password',
      labelPassword2: 'Confirm Password',
      phPasswordReg: 'Create a password',
      pwHint: '6-20 chars, must include letters and numbers',
      labelEmail: 'Email',
      phEmail: 'Enter email address',
      btnLogin: 'Login',
      btnRegister: 'Register',
      forgotPw: 'Forgot password?',
      verifySent: 'Verification code sent to your email',
      labelCode: 'Verification Code',
      phCode: 'Enter verification code',
      btnVerify: 'Verify & Login',
      resendCode: 'Resend',
      forgotTitle: 'Recover Password',
      forgotHint: 'Enter your registered email to receive a verification code',
      labelEmailReg: 'Registered Email',
      phEmailReg: 'Enter the email used during registration',
      btnSendCode: 'Send Code',
      backLogin: 'Go to Login',
      forgotTitle2: 'Reset Password',
      labelNewPw: 'New Password',
      labelNewPw2: 'Confirm New Password',
      btnResetPw: 'Reset Password',
      footer: "Lan's Luosifen",

      // ── ERRORS ──
      errEmpty: 'This field is required',
      errEmptyAll: 'Please fill in all fields',
      errPwLen: 'Password must be 6-20 characters',
      errPwLetter: 'Password must contain at least one letter',
      errPwNum: 'Password must contain at least one number',
      errPwMismatch: 'Passwords do not match',
      errNet: 'Network error, please try again later',
      errCodeLen: 'Verification code must be 6 digits',
      errEmptyCode: 'Please enter the verification code',
      errEmptyEmail: 'Please enter your email address',
      errLoginFailed: 'Login failed. Please check your username and password',
      errRegFailed: 'Registration failed, please try again later',
      errVerifyFailed: 'Verification failed, please check the code',
      errSendFailed: 'Failed to send verification code, please try again later',
      errResetFailed: 'Password reset failed, please try again later',
  errSessionExpired: 'Session expired, please login again',

      // ── STATUS ──
      sending: 'Sending...',
      resentOk: 'Verification code resent',
      verifyOk: 'Verified successfully, redirecting...',
      resetOk: 'Password reset successful, please login again',

      // ── INDEX PAGE ──
      income: 'Income',
      expense: 'Expense',
      profit: 'Profit',
      procurement: 'Procurement',
      monthPrefix: '',
      tabBills: 'Bills',
      tabRecord: 'Record',
      tabSupply: 'Supply Chain',
      tabTrends: 'Trends',
      navPartner: 'Partners',
      notePlaceholder: 'Note',
      save: 'Save',
      noRecords: 'No records',
      prevPage: 'Prev',
      nextPage: 'Next',
      quickProcure: 'Quick Procure',
      selectProduct: 'Select product...',
      procureQuantity: 'Quantity',
      unitPrice: 'Unit Price',
      confirmProcure: 'Confirm Procurement',
      productCatalog: 'Product Catalog',
      addProduct: '+ Add',
      recentProcure: 'Recent Procurement',
      noProducts: 'No products',
      noProcurement: 'No procurement records',
      addProductTitle: 'Add Product',
      editProductTitle: 'Edit Product',
      productName: 'Product Name *',
      productSpec: 'Spec / Model',
      productUnit: 'Unit',
      productPrice: 'Unit Price *',
      cancel: 'Cancel',
      delete: 'Delete',
      confirmDelete: 'Confirm delete?',
      pieceUnit: 'pcs',
      trend12Month: '12-Month Income & Expense Trend',
      noData: 'No data',
      note: 'Notes',

      // ── CATEGORIES (INDEX) ──
      catDineIn: '🍜 Dine-in',
      catMeituan: '🛵 Meituan',
      catEleme: '🛵 Ele.me',
      catMeituanGroup: '🎫 Meituan Group',
      catJD: '📦 JD',
      catOtherIncome: '🔧 Other Income',
      catRawMaterials: '📦 Raw Materials',
      catRent: '🏠 Rent',
      catUtilities: '⚡ Utilities',
      catLabor: '👨‍🍳 Labor',
      catEquipment: '🔧 Equipment',
      catRenovation: '🏗️ Renovation',
      catTraining: '📋 Training/Certs',
      catCleaning: '🧹 Cleaning',
      catTableware: '🧻 Tableware',
      catPackaging: '📦 Packaging',
      catAdvertising: '📢 Advertising',
      catMisc: '💊 Misc/Tobacco',
      catOther: '📝 Other',
      // ── INDEX PARTNER SECTION ──
      investDividendLabel: 'Invest/Dividends',
      paybackLabel: 'Payback',
      dividendLabel: 'Dividend',
      shareOf: 'Share',

      // ── PARTNER PAGE ──
      backHome: 'Back to Home',
      partnerTitle: "Lan's Luosifen — Partner Capital",
      totalCapital: 'Total Initial Capital',
      paidInRate: 'Paid-in Rate',
      distributedPool: 'Distributed Dividend Pool',
      cumulativeByShare: 'Cumulative · Distributed by Share Ratio',
      issueDividend: 'Issue Dividend',
      partnerSeats: 'Partner Seats',
      shareholders: ' shareholders',
      lpStructure: 'Limited Partnership Structure',
      capitalLedger: 'Partner Capital Ledger',
      byRoundAndInvest: 'By Dividend Round & Investment Type',
      all: 'All',
      invest: 'Investment',
      additional: 'Additional',
      dividend: 'Dividend',
      deleteRecord: 'Delete',
      issueProportional: 'Issue Proportional Dividend',
      autoByShare: 'Auto-distributed by equity share ratio',
      totalToPool: 'Total amount to inject into dividend pool (¥)',
      enterAmount: 'Enter amount',
      roundNote: 'Round Note',
      roundNoteExample: 'e.g. 6th dividend distribution',
      shareCalcResult: 'Share Calculation Result:',
      confirmIssue: 'Confirm & Record',
      confirmDeleteRecord: 'Confirm Delete',
      irreversible: 'This action cannot be undone',
      willDelete: 'This will delete all dividend records for "',
      allDividendRecords: '"',
      sharePercent: 'Share %',
      totalInvest: 'Total Investment',
      totalDividends: 'Total Dividends',
      initialInvest: 'Initial Investment',
      paybackProgress: 'Payback Progress',
      dividendHistory: 'Dividend History',
      noDividendRecords: 'No dividend records',
      partnerStructure: 'Partner Structure',
      lpControl: 'Limited Partnership Control',
      chairman: 'Chairman',
      ceo: 'CEO',
      janitor: 'Helper',
      partner: 'Partner',
      investComplete: 'Investment Complete',
      subscribedTotal: 'Subscribed Total',
      initial: 'Initial',
      totalDividendsPaid: 'Total Dividends Paid',
      paybackRate: 'Payback Rate',
      fullyPaidBack: 'Fully Paid Back ✓',
      pendingPayback: 'Pending',
      fullyPaidBackDetail: 'Fully Paid Back ✓',
      initialApr2024: 'Initial Investment · April 2024',
      additionalJan2025: 'Additional · Jan 21, 2025',
      jokeClosedLoop: 'A Chairman who paints the vision, a CEO who bakes the cake, and a Helper who eats it — the perfect business closed loop',
      dividendRoundFmt: 'Dividend #{n} ({date})',

      // ── NAMES (untranslated) ──
      nameZhang: 'Zhang Anwu',
      nameJiang: 'Jiang Kuan',
      nameLan: 'Lan Liufu'
    }
  };

  // ──────────────────────────────────────────────
  // 2. CURRENT LANGUAGE DETECTION
  // ──────────────────────────────────────────────
  var curLang = (function () {
    // 1) localStorage override
    var stored = localStorage.getItem('lang');
    if (stored && I18N[stored]) return stored;

    // 2) Browser language detection
    var navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (navLang.indexOf('zh-tw') === 0 || navLang.indexOf('zh-hk') === 0) return 'zh-TW';
    if (navLang.indexOf('zh') === 0) return 'zh-CN';
    if (navLang.indexOf('en') === 0) return 'en';

    // 3) Default
    return 'zh-CN';
  })();

  // ──────────────────────────────────────────────
  // 3. CALLBACK SYSTEM
  // ──────────────────────────────────────────────
  var _langChangeCallbacks = [];

  /**
   * Register a callback that fires whenever the language changes.
   * Use this to re-render JS-generated HTML that relies on t().
   * @param {Function} fn
   */
  function onLangChange(fn) {
    if (typeof fn === 'function') {
      _langChangeCallbacks.push(fn);
    }
  }

  function _fireLangChange() {
    for (var i = 0; i < _langChangeCallbacks.length; i++) {
      try { _langChangeCallbacks[i](curLang); } catch (e) { /* ignore */ }
    }
  }

  // ──────────────────────────────────────────────
  // 4. TRANSLATE
  // ──────────────────────────────────────────────
  /**
   * Retrieve a translated string by key for the current language.
   * Falls back to zh-CN if the key or language is missing.
   * @param {string} key
   * @returns {string}
   */
  function t(key) {
    var dict = I18N[curLang] || I18N['zh-CN'];
    return dict[key] !== undefined ? dict[key] : (I18N['zh-CN'][key] || key);
  }

  // ──────────────────────────────────────────────
  // 5. SET LANGUAGE
  // ──────────────────────────────────────────────
  /**
   * Switch to a new language, persist, and re-apply to the DOM.
   * @param {string} lang - 'zh-CN', 'zh-TW', or 'en'
   */
  function setLang(lang) {
    if (!I18N[lang]) return;
    curLang = lang;
    window.curLang = lang;
    localStorage.setItem('lang', lang);

    // Update <html lang="...">
    var htmlEl = document.documentElement;
    if (htmlEl) htmlEl.setAttribute('lang', lang);

    // Apply to all templated elements and fire callbacks
    applyI18n();
    
    // Update lang button active states
    var btns = document.querySelectorAll('.lang-btn');
    for (var _i = 0; _i < btns.length; _i++) {
      btns[_i].classList.toggle('active', btns[_i].getAttribute('data-lang') === lang);
    }
    
    _fireLangChange();
  }

  // ──────────────────────────────────────────────
  // 6. APPLY I18N TO DOM
  // ──────────────────────────────────────────────
  /**
   * Walk the DOM and translate all [data-i18n] (textContent)
   * and [data-i18n-placeholder] (placeholder attribute) elements.
   * Call this after dynamically inserting HTML that uses data-i18n attributes.
   */
  function applyI18n() {
    var dict = I18N[curLang] || I18N['zh-CN'];

    // data-i18n → textContent
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      if (dict[key] !== undefined) {
        els[i].textContent = dict[key];
      }
    }

    // data-i18n-placeholder → placeholder attribute
    var phEls = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < phEls.length; j++) {
      var phKey = phEls[j].getAttribute('data-i18n-placeholder');
      if (dict[phKey] !== undefined) {
        phEls[j].setAttribute('placeholder', dict[phKey]);
      }
    }

    // data-i18n-title → title attribute (bonus)
    var titleEls = document.querySelectorAll('[data-i18n-title]');
    for (var k = 0; k < titleEls.length; k++) {
      var tKey = titleEls[k].getAttribute('data-i18n-title');
      if (dict[tKey] !== undefined) {
        titleEls[k].setAttribute('title', dict[tKey]);
      }
    }

    // data-i18n-html → innerHTML (bonus, for rich content)
    var htmlEls = document.querySelectorAll('[data-i18n-html]');
    for (var m = 0; m < htmlEls.length; m++) {
      var hKey = htmlEls[m].getAttribute('data-i18n-html');
      if (dict[hKey] !== undefined) {
        htmlEls[m].innerHTML = dict[hKey];
      }
    }
  }

  // ──────────────────────────────────────────────
  // 7. EXPORT TO GLOBAL SCOPE
  // ──────────────────────────────────────────────
  window.I18N = I18N;
  window.curLang = curLang;
  window.t = t;
  window.setLang = setLang;
  window.applyI18n = applyI18n;
  window.onLangChange = onLangChange;

  // ──────────────────────────────────────────────
  // 8. AUTO-APPLY ON DOM READY
  // ──────────────────────────────────────────────
  function _autoApply() {
    var htmlEl = document.documentElement;
    if (htmlEl) htmlEl.setAttribute('lang', curLang);
    applyI18n();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoApply);
  } else {
    _autoApply();
  }

})();