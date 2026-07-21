import React, { createContext, useContext, useState, useCallback } from 'react';

const I18N: Record<string, Record<string, string>> = {
  'zh-CN': {
    accountCooldown: '账户已进入冷静期',
    accountInfo: '账号信息',
    actualReceived: '实收金额',
    addFeeEntry: '录入手续费',
    addImage: '添加',
    additional: '追加投资',
    addressPhone: '公司地址',
    adminCannotDelete: '管理员账户无法注销。如需停用，请联系其他管理员操作。',
    all: '全部',
    allDividendRecords: '」的所有分红记录',
    allowLogin: '允许登录',
    amount: '金额',
    amountLabel: '输入金额（元）',
    any: '不限',
    apply: '应用',
    atLeastOneFee: '至少输入一个平台的手续费',
    authSettingsTitle: '登录安全',
    autoByShare: '按股权穿透比例自动分配',
    avatarCropTitle: '调整头像',
    avatarSizeHint: '在不同场景下的显示效果',
    avatarUpdated: '头像已更新',
    back: '返回',
    backToList: '返回列表',
    backToLogin: '返回登录',
    bankAccount: '银行账号',
    bankName: '开户银行',
    basicInfo: '基本信息',
    batchLabel: '{date} · 第{n}次分红',
    bgHint: '选择一张图片作为首页背景',
    bgResultHint: '将作为首页全屏背景',
    bgSettings: '主题设置',
    bgUpdated: '背景图已更新',
    billDate: '账单日期',
    bookBalance: '账面余额',
    bookDiff: '账面差额',
    byRoundAndInvest: '按分红轮次与出资分组',
    cancel: '取消',
    capitalLedger: '合伙人资本账目流水表',
    cardBalance: '卡余额',
    cashBalance: '现金',
    cashOnHand: '账面余额',
    ceo: 'CEO',
    chairman: '董事长',
    changeEmail: '更换邮箱',
    changePassword: '修改密码',
    chartSwitchBar: '柱状图',
    chartSwitchDay: '日',
    chartSwitchHint: '点击切换视图',
    chartSwitchMonth: '月',
    chartSwitchPie: '饼图',
    chartXAxis: '月份',
    chartXAxisDay: '每日',
    chartYAxis: '金额（元）',
    chooseImage: '选择图片',
    clear: '清空',
    codeSent: '验证码已发送',
    companyAddress: '公司地址',
    companyBankAccount: '银行账号',
    companyBankName: '开户银行',
    companyName: '公司名称',
    companyPhone: '公司电话',
    companyTaxId: '公司税号',
    confirm: '确认',
    confirmDelete: '确认删除？',
    confirmDeleteRecord: '确认删除',
    confirmDisable: '关闭面容',
    confirmIssue: '确认发放并记账',
    confirmLogout: '确定退出',
    confirmNewPassword: '确认新密码',
    confirmPassword: '确认密码',
    confirmRecord: '确认记录',
    confirmUnlinkMsg: '确认解除与 {name} 的关联？',
    confirmUse: '确认使用',
    copyright: '© 2026 柳味探秘 · 经营查询 · 版权所有',
    coverCropTitle: '编辑封面',
    coverHint: '将作为个人中心顶部封面展示',
    coverUpdated: '封面已更新',
    createdAt: '创建时间',
    cropFailed: '裁切失败，请重试',
    cropFlip: '翻转',
    cropPill: '拖动移动 · 双指缩放',
    cropRotate: '旋转',
    cumulativeByShare: '累计派发 · 按比例分配',
    cumulativeExpense: '实际支出',
    cumulativeRevenue: '实际收入',
    currentBalance: '实际结余',
    daily: '日常',
    dailyProfit: '每日利润',
    dailyRevenue: '每日营收',
    dailyTrend: '每日收支趋势',
    dangerZone: '危险操作',
    date: '日期',
    dateFrom: '开始日期',
    dateTo: '结束日期',
    delete: '删除',
    deleteAccount: '注销账户',
    deleteAccountBtn: '确认注销',
    deleteAccountConfirmMsg: '注销后所有数据将被永久删除，不可恢复。确定继续吗？',
    deleteAccountConfirmTitle: '确认注销账户',
    deleteAccountGraceNote: '您的账户将进入 3 天冷静期，期满后永久注销。在此期间登录即可自动恢复账户。',
    deleteAccountSuccess: '账户已注销',
    deleteRecord: '删除',
    deleteUser: '删除用户',
    deleteUserConfirm: '确认删除该用户，该用户的所有数据（交易记录、进货记录等）也将一并删除',
    deleteUserGraceNote: '账户将进入 5 天冷静期，期满后永久删除并转移经营数据至管理员。冷静期内您可随时恢复。',
    disableFaceIDConfirm: '关闭后需重新设置面容才能再次使用。确定关闭吗？',
    devCodeLabel: '🔧 开发模式 — 验证码',
    dineIn: '堂食',
    disabledStatus: '禁用',
    discountAmount: '优惠减免',
    displayName: '登录账号',
    distributedPool: '已派发分红池',
    dividend: '分红',
    dividendHistory: '分红历史',
    dividendRoundFmt: '第{n}次分红 · {date}',
    dividendRoundOnly: '第{n}次分红',
    done: '完成',
    downloadImage: '下载图片',
    downloadPdf: '下载PDF',
    edit: '编辑',
    editBg: '编辑背景图',
    editCover: '更换封面',
    editProfile: '个人中心',
    email: '邮箱',
    emailAction: '邮件',
    emailBodyExtra: '（链接 24 小时内有效）',
    emailUpdated: '邮箱已更新',
    emptyExpenseHint: '每完成一次记账，这里就多一条记录',
    emptyInvoiceHint: '每开一张发票，这里就多一张小卡片',
    emptyReconHint: '每完成一次对账，这里就多一张小卡片',
    enterAmount: '输入金额',
    enterCode: '输入6位验证码',
    enterUsernameToConfirm: '请输入用户名以确认注销',
    entryDate: '录入日期',
    errDateFuture: '不能选择未来的日期',
    errDateRange: '结束日期必须晚于开始日期',
    errDateRangeTooLong: '日期范围不能超过 24 个月',
    errEmailInvalid: '邮箱格式不正确',
    errPhoneInvalid: '请输入正确的手机号码',
    errBankCardInvalid: '卡号有误',
    errEmptyFields: '请填写所有字段',
    errEnterCode: '请输入验证码',
    errFileSize: '图片不能超过10MB',
    errNetworkError: '网络错误，请检查网络后重试',
    errOldPwRequired: '请输入当前密码',
    errPwMismatch: '两次密码不一致',
    errPwNeedLetter: '密码必须包含字母',
    errPwNeedNumber: '密码必须包含数字',
    errPwNeedSpecial: '密码必须包含特殊字符',
    errPwRequirements: '密码须8位以上，包含字母、数字、特殊字符',
    errPwTooShort: '密码至少 8 位',
    errUserInfoUnavailable: '无法获取用户信息',
    errWrongCredentials: '账号或密码错误',
    errWrongPassword: '密码错误',
    err_partner_cannot_delete: '合伙人账户无法注销。如需停用，请联系管理员操作。',
    err_user_linked_partner: '该用户身为合伙人，不可删除，解除关联，即可删除。',
    expConfirmMsg: '提交后将无法修改，确定要记录吗？',
    expConfirmTitle: '确认记录',
    expDate: '日期',
    expDetail: '支出详情',
    expSavedMsg: '支出已更新，是否返回列表？',
    expTotalAmount: '支出金额',
    expUpdated: '支出已更新',
    expense: '支出',
    expenseBreakdown: '支出分类占比',
    expenseBreakdownOfMonth: '支出分类占比',
    expenseCategory: '支出分类',
    expenseDate: '支出日期',
    expenseHistory: '支出记录',
    expenseNote: '支出说明',
    faceIDDesc: '使用面容快速登录',
    faceIDLabel: '面容登录',
    faceIDLogin: '面容登录',
    feeAllMonths: '全部',
    feeCurrent: '当前手续费',
    feeDetail: '更新手续费',
    feeEntry: '今日手续费',
    feeNotUpdated: '请先录入手续费，再发起对账',
    enterFeeFirst: '先录入手续费',
    reconLater: '稍后再对',
    feeHistory: '历史明细',
    feePreview: '累计手续费',
    feeViewDetail: '查看明细',
    filledBy: '填写人',
    filterCategory: '支出分类',
    filterDate: '日期',
    flashSale: '闪购',
    forgotPassword: '忘记密码？',
    forgotSendBtn: '发送验证码',
    forgotStep1: '请输入注册邮箱',
    friendlyReminder: '温馨提示',
    fullyPaidBack: '已回本 ✓',
    fullyPaidBackDetail: '已完全回本 ✓',
    fundsInTransit: '在途资金',
    goBack: '返回',
    goods: '采购',
    graceStatus: '冷静期中',
    imgNotLoaded: '图片未加载',
    income: '收入',
    initial: '初始出资',
    initialInvest: '初始出资',
    invApply: '申请开票',
    invApplyAmount: '申请金额',
    invAutoFilled: '已自动填入',
    invBankInfo: '银行信息',
    invCenter: '发票管理',
    invContact: '联系开票方',
    invPleaseMaintain: '请完善信息',
    invDelConfirmPrefix: '此操作将删除「',
    invDelConfirmSuffix: '」开票数据，请谨慎操作。',
    invDownload: '下载',
    invDownloading: '正在下载…',
    invDrawerAmount: '开票金额',
    invDrawerBatch: '关联批次号',
    invDrawerBatchPlaceholder: '选择采购批次号',
    invDrawerBuyer: '公司名称',
    invDrawerDate: '开票日期',
    invDrawerNote: '开票说明',
    invDrawerNotePlaceholder: '货物或服务名称（可选）',
    invDrawerRef: '关联单号',
    invDrawerTaxId: '公司税号',
    invDrawerType: '发票类型',
    invEdit: '编辑',
    invEditBank: '编辑银行信息',
    invEditInfo: '编辑开票信息',
    invEmail: '接收邮箱',
    invEmpty: '暂无发票记录',
    invExportToast: '导出记录功能',
    invFileUploaded: '已上传发票',
    invFilterAll: '全部',
    invFilterDone: '已开具',
    invFilterPending: '待开具',
    invFilterRejected: '已作废',
    invGeneral: '普通发票',
    invGeneralFull: '增值税普通发票',
    invHeaderInfo: '抬头信息',
    invInfoTab: '开票信息',
    invLabel: 'Invoice',
    invOptional: '可选',
    invPending: '待处理',
    invReapply: '重新申请',
    invRecAddTitle: '新增开票记录',
    invRecConfirmDelete: '确定要删除这条开票记录吗？',
    invRecDeleteOk: '已删除',
    invRecEditTitle: '编辑开票记录',
    invRecEmpty: '暂无开票记录',
    invRecInvoiceNo: '发票票号',
    invRecMarkDone: '标记为已开',
    invRecSaveOk: '保存成功',
    invRecStatusDone: '已开票',
    invRecStatusPending: '待开票',
    invReceipt: '收据',
    invReceiveMethod: '收票方式',
    invRecordsTab: '发票记录',
    invSave: '保存',
    invSaved: '保存成功',
    invSelectBatch: '选择批次',
    invSettingsToast: '设置',
    invShareToast: '分享发票',
    invStatus: '开票状态',
    invStatusDone: '已开具',
    invStatusPending: '待开具',
    invStatusRejected: '已作废',
    invSubmit: '提交申请',
    invSubmitDone: '申请已提交，预计1-3个工作日开具',
    invTaxAmount: '含税金额',
    invTips: '开票信息将自动填入申请表单，确保税号准确以免开具失败。',
    invTitle: '开票管理中心',
    invToInvoice: '去开票',
    invTotalAmount: '开票总额',
    invTotalCount: '累计开票',
    invTypePref: '发票类型偏好',
    invUploadFiles: '上传发票',
    invUploadHint: '最多上传9张',
    invUploadInvoice: '上传发票',
    invUrge: '催一下',
    invVatSpecial: '增值税专票',
    invVatSpecialFull: '增值税专用发票',
    invest: '出资',
    investComplete: '出资完结',
    invoiceSave: '保存',
    invoiceSaved: '成功',
    invoiceSaving: '...',
    invoiceTitle: '开票信息',
    issueDividend: '发起分红',
    issueProportional: '发起比例分红',
    janitor: '打杂',
    jd: '京东',
    jokeClosedLoop: '「一个董事长负责画饼，一个CEO负责烙饼，一个打杂的负责吃饼 —— 完美的商业闭环」',
    jokeRecon: '已为您载入最近一次对账数据，请核对账单日期是否正确。',
    language: '语言',
    anyDate: '任何日期',
    last30Days: '近30天',
    last3Months: '近3月',
    last7Days: '近7天',
    lastLogin: '最后登录',
    linkCopied: '链接已复制',
    linkPartner: '关联',
    linkedPartner: '关联合伙人',
    loadMore: '加载更多',
    loading: '加载中...',
    login: '登录',
    loginBtn: '登 录',
    loginDisabledHint: '关闭后，用户将无法登录系统',
    loginPlaceholder: '用户名 / 邮箱',
    loginStatus: '登录状态',
    logout: '退出登录',
    logoutConfirm: '确定要退出登录吗？',
    lpControl: '有限合伙控股',
    lpStructure: '有限合伙控股结构',
    manager: '店长',
    markRead: '已读',
    meituan: '美团',
    meituanCashier: '美团收银',
    meituanTuan: '美团团购',
    meituanWaimai: '美团外卖',
    mid: '追加',
    month: '本月',
    month1: '1月',
    month10: '10月',
    month11: '11月',
    month12: '12月',
    month2: '2月',
    month3: '3月',
    month4: '4月',
    month5: '5月',
    month6: '6月',
    month7: '7月',
    month8: '8月',
    month9: '9月',
    monthExpense: '本月支出',
    monthIncome: '本月收入',
    monthProfit: '本月利润',
    monthUnit: '月',
    monthlyProfit: '月度利润',
    monthlyTrend: '月度收支趋势',
    nameJiang: '江宽',
    nameLan: '蓝柳富',
    nameZhang: '张安武',
    newEmail: '新邮箱',
    newPassword: '新密码',
    newUserBadge: '新注册',
    noDividendRecords: '暂无分红记录',
    noExpenseRecords: '暂无支出记录',
    noRecords: '暂无记录',
    noUsers: '暂无用户',
    normalStatus: '正常',
    normalUser: '打杂',
    notePlaceholder: '如：葱、香菜、电费',
    oldPassword: '当前密码',
    opacity: '透明度',
    otherInfo: '其他信息',
    paidInRate: '实缴率',
    partnerSeats: '合伙席位',
    partnerStructure: '合伙架构',
    partnerTitle: '柳味探秘科技合伙人',
    password: '密码',
    passwordChanged: '密码已修改',
    payAlipay: '支付宝',
    payBank: '银行卡',
    payCash: '现金',
    payOther: '其他',
    payWechat: '微信',
    paybackProgress: '回本进度',
    paybackRate: '回本率',
    paymentMethod: '支付方式',
    pdfGenerating: '进货单PDF生成中…',
    pdfLoadFailed: 'PDF 加载失败',
    pdfLoading: '加载 PDF 中…',
    pdfPageInfo: '第 {current} 页 / 共 {total} 页',
    pendingPayback: '待回',
    phone: '手机号码',
    platformFee: '平台手续费',
    preferences: '偏好设置',
    procAddProduct: '添加产品',
    procAll: '全部',
    procSelectSupplier: '选择供应商',
    procBatchCount: '历史批次',
    procBatchLabel: '采购批次',
    procComingSoon: '即将',
    procConfirmOrder: '确认进货单',
    procContinue: '继续进货',
    procCumulative: '累计货款',
    procDeleteBatch: '删除批次',
    procDeleteBatchConfirm: '确定删除第{n}次进货？关联的支出记录也会一并删除。',
    procDeleteBatchConfirmV2: '确定删除「{batch}」？关联的支出记录也会一并删除。',
    procDeleteProduct: '删除产品',
    procDeleteProductConfirm: '确定删除「{name}」？',
    procDeleteProductWarning: '删除后历史批次中该商品将无法显示名称。',
    procDetail: '进货详情',
    procEditBatch: '编辑第{n}次进货',
    procEditProduct: '编辑产品',
    procEmptyHistoryHint: '完成进货后，记录会显示在这里',
    procEmptyHistoryTitle: '还没有进货记录',
    procEmptyNewHint: '请先在「产品维护」中添加产品，再回来下单',
    procEmptyNewTitle: '还没有产品',
    procEmptyProductsHint: '点击上方「+ 添加产品」开始维护产品目录',
    procEmptyProductsTitle: '还没有产品',
    procGenerating: '生成中...',
    procGeneratingPDF: '正在生成进货单…',
    procHistory: '进货记录',
    procImages: '凭证预览',
    procMargin: '货款利润率',
    procNewOrder: '新建进货',
    procNoteHintAddress: '请填写提货联系地址',
    procNoteHintPhone: '请填写提货联系电话',
    procNoteLabel: '备注',
    procNoteOptional: '可选备注',
    procNowBatch: '第{n}次进货',
    procOperator: '经办人',
    procOrderDate: '进货日期',
    procOrderItems: '进货明细',
    procPaymentMethod: '支付方式',
    procPdfTitle: '进货单 #{n}',
    procProduct: '商品',
    procProductMgmt: '产品维护',
    procProductName: '产品名称',
    procProductNote: '备注（选填）',
    procProductPrice: '单价',
    procProductSpec: '规格',
    procProductSupplier: '供应商',
    procPurchase: '采购',
    procSearchHistory: '搜索批次号，如1、2、3',
    procSearchPlaceholder: '搜索商品…',
    procSearchProducts: '搜索产品名、供应商…',
    procSelected: '已选',
    procSettle: '清账',
    procSettleAt: '清账时间',
    procSettleBy: '经手人',
    procSettleInfo: '清账信息',
    procSettleMsg: '把这笔进货标记为已清账？清账后无法撤销。',
    procSettleSuccess: '已标记为已清账',
    procSettleTitle: '确认清账',
    procSettled: '已清账',
    procSubmit: '提交进货单',
    procSubmitted: '进货单已提交',
    procSubmittedMsg: '本次进货记录已保存',
    procSubtotal: '小计',
    procThisBatch: '本次货款',
    procTitle: '进货管理',
    procTotal: '本次合计',
    procUnit: '种',
    procUnsettled: '未清账',
    procUpdated: '进货单已更新',
    procUpdatedMsg: '本次进货记录已更新',
    procViewDetail: '查看明细',
    procViewRecords: '查看记录',
    procurement: '进货',
    profileEmail: '电子邮箱',
    profit: '利润',
    pwHint: '8位以上，含字母+数字+特殊字符',
    realName: '用户姓名',
    receiptExpenseLabel: '查看凭证',
    receivable: '应收总额',
    reconComplete: '对账完成',
    reconDate: '对账日期',
    reconHistory: '对账记录',
    reconciledBy: '对账人',
    recordedBy: '录入人',
    recrop: '重新裁剪',
    refundAmount: '退款金额（元）',
    refundMode: '退款模式',
    register: '注册',
    registerBtn: '注 册',
    registrationTime: '注册时间',
    remarks: '备注',
    rememberMe: '记住我',
    rent: '房租',
    resendCode: '重新发送',
    reset: '重置',
    resetBtn: '重 置',
    resetDefault: '恢复默认',
    resetHint: '验证码已发送至',
    restoreAccount: '恢复账户',
    retry: '重试',
    revCancelArchive: '取消歇业',
    revClosedReason: '今日歇业',
    revEmpty: '暂无营收记录',
    revEmptyHint: '开始录入今天的营收数据吧',
    revEntered: '已录入',
    revHistory: '近7天记录',
    revHistoryBtn: '历史记录',
    revJD: '京东营收',
    revJDSub: '京东平台收款',
    revMarkArchive: '标记歇业',
    revNotEntered: '未录入',
    revNote: '备注',
    revNoteHint: '如：今日活动、特殊事件',
    revQuickDB4: '前天',
    revQuickToday: '今天',
    revQuickYesterday: '昨天',
    revRevenue: '营业额收入',
    revRevenueSub: '实际到账金额',
    revSaveDate: '储存{date}数据',
    revSaveDayBefore: '储存前日数据',
    revSaveToday: '储存今日数据',
    revSaveYesterday: '储存昨日数据',
    revSubmit: '确认录入',
    revTurnover: '营业额',
    revTurnoverSub: '总销售流水额',
    revWeekJD: '近30日京东营收',
    revWeekRevenue: '近30日营业额收入',
    revWeekTurnover: '近30日营业额',
    revYesterdayLabel: '昨日:',
    revYesterdayNA: '—',
    revenue: '营业额',
    revenueDate: '营收日期',
    role: '角色',
    roundNote: '轮次备注',
    salary: '薪资',
    save: '保存',
    saveImage: '保存图片',
    saving: '保存中…',
    searchUser: '搜索用户',
    securitySettings: '安全设置',
    selectPartner: '选择合伙人',
    sendCode: '发送验证码',
    sessionKickedButton: '我知道了',
    sessionKickedTitle: '账号已退出',
    sessionKickedToast: '您的账号在其他设备登录，当前会话已退出',
    sessionTimeoutDesc: '超过该时长未操作自动退出',
    sessionTimeoutLabel: '超时时间',
    shangouWaimai: '闪购外卖',
    share: '分享',
    shareCalcResult: '穿透股权计算结果：',
    shareFailed: '分享失败',
    shareImage: '分享图片',
    shareLink: '分享链接',
    sharePDF: '分享 PDF',
    sharePercent: '持股',
    shareTo: '已分享至 {label}',
    shareholders: '位股东',
    signaturePlaceholder: '这个人很懒，什么都没留下...',
    signatureSaved: '签名已保存',
    ssoDesc: '最多一台设备同时登录',
    ssoLabel: '单设备登录',
    staff: '员工',
    stampPrefixBurgundy: '以此身，阅尽这',
    stampPrefixObsidian: '时序轮转，流光已掷下第',
    stampPrefixTeal: '星霜未歇，我们已共渡',
    stampSuffixBurgundy: '日的晨昏与烟火。',
    stampSuffixObsidian: '道鞭影。',
    stampSuffixTeal: '次潮落潮生。',
    status: '状态',
    statusFilter: '状态筛选',
    stayPage: '留在本页',
    subscribedTotal: '认缴总额',
    subtitle: '生活不简单，尽量简单过',
    summary: '收支总览',
    tabExpense: '支出',
    tabRecon: '对账',
    tabRevenue: '营业',
    tapForDetail: '点击卡片查看详情',
    taxId: '公司税号',
    themeLabel: '主题',
    themePicker: '主题方案',
    toastLoadFailed: '数据加载失败',
    toastSubmitFailed: '提交失败，请重试',
    today: '今日',
    todayExpense: '今日支出',
    todayIncome: '今日收入',
    todayProfit: '今日利润',
    totalCapital: '合伙初始基金总额',
    totalDividends: '累计分红',
    totalDividendsPaid: '累计分红',
    totalInvest: '总出资',
    totalRecords: '共 {n} 条数据',
    totalToPool: '拟向红利池注入的总金额 (元)',
    totalUsers: '共 {n} 个用户',
    transactions: '交易记录',
    tuan: '团购',
    unlinkPartner: '解除关联',
    unlinked: '未关联',
    uploadFailed: '上传失败，请重试',
    uploadFailedShort: '上传失败',
    uploadFileTip: '支持 jpg/png/webp/pdf，单张最大 10MB',
    uploadImage: '凭证上传',
    takePhoto: '拍照',
    chooseFromLibrary: '照片图库',
    chooseFile: '选择文件',
    uploading: '上传中...',
    usePasswordLogin: '密码登录',
    useThisAvatar: '使用此头像',
    useThisBg: '使用此背景图',
    useThisCover: '使用此封面',
    userDetail: '用户详情',
    userId: '用户ID',
    userManagement: '用户管理',
    userMgmt: '用户管理',
    username: '登录账号',
    verifyBtn: '验 证',
    verifyCode: '验证码',
    verifyEmail: '验证邮箱',
    verifyNewBodyPost: '。请前往查收并点击链接完成验证。',
    verifyNewBodyPre: '欢迎加入柳味探秘科技！一封装有激活密码的邮件已经飞往您的邮箱：',
    verifyNewEditEmail: '修改邮箱地址',
    verifyNewNoEmail: '一直没收到？别着急，您可以 ',
    verifyNewOrSpam: ' 或检查一下垃圾箱。',
    verifyNewResend: '重新发送',
    verifyNewTitle: '只差最后一步啦！✨',
    verifyNewWrongEmail: '填错邮箱了？',
    verifying: '验证中...',
    wages: '工资',
    willDelete: '将删除「',
    yesterdayExpense: '昨日支出',
    yesterdayIncome: '昨日收入',
    yesterdayProfit: '昨日利润',
  },
  'zh-TW': {
    accountCooldown: '帳戶已進入冷靜期',
    accountInfo: '帳號資訊',
    actualReceived: '實收金額',
    addFeeEntry: '錄入手續費',
    addImage: '添加',
    additional: '追加投資',
    addressPhone: '公司地址',
    adminCannotDelete: '管理員帳戶無法註銷。如需停用，請聯繫其他管理員操作。',
    all: '全部',
    allDividendRecords: '」的所有分紅記錄',
    allowLogin: '允許登入',
    amount: '金額',
    amountLabel: '輸入金額（元）',
    any: '不限',
    apply: '應用',
    atLeastOneFee: '至少輸入一個平台的手續費',
    authSettingsTitle: '登入安全',
    autoByShare: '按股權穿透比例自動分配',
    avatarCropTitle: '調整頭像',
    avatarSizeHint: '在不同場景下的顯示效果',
    avatarUpdated: '頭像已更新',
    back: '返回',
    backToList: '返回列表',
    backToLogin: '返回登錄',
    bankAccount: '銀行賬號',
    bankName: '開戶銀行',
    basicInfo: '基本資訊',
    batchLabel: '{date} · 第{n}次分紅',
    bgHint: '選擇一張圖片作為首頁背景',
    bgResultHint: '將作為首頁全屏背景',
    bgSettings: '主題設定',
    bgUpdated: '背景圖已更新',
    billDate: '賬單日期',
    bookBalance: '賬面餘額',
    bookDiff: '賬面差額',
    byRoundAndInvest: '按分紅輪次與出資分組',
    cancel: '取消',
    capitalLedger: '合夥人資本賬目流水表',
    cardBalance: '卡餘額',
    cashBalance: '現金',
    cashOnHand: '賬面餘額',
    ceo: 'CEO',
    chairman: '董事長',
    changeEmail: '更換郵箱',
    changePassword: '修改密碼',
    chartSwitchBar: '柱狀圖',
    chartSwitchDay: '日',
    chartSwitchHint: '點擊切換視圖',
    chartSwitchMonth: '月',
    chartSwitchPie: '餅圖',
    chartXAxis: '月份',
    chartXAxisDay: '每日',
    chartYAxis: '金額（元）',
    chooseImage: '選擇圖片',
    clear: '清空',
    codeSent: '驗證碼已發送',
    companyAddress: '公司地址',
    companyBankAccount: '銀行帳號',
    companyBankName: '開戶銀行',
    companyName: '公司名稱',
    companyPhone: '公司電話',
    companyTaxId: '公司稅號',
    confirm: '確認',
    confirmDelete: '確認刪除？',
    confirmDeleteRecord: '確認刪除',
    confirmDisable: '關閉面容',
    confirmIssue: '確認發放並記賬',
    confirmLogout: '確定登出',
    confirmNewPassword: '確認新密碼',
    confirmPassword: '確認密碼',
    confirmRecord: '確認記錄',
    confirmUnlinkMsg: '確認解除與 {name} 的關聯？',
    confirmUse: '確認使用',
    copyright: '© 2026 柳味探秘 · 經營查詢 · 版權所有',
    coverCropTitle: '編輯封面',
    coverHint: '將作為個人中心頂部封面展示',
    coverUpdated: '封面已更新',
    createdAt: '創建時間',
    cropFailed: '裁切失敗，請重試',
    cropFlip: '翻轉',
    cropPill: '拖動移動 · 雙指縮放',
    cropRotate: '旋轉',
    cumulativeByShare: '累計派發 · 按比例分配',
    cumulativeExpense: '實際支出',
    cumulativeRevenue: '實際收入',
    currentBalance: '實際結餘',
    daily: '日常',
    dailyProfit: '每日利潤',
    dailyRevenue: '每日營收',
    dailyTrend: '每日收支趨勢',
    dangerZone: '危險操作',
    date: '日期',
    dateFrom: '開始日期',
    dateTo: '結束日期',
    delete: '刪除',
    deleteAccount: '註銷帳戶',
    deleteAccountBtn: '確認註銷',
    deleteAccountConfirmMsg: '註銷後所有資料將被永久刪除，不可恢復。確定繼續嗎？',
    deleteAccountConfirmTitle: '確認註銷帳戶',
    deleteAccountGraceNote: '您的帳戶將進入 3 天冷靜期，期滿後永久註銷。在此期間登入即可自動恢復帳戶。',
    deleteAccountSuccess: '帳戶已註銷',
    deleteRecord: '刪除',
    deleteUser: '刪除用戶',
    deleteUserConfirm: '確認刪除該用戶，該用戶的所有數據（交易記錄、進貨記錄等）也將一併刪除',
    deleteUserGraceNote: '帳戶將進入 5 天冷靜期，期滿後永久刪除並轉移經營數據至管理員。冷靜期內您可隨時恢復。',
    disableFaceIDConfirm: '關閉後需重新設定面容才能再次使用。確定關閉嗎？',
    devCodeLabel: '🔧 開發模式 — 驗證碼',
    dineIn: '堂食',
    disabledStatus: '禁用',
    discountAmount: '優惠減免',
    displayName: '登入帳號',
    distributedPool: '已派發分紅池',
    dividend: '分紅',
    dividendHistory: '分紅歷史',
    dividendRoundFmt: '第{n}次分紅 · {date}',
    dividendRoundOnly: '第{n}次分紅',
    done: '完成',
    downloadImage: '下載圖片',
    downloadPdf: '下載PDF',
    edit: '編輯',
    editBg: '編輯背景圖',
    editCover: '更換封面',
    editProfile: '個人中心',
    email: '郵箱',
    emailAction: '郵件',
    emailBodyExtra: '（連結 24 小時內有效）',
    emailUpdated: '郵箱已更新',
    emptyExpenseHint: '每完成一次記賬，這裡就多一條記錄',
    emptyInvoiceHint: '每開一張發票，這裡就多一張小卡片',
    emptyReconHint: '每完成一次對賬，這裡就多一張小卡片',
    enterAmount: '輸入金額',
    enterCode: '輸入驗證碼',
    enterUsernameToConfirm: '請輸入用戶名以確認註銷',
    entryDate: '錄入日期',
    errDateFuture: '不能選擇未來的日期',
    errDateRange: '結束日期必須晚於開始日期',
    errDateRangeTooLong: '日期範圍不能超過 24 個月',
    errEmailInvalid: '郵箱格式不正確',
    errPhoneInvalid: '請輸入正確的手機號碼',
    errBankCardInvalid: '卡號有誤',
    errEmptyFields: '請填寫所有字段',
    errEnterCode: '請輸入驗證碼',
    errFileSize: '圖片不能超過10MB',
    errNetworkError: '網絡錯誤，請檢查網絡後重試',
    errOldPwRequired: '請輸入當前密碼',
    errPwMismatch: '兩次密碼不一致',
    errPwNeedLetter: '密碼必須包含字母',
    errPwNeedNumber: '密碼必須包含數字',
    errPwNeedSpecial: '密碼必須包含特殊字符',
    errPwRequirements: '密碼須8位以上，包含字母、數字、特殊字符',
    errPwTooShort: '密碼至少 8 位',
    errUserInfoUnavailable: '無法獲取用戶信息',
    errWrongCredentials: '帳號或密碼錯誤',
    errWrongPassword: '密碼錯誤',
    err_partner_cannot_delete: '合夥人帳戶無法註銷。如需停用，請聯繫管理員操作。',
    err_user_linked_partner: '該用戶身為合夥人，不可刪除，解除關聯，即可刪除。',
    expConfirmMsg: '提交後將無法修改，確定要記錄嗎？',
    expConfirmTitle: '確認記錄',
    expDate: '日期',
    expDetail: '支出詳情',
    expSavedMsg: '支出已更新，是否返回列表？',
    expTotalAmount: '支出金額',
    expUpdated: '支出已更新',
    expense: '支出',
    expenseBreakdown: '支出分類佔比',
    expenseBreakdownOfMonth: '支出分類佔比',
    expenseCategory: '支出分類',
    expenseDate: '支出日期',
    expenseHistory: '支出記錄',
    expenseNote: '支出說明',
    faceIDDesc: '使用面容快速登入',
    faceIDLabel: '面容登入',
    faceIDLogin: '面容登入',
    feeAllMonths: '全部',
    feeCurrent: '當期手續費',
    feeDetail: '更新手續費',
    feeEntry: '今日手續費',
    feeNotUpdated: '請先錄入手續費，再發起對賬',
    enterFeeFirst: '先錄入手續費',
    reconLater: '稍後再對',
    feeHistory: '歷史明細',
    feePreview: '累計手續費',
    feeViewDetail: '檢視明細',
    filledBy: '填寫人',
    filterCategory: '支出分類',
    filterDate: '日期',
    flashSale: '閃購',
    forgotPassword: '忘記密碼？',
    forgotSendBtn: '發送驗證碼',
    forgotStep1: '請輸入註冊郵箱',
    friendlyReminder: '溫馨提示',
    fullyPaidBack: '已回本 ✓',
    fullyPaidBackDetail: '已完全回本 ✓',
    fundsInTransit: '在途資金',
    goBack: '返回',
    goods: '採購',
    graceStatus: '冷靜期中',
    imgNotLoaded: '圖片未加載',
    income: '收入',
    initial: '初始出資',
    initialInvest: '初始出資',
    invApply: '申請開票',
    invApplyAmount: '申請金額',
    invAutoFilled: '已自動填入',
    invBankInfo: '銀行信息',
    invCenter: '發票管理',
    invContact: '聯繫開票方',
    invPleaseMaintain: '請維護信息',
    invDelConfirmPrefix: '此操作將刪除「',
    invDelConfirmSuffix: '」開票數據，請謹慎操作。',
    invDownload: '下載',
    invDownloading: '正在下載…',
    invDrawerAmount: '開票金額',
    invDrawerBatch: '關聯批次號',
    invDrawerBatchPlaceholder: '選擇採購批次號',
    invDrawerBuyer: '公司名稱',
    invDrawerDate: '開票日期',
    invDrawerNote: '開票說明',
    invDrawerNotePlaceholder: '貨物或服務名稱（可選）',
    invDrawerRef: '關聯單號',
    invDrawerTaxId: '公司稅號',
    invDrawerType: '發票類型',
    invEdit: '編輯',
    invEditBank: '編輯銀行信息',
    invEditInfo: '編輯開票信息',
    invEmail: '接收郵箱',
    invEmpty: '暫無發票記錄',
    invExportToast: '導出記錄功能',
    invFileUploaded: '已上傳發票',
    invFilterAll: '全部',
    invFilterDone: '已開具',
    invFilterPending: '待開具',
    invFilterRejected: '已作廢',
    invGeneral: '普通發票',
    invGeneralFull: '增值稅普通發票',
    invHeaderInfo: '抬頭信息',
    invInfoTab: '開票信息',
    invLabel: 'Invoice',
    invOptional: '可選',
    invPending: '待處理',
    invReapply: '重新申請',
    invRecAddTitle: '新增開票記錄',
    invRecConfirmDelete: '確定要刪除這條開票記錄嗎？',
    invRecDeleteOk: '已刪除',
    invRecEditTitle: '編輯開票記錄',
    invRecEmpty: '暫無開票記錄',
    invRecInvoiceNo: '發票票號',
    invRecMarkDone: '標記為已開',
    invRecSaveOk: '保存成功',
    invRecStatusDone: '已開票',
    invRecStatusPending: '待開票',
    invReceipt: '收據',
    invReceiveMethod: '收票方式',
    invRecordsTab: '發票記錄',
    invSave: '保存',
    invSaved: '保存成功',
    invSelectBatch: '選擇批次',
    invSettingsToast: '設置',
    invShareToast: '分享發票',
    invStatus: '開票狀態',
    invStatusDone: '已開具',
    invStatusPending: '待開具',
    invStatusRejected: '已作廢',
    invSubmit: '提交申請',
    invSubmitDone: '申請已提交，預計1-3個工作日開具',
    invTaxAmount: '含稅金額',
    invTips: '開票信息將自動填入申請表單，確保稅號準確以免開具失敗。',
    invTitle: '開票管理中心',
    invToInvoice: '去開票',
    invTotalAmount: '開票總額',
    invTotalCount: '累計開票',
    invTypePref: '發票類型偏好',
    invUploadFiles: '上傳發票',
    invUploadHint: '最多上傳9張',
    invUploadInvoice: '上傳發票',
    invUrge: '催一下',
    invVatSpecial: '增值稅專票',
    invVatSpecialFull: '增值稅專用發票',
    invest: '出資',
    investComplete: '出資完結',
    invoiceSave: '保存',
    invoiceSaved: '成功',
    invoiceSaving: '...',
    invoiceTitle: '開票信息',
    issueDividend: '發起分紅',
    issueProportional: '發起比例分紅',
    janitor: '打雜',
    jd: '京東',
    jokeClosedLoop: '「一個董事長負責畫餅，一個CEO負責烙餅，一個打雜的負責吃餅 —— 完美的商業閉環」',
    jokeRecon: '已為您載入最近一次對賬數據，請核對賬單日期是否正確。',
    language: '語言',
    anyDate: '任何日期',
    last30Days: '近30天',
    last3Months: '近3月',
    last7Days: '近7天',
    lastLogin: '最後登入',
    linkCopied: '連結已複製',
    linkPartner: '關聯',
    linkedPartner: '關聯合夥人',
    loadMore: '載入更多',
    loading: '載入中...',
    login: '登錄',
    loginBtn: '登 錄',
    loginDisabledHint: '關閉後，用戶將無法登入系統',
    loginPlaceholder: '用戶名 / 郵箱',
    loginStatus: '登入狀態',
    logout: '登出',
    logoutConfirm: '確定要登出嗎？',
    lpControl: '有限合夥控股',
    lpStructure: '有限合夥控股結構',
    manager: '店長',
    markRead: '已讀',
    meituan: '美團',
    meituanCashier: '美團收銀',
    meituanTuan: '美團團購',
    meituanWaimai: '美團外賣',
    mid: '追加',
    month: '本月',
    month1: '1月',
    month10: '10月',
    month11: '11月',
    month12: '12月',
    month2: '2月',
    month3: '3月',
    month4: '4月',
    month5: '5月',
    month6: '6月',
    month7: '7月',
    month8: '8月',
    month9: '9月',
    monthExpense: '本月支出',
    monthIncome: '本月收入',
    monthProfit: '本月利潤',
    monthUnit: '月',
    monthlyProfit: '月度利潤',
    monthlyTrend: '月度收支趨勢',
    nameJiang: '江寬',
    nameLan: '藍柳富',
    nameZhang: '張安武',
    newEmail: '新郵箱',
    newPassword: '新密碼',
    newUserBadge: '新註冊',
    noDividendRecords: '暫無分紅記錄',
    noExpenseRecords: '暫無支出記錄',
    noRecords: '暫無記錄',
    noUsers: '暫無用戶',
    normalStatus: '正常',
    normalUser: '打雜',
    notePlaceholder: '如：蔥、香菜、電費',
    oldPassword: '當前密碼',
    opacity: '透明度',
    otherInfo: '其他資訊',
    paidInRate: '實繳率',
    partnerSeats: '合夥席位',
    partnerStructure: '合夥架構',
    partnerTitle: '柳味探秘科技合夥人',
    password: '密碼',
    passwordChanged: '密碼已修改',
    payAlipay: '支付寶',
    payBank: '銀行卡',
    payCash: '現金',
    payOther: '其他',
    payWechat: '微信',
    paybackProgress: '回本進度',
    paybackRate: '回本率',
    paymentMethod: '支付方式',
    pdfGenerating: '進貨單PDF生成中…',
    pdfLoadFailed: 'PDF 載入失敗',
    pdfLoading: '載入 PDF 中…',
    pendingPayback: '待回',
    phone: '手機號碼',
    platformFee: '平台手續費',
    preferences: '偏好設定',
    procAddProduct: '添加產品',
    procAll: '全部',
    procSelectSupplier: '選擇供應商',
    procBatchCount: '歷史批次',
    procBatchLabel: '採購批次',
    procCartCount: '已選 {n} 種',
    procComingSoon: '即將',
    procConfirmOrder: '確認進貨單',
    procContinue: '繼續進貨',
    procCumulative: '累計貨款',
    procDeleteBatch: '刪除批次',
    procDeleteBatchConfirm: '確定刪除第{n}次進貨？關聯的支出記錄也會一併刪除。',
    procDeleteBatchConfirmV2: '確定刪除「{batch}」？關聯的支出記錄也會一併刪除。',
    procDeleteProduct: '刪除產品',
    procDeleteProductConfirm: '確定刪除「{name}」？',
    procDeleteProductWarning: '刪除後歷史批次中該商品將無法顯示名稱。',
    procDetail: '進貨詳情',
    procEditBatch: '編輯第{n}次進貨',
    procEditProduct: '編輯產品',
    procEmptyHistoryHint: '完成進貨後，記錄會顯示在這裡',
    procEmptyHistoryTitle: '還沒有進貨記錄',
    procEmptyNewHint: '請先在「產品維護」中添加產品，再回來下單',
    procEmptyNewTitle: '還沒有產品',
    procEmptyProductsHint: '點擊上方「+ 添加產品」開始維護產品目錄',
    procEmptyProductsTitle: '還沒有產品',
    procGenerating: '生成中...',
    procGeneratingPDF: '正在生成進貨單…',
    procHistory: '進貨記錄',
    procImages: '憑證預覽',
    procManageProducts: '管理產品',
    procMargin: '貨款利潤率',
    procNewOrder: '新建進貨',
    procNoHistory: '暫無進貨記錄',
    procNoteHintAddress: '請填寫提貨聯繫地址',
    procNoteHintPhone: '請填寫提貨聯繫電話',
    procNoteLabel: '備註',
    procNoteOptional: '可選備註',
    procNowBatch: '第{n}次進貨',
    procOperator: '經辦人',
    procOrderDate: '進貨日期',
    procOrderItems: '進貨明細',
    procPaymentMethod: '支付方式',
    procPdfTitle: '進貨單 #{n}',
    procProduct: '商品',
    procProductMgmt: '產品維護',
    procProductName: '產品名稱',
    procProductNote: '備註（選填）',
    procProductPrice: '單價',
    procProductSpec: '規格',
    procProductSupplier: '供應商',
    procPurchase: '採購',
    procSearchHistory: '搜尋批次號，如1、2、3',
    procSearchPlaceholder: '搜尋商品…',
    procSearchProducts: '搜尋產品名、供應商…',
    procSelected: '已選',
    procSettle: '清賬',
    procSettleAt: '清賬時間',
    procSettleBy: '經辦人',
    procSettleInfo: '清賬資訊',
    procSettleMsg: '把這筆進貨標記為已清賬？清賬後無法撤銷。',
    procSettleSuccess: '已標記為已清賬',
    procSettleTitle: '確認清賬',
    procSettled: '已清賬',
    procSubmit: '提交進貨單',
    procSubmitted: '進貨單已提交',
    procSubmittedMsg: '本次進貨記錄已儲存',
    procSubtotal: '小計',
    procThisBatch: '本次貨款',
    procTitle: '進貨管理',
    procTotal: '本次合計',
    procUniqueItems: '本單品類',
    procUnit: '種',
    procUnsettled: '未清賬',
    procUpdated: '進貨單已更新',
    procUpdatedMsg: '本次進貨記錄已更新',
    procUploadHint: '點擊上傳票據（支持多張）',
    procUploadReceipt: '上傳票據',
    procViewDetail: '檢視明細',
    procViewRecords: '檢視記錄',
    procurement: '進貨',
    profileEmail: '電子郵箱',
    profit: '利潤',
    pwHint: '8位以上，含字母+數字+特殊字符',
    realName: '用戶姓名',
    receiptExpenseLabel: '查看憑證',
    receivable: '應收總額',
    reconComplete: '對賬完成',
    reconDate: '對賬日期',
    reconHistory: '對賬記錄',
    reconciledBy: '對賬人',
    recordedBy: '錄入人',
    recrop: '重新裁剪',
    refundAmount: '退款金額（元）',
    refundMode: '退款模式',
    register: '註冊',
    registerBtn: '註 冊',
    registrationTime: '註冊時間',
    remarks: '備註',
    rememberMe: '記住我',
    rent: '房租',
    resendCode: '重新發送',
    reset: '重置',
    resetBtn: '重 置',
    resetDefault: '恢復默認',
    resetHint: '驗證碼已發送至',
    restoreAccount: '恢復帳戶',
    retry: '重試',
    revCancelArchive: '取消歇業',
    revClosedReason: '今日歇業',
    revConfirmDelete: '確定刪除這條營收記錄？',
    revDateConflict: '該日期已有營收記錄',
    revDelete: '刪除',
    revEdit: '編輯',
    revEmpty: '暫無營收記錄',
    revEmptyHint: '開始錄入今天的營收數據吧',
    revEntered: '已錄入',
    revHistory: '近7天記錄',
    revHistoryBtn: '歷史記錄',
    revJD: '京東營收',
    revJDSub: '京東平台收款',
    revMarkArchive: '標記歇業',
    revNotEntered: '未錄入',
    revNote: '備註',
    revNoteHint: '如：今日活動、特殊事件',
    revQuickDB4: '前天',
    revQuickToday: '今天',
    revQuickYesterday: '昨天',
    revRevenue: '營業額收入',
    revRevenueSub: '實際到賬金額',
    revSaveDate: '儲存{date}數據',
    revSaveDayBefore: '儲存前日數據',
    revSaveToday: '儲存今日數據',
    revSaveYesterday: '儲存昨日數據',
    revSubmit: '確認錄入',
    revToday: '今日營收',
    revTurnover: '營業額',
    revTurnoverSub: '總銷售流水額',
    revWeekJD: '近30日京東營收',
    revWeekRevenue: '近30日營業額收入',
    revWeekTurnover: '近30日營業額',
    revYesterdayLabel: '昨日:',
    revYesterdayNA: '—',
    revenue: '營業額',
    revenueDate: '营收日期',
    role: '角色',
    roundNote: '輪次備註',
    salary: '薪資',
    save: '保存',
    saveImage: '儲存圖片',
    saving: '保存中…',
    searchUser: '搜尋用戶',
    securitySettings: '安全設定',
    selectPartner: '選擇合夥人',
    sendCode: '發送驗證碼',
    sessionKickedButton: '我知道了',
    sessionKickedTitle: '帳號已登出',
    sessionKickedToast: '您的帳號在其他裝置登入，當前工作階段已退出',
    sessionTimeoutDesc: '超過該時長未操作自動退出',
    sessionTimeoutLabel: '超時時間',
    shangouWaimai: '閃購外賣',
    share: '分享',
    shareCalcResult: '穿透股權計算結果：',
    shareFailed: '分享失敗',
    shareImage: '分享圖片',
    shareLink: '分享連結',
    sharePDF: '分享 PDF',
    sharePercent: '持股',
    shareTo: '已分享至 {label}',
    shareholders: '位股東',
    signaturePlaceholder: '這個人很懶，什麼都沒留下...',
    signatureSaved: '簽名已保存',
    ssoDesc: '最多一台裝置同時登入',
    ssoLabel: '單一裝置登入',
    staff: '員工',
    stampPrefixBurgundy: '以此身，閱盡這',
    stampPrefixObsidian: '時序輪轉，流光已擲下第',
    stampPrefixTeal: '星霜未歇，我們已共渡',
    stampSuffixBurgundy: '日的晨昏與煙火。',
    stampSuffixObsidian: '道鞭影。',
    stampSuffixTeal: '次潮落潮生。',
    status: '狀態',
    statusFilter: '狀態篩選',
    stayPage: '留在本頁',
    subscribedTotal: '認繳總額',
    subtitle: '生活不簡單，盡量簡單過',
    summary: '收支總覽',
    tabExpense: '支出',
    tabRecon: '對賬',
    tabRevenue: '營業',
    tapForDetail: '點擊卡片檢視詳情',
    taxId: '公司稅號',
    themeLabel: '主題',
    themePicker: '主題方案',
    toastLoadFailed: '資料載入失敗',
    toastSubmitFailed: '提交失敗，請重試',
    today: '今日',
    todayExpense: '今日支出',
    todayIncome: '今日收入',
    todayProfit: '今日利潤',
    totalCapital: '合夥初始基金總額',
    totalDividends: '累計分紅',
    totalDividendsPaid: '累計分紅',
    totalInvest: '總出資',
    totalRecords: '共 {n} 筆資料',
    totalToPool: '擬向紅利池注入的總金額 (元)',
    totalUsers: '共 {n} 個用戶',
    transactions: '交易記錄',
    tuan: '團購',
    unlinkPartner: '解除關聯',
    unlinked: '未關聯',
    uploadFailed: '上傳失敗，請重試',
    uploadFailedShort: '上傳失敗',
    uploadFileTip: '支援 jpg/png/webp/pdf，單張最大 10MB',
    uploadImage: '憑證上傳',
    takePhoto: '拍照',
    chooseFromLibrary: '照片圖庫',
    chooseFile: '選擇檔案',
    uploading: '上傳中...',
    usePasswordLogin: '密碼登錄',
    useThisAvatar: '使用此頭像',
    useThisBg: '使用此背景圖',
    useThisCover: '使用此封面',
    userDetail: '用戶詳情',
    userId: '用戶ID',
    userManagement: '用戶管理',
    userMgmt: '用戶管理',
    username: '登入帳號',
    verifyBtn: '驗 證',
    verifyCode: '驗證碼',
    verifyEmail: '驗證郵箱',
    verifyNewBodyPost: '。請前往查收並點擊鏈接完成驗證。',
    verifyNewBodyPre: '歡迎加入柳味探秘科技！一封装有激活密碼的郵件已經飛往您的郵箱：',
    verifyNewEditEmail: '修改郵箱地址',
    verifyNewNoEmail: '一直沒收到？別着急，您可以 ',
    verifyNewOrSpam: ' 或檢查一下垃圾箱。',
    verifyNewResend: '重新發送',
    verifyNewTitle: '只差最後一步啦！✨',
    verifyNewWrongEmail: '填錯郵箱了？',
    verifying: '驗證中...',
    wages: '工資',
    willDelete: '將刪除「',
    yesterdayExpense: '昨日支出',
    yesterdayIncome: '昨日收入',
    yesterdayProfit: '昨日利潤',
  },
  'en': {
    accountCooldown: 'Account in cooldown',
    accountInfo: 'Account Info',
    actualReceived: 'Actual Received',
    addFeeEntry: 'Add Fee',
    addImage: 'Add',
    additional: 'Additional Capital',
    addressPhone: 'Company Address',
    adminCannotDelete: 'Admin account cannot be deleted. Please contact another admin if you need to disable it.',
    all: 'All',
    allDividendRecords: '」 all dividend records',
    allowLogin: 'Allow Login',
    amount: 'Amount',
    amountLabel: 'Amount (¥)',
    any: 'Any',
    apply: 'Apply',
    atLeastOneFee: 'Please enter at least one platform fee',
    authSettingsTitle: 'Sign-in Security',
    autoByShare: 'Auto-distribute by share ratio',
    avatarCropTitle: 'Adjust Avatar',
    avatarSizeHint: 'Preview in different sizes',
    avatarUpdated: 'Avatar updated',
    back: 'Back',
    backToList: 'Back to list',
    backToLogin: 'Back to login',
    bankAccount: 'Bank Account',
    bankName: 'Bank',
    basicInfo: 'Basic Info',
    batchLabel: '{date} · Batch #{n}',
    bgHint: 'Choose an image as home page background',
    bgResultHint: 'Will be used as fullscreen home background',
    bgSettings: 'Theme',
    bgUpdated: 'Background Updated',
    billDate: 'Bill Date',
    bookBalance: 'Book Balance',
    bookDiff: 'Difference',
    byRoundAndInvest: 'By dividend round & investment',
    cancel: 'Cancel',
    capitalLedger: 'Partner Capital Ledger',
    cardBalance: 'Card Balance',
    cashBalance: 'Cash',
    cashOnHand: 'Book Balance',
    ceo: 'CEO',
    chairman: 'Chairman',
    changeEmail: 'Change Email',
    changePassword: 'Change Password',
    chartSwitchBar: 'Bar Chart',
    chartSwitchDay: 'Day',
    chartSwitchHint: 'Tap to switch',
    chartSwitchMonth: 'Month',
    chartSwitchPie: 'Pie Chart',
    chartXAxis: 'Month',
    chartXAxisDay: 'Daily',
    chartYAxis: 'Amount (¥)',
    chooseImage: 'Choose Image',
    clear: 'Clear',
    codeSent: 'Code sent',
    companyAddress: 'Company Address',
    companyBankAccount: 'Bank Account',
    companyBankName: 'Bank Name',
    companyName: 'Company Name',
    companyPhone: 'Company Phone',
    companyTaxId: 'Tax ID',
    confirm: 'Confirm',
    confirmDelete: 'Confirm delete?',
    confirmDeleteRecord: 'Confirm Delete',
    confirmDisable: 'Disable',
    confirmIssue: 'Confirm & Record',
    confirmLogout: 'Confirm Logout',
    confirmNewPassword: 'Confirm New Password',
    confirmPassword: 'Confirm Password',
    confirmRecord: 'Record',
    confirmUnlinkMsg: 'Confirm unlink from {name}?',
    confirmUse: 'Confirm',
    copyright: '© 2026 LiuWei TanMi · Business Dashboard · All Rights Reserved',
    coverCropTitle: 'Edit Cover',
    coverHint: 'Will be displayed as your profile banner',
    coverUpdated: 'Cover Updated',
    createdAt: 'Created At',
    cropFailed: 'Crop failed, please retry',
    cropFlip: 'Flip',
    cropPill: 'Drag · Pinch to zoom',
    cropRotate: 'Rotate',
    cumulativeByShare: 'Cumulative · by share ratio',
    cumulativeExpense: 'Actual Expense',
    cumulativeRevenue: 'Actual Income',
    currentBalance: 'Actual Balance',
    daily: 'OpEx',
    dailyProfit: 'Daily Profit',
    dailyRevenue: 'Daily Revenue',
    dailyTrend: 'Daily Trend',
    dangerZone: 'Danger Zone',
    date: 'Date',
    dateFrom: 'From',
    dateTo: 'To',
    delete: 'Delete',
    deleteAccount: 'Delete Account',
    deleteAccountBtn: 'Confirm Deletion',
    deleteAccountConfirmMsg: 'All data will be permanently deleted and cannot be recovered. Are you sure?',
    deleteAccountConfirmTitle: 'Confirm Account Deletion',
    deleteAccountGraceNote: 'Your account will enter a 3-day grace period before being permanently deleted. Log in during this time to auto-restore it.',
    deleteAccountSuccess: 'Account deleted',
    deleteRecord: 'Delete',
    deleteUser: 'Delete User',
    deleteUserConfirm: 'Are you sure you want to delete this user? All associated data (transactions, procurement records, etc.) will also be deleted.',
    deleteUserGraceNote: 'Account will enter a 5-day grace period before being permanently deleted. Business data will be transferred to admin. You can restore at any time during the grace period.',
    disableFaceIDConfirm: 'When disabled, you will need to re-enable Face ID to use it again. Are you sure?',
    devCodeLabel: '🔧 Dev Mode — Verification Code',
    dineIn: 'Dine-in',
    disabledStatus: 'Disabled',
    discountAmount: 'Discount',
    displayName: 'Login Account',
    distributedPool: 'Distributed Pool',
    dividend: 'Dividend',
    dividendHistory: 'Dividend History',
    dividendRoundFmt: 'Dividend #{n} · {date}',
    dividendRoundOnly: 'Dividend #{n}',
    done: 'Done',
    downloadImage: 'Download Image',
    downloadPdf: 'Download PDF',
    edit: 'Edit',
    editBg: 'Edit Background',
    editCover: 'Change Cover',
    editProfile: 'Profile',
    email: 'Email',
    emailAction: 'Email',
    emailBodyExtra: '(link valid for 24h)',
    emailUpdated: 'Email updated',
    emptyExpenseHint: 'Each expense record will appear here',
    emptyInvoiceHint: 'Each invoice record will appear here',
    emptyReconHint: 'Each reconciliation adds a card here',
    enterAmount: 'Enter amount',
    enterCode: 'Enter code',
    enterUsernameToConfirm: 'Enter your username to confirm deletion',
    entryDate: 'Entry Date',
    errDateFuture: 'Cannot select a future date',
    errDateRange: 'End date must be after start date',
    errDateRangeTooLong: 'Date range cannot exceed 24 months',
    errEmailInvalid: 'Invalid email format',
    errPhoneInvalid: 'Please enter a valid phone number',
    errBankCardInvalid: 'Invalid card number',
    errEmptyFields: 'Please fill all fields',
    errEnterCode: 'Please enter verification code',
    errFileSize: 'Image must be under 10MB',
    errNetworkError: 'Network error, please check your connection',
    errOldPwRequired: 'Please enter current password',
    errPwMismatch: 'Passwords do not match',
    errPwNeedLetter: 'Password must contain a letter',
    errPwNeedNumber: 'Password must contain a number',
    errPwNeedSpecial: 'Password must contain a special char',
    errPwRequirements: 'Password: 8+ chars, letters, digits, and a special character',
    errPwTooShort: 'Password must be at least 8 chars',
    errUserInfoUnavailable: 'Cannot retrieve user info',
    errWrongCredentials: 'Wrong username or password',
    errWrongPassword: 'Incorrect password',
    err_partner_cannot_delete: 'Partner accounts cannot be deleted. Please contact an admin to deactivate.',
    err_user_linked_partner: 'This user is linked as a partner and cannot be deleted. Unlink the partner first to delete.',
    expConfirmMsg: 'This cannot be edited after submission. Proceed?',
    expConfirmTitle: 'Confirm Record',
    expDate: 'Date',
    expDetail: 'Expense Detail',
    expSavedMsg: 'Expense updated. Return to list?',
    expTotalAmount: 'Expense Amount',
    expUpdated: 'Expense updated',
    expense: 'Expense',
    expenseBreakdown: 'Expense Breakdown',
    expenseBreakdownOfMonth: ' Expense Breakdown',
    expenseCategory: 'Category',
    expenseDate: 'Expense Date',
    expenseHistory: 'Expense Records',
    expenseNote: 'Description',
    faceIDDesc: 'Sign in with Face ID',
    faceIDLabel: 'Face ID',
    faceIDLogin: 'Face ID',
    feeAllMonths: 'All',
    feeCurrent: 'Current Fee',
    feeDetail: 'Update Fees',
    feeEntry: 'Today Fee',
    feeNotUpdated: 'Please enter platform fees first',
    enterFeeFirst: 'Enter Fees First',
    reconLater: 'Later',
    feeHistory: 'History',
    feePreview: 'Cumulative',
    feeViewDetail: 'View Details',
    filledBy: 'Filled by',
    filterCategory: 'Category',
    filterDate: 'Date',
    flashSale: 'Flash Sale',
    forgotPassword: 'Forgot password?',
    forgotSendBtn: 'Send Code',
    forgotStep1: 'Enter registered email',
    friendlyReminder: 'Friendly Reminder',
    fullyPaidBack: 'Paid Back ✓',
    fullyPaidBackDetail: 'Fully Paid Back ✓',
    fundsInTransit: 'Funds in Transit',
    goBack: 'Go back',
    goods: 'Purchase',
    graceStatus: 'Cooling Period',
    imgNotLoaded: 'Image not loaded',
    income: 'Income',
    initial: 'Initial Capital',
    initialInvest: 'Initial Capital',
    invApply: 'Apply Invoice',
    invApplyAmount: 'Apply Amount',
    invAutoFilled: 'Auto-filled',
    invBankInfo: 'Bank Info',
    invCenter: 'Invoice Management',
    invContact: 'Contact Issuer',
    invPleaseMaintain: 'Please fill in',
    invDelConfirmPrefix: 'This will delete invoice 「',
    invDelConfirmSuffix: '」. Proceed with caution.',
    invDownload: 'Download',
    invDownloading: 'Downloading…',
    invDrawerAmount: 'Invoice Amount',
    invDrawerBatch: 'Batch Ref',
    invDrawerBatchPlaceholder: 'Select procurement batch',
    invDrawerBuyer: 'Company Name',
    invDrawerDate: 'Invoice Date',
    invDrawerNote: 'Description',
    invDrawerNotePlaceholder: 'Goods/service name (optional)',
    invDrawerRef: 'Ref No.',
    invDrawerTaxId: 'Company Tax ID',
    invDrawerType: 'Invoice Type',
    invEdit: 'Edit',
    invEditBank: 'Edit Bank Info',
    invEditInfo: 'Edit Invoice Info',
    invEmail: 'Receiving Email',
    invEmpty: 'No invoice records',
    invExportToast: 'Export records',
    invFileUploaded: 'Uploaded Invoice',
    invFilterAll: 'All',
    invFilterDone: 'Issued',
    invFilterPending: 'Pending',
    invFilterRejected: 'Voided',
    invGeneral: 'General Invoice',
    invGeneralFull: 'VAT General Invoice',
    invHeaderInfo: 'Header Info',
    invInfoTab: 'Invoice Info',
    invLabel: 'Invoice',
    invOptional: 'Optional',
    invPending: 'Pending',
    invReapply: 'Reapply',
    invRecAddTitle: 'New Invoice Record',
    invRecConfirmDelete: 'Are you sure you want to delete this invoice record?',
    invRecDeleteOk: 'Deleted',
    invRecEditTitle: 'Edit Invoice Record',
    invRecEmpty: 'No invoice records',
    invRecInvoiceNo: 'Invoice No.',
    invRecMarkDone: 'Mark as Done',
    invRecSaveOk: 'Saved',
    invRecStatusDone: 'Done',
    invRecStatusPending: 'Pending',
    invReceipt: 'Receipt',
    invReceiveMethod: 'Receive Method',
    invRecordsTab: 'Records',
    invSave: 'Save',
    invSaved: 'Saved',
    invSelectBatch: 'Select Batch',
    invSettingsToast: 'Settings',
    invShareToast: 'Share Invoice',
    invStatus: 'Invoice Status',
    invStatusDone: 'Issued',
    invStatusPending: 'Pending',
    invStatusRejected: 'Voided',
    invSubmit: 'Submit',
    invSubmitDone: 'Submitted, estimated 1-3 business days',
    invTaxAmount: 'Tax-incl. Amount',
    invTips: 'Invoice info will auto-fill the application form. Ensure tax ID is correct.',
    invTitle: 'Invoice Management',
    invToInvoice: 'Invoice',
    invTotalAmount: 'Total Amount',
    invTotalCount: 'Total Invoices',
    invTypePref: 'Invoice Type Preference',
    invUploadFiles: 'Upload Invoices',
    invUploadHint: 'Max 9 files',
    invUploadInvoice: 'Upload Invoice',
    invUrge: 'Urge',
    invVatSpecial: 'VAT Special',
    invVatSpecialFull: 'VAT Special Invoice',
    invest: 'Capital',
    investComplete: 'Paid Up',
    invoiceSave: 'Save',
    invoiceSaved: 'Saved',
    invoiceSaving: '...',
    invoiceTitle: 'Invoice Info',
    issueDividend: 'Issue Dividend',
    issueProportional: 'Issue Proportional Dividend',
    janitor: 'Helper',
    jd: 'JD.com',
    jokeClosedLoop: '「One chairman paints the pie, one CEO bakes it, one helper eats it — the perfect business loop」',
    jokeRecon: 'The latest reconciliation data has been loaded. Please verify the bill date is correct.',
    language: 'Language',
    anyDate: 'Any date',
    last30Days: 'Last 30 days',
    last3Months: 'Last 3 months',
    last7Days: 'Last 7 days',
    lastLogin: 'Last Login',
    linkCopied: 'Link copied',
    linkPartner: 'Link',
    linkedPartner: 'Linked Partner',
    loadMore: 'Load More',
    loading: 'Loading...',
    login: 'Login',
    loginBtn: 'Login',
    loginDisabledHint: 'When disabled, the user cannot log in',
    loginPlaceholder: 'Username / Email',
    loginStatus: 'Login Status',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to log out?',
    lpControl: 'Limited Partnership Control',
    lpStructure: 'LP Holding Structure',
    manager: 'Manager',
    markRead: 'Mark Read',
    meituan: 'Meituan',
    meituanCashier: 'Meituan POS',
    meituanTuan: 'Meituan Tuan',
    meituanWaimai: 'Meituan Waimai',
    mid: 'Additional',
    month: 'Month',
    month1: 'Jan',
    month10: 'Oct',
    month11: 'Nov',
    month12: 'Dec',
    month2: 'Feb',
    month3: 'Mar',
    month4: 'Apr',
    month5: 'May',
    month6: 'Jun',
    month7: 'Jul',
    month8: 'Aug',
    month9: 'Sep',
    monthExpense: 'Month Expense',
    monthIncome: 'Month Income',
    monthProfit: 'Month Profit',
    monthUnit: 'mo',
    monthlyProfit: 'Monthly Profit',
    monthlyTrend: 'Monthly Trend',
    nameJiang: 'Kuan Jiang',
    nameLan: 'Liu-Fu Lan',
    nameZhang: 'An-Wu Zhang',
    newEmail: 'New Email',
    newPassword: 'New Password',
    newUserBadge: 'New',
    noDividendRecords: 'No dividend records',
    noExpenseRecords: 'No expense records',
    noRecords: 'No records yet',
    noUsers: 'No users',
    normalStatus: 'Normal',
    normalUser: 'Helper',
    notePlaceholder: 'e.g. scallions, cilantro, electricity',
    oldPassword: 'Current Password',
    opacity: 'Opacity',
    otherInfo: 'Other Info',
    paidInRate: 'Paid-in rate',
    partnerSeats: 'Partner Seats',
    partnerStructure: 'Partner Structure',
    partnerTitle: 'LiuWei TanMi Technology Partners',
    password: 'Password',
    passwordChanged: 'Password changed',
    payAlipay: 'Alipay',
    payBank: 'Bank Card',
    payCash: 'Cash',
    payOther: 'Other',
    payWechat: 'WeChat',
    paybackProgress: 'Payback Progress',
    paybackRate: 'Payback Rate',
    paymentMethod: 'Payment Method',
    pdfGenerating: 'Generating purchase order PDF…',
    pdfLoadFailed: 'Failed to load PDF',
    pdfLoading: 'Loading PDF…',
    pendingPayback: 'Pending',
    phone: 'Phone Number',
    platformFee: 'Platform Fees',
    preferences: 'Preferences',
    procAddProduct: 'Add Product',
    procAll: 'All',
    procSelectSupplier: 'Select Supplier',
    procBatchCount: 'Past Batches',
    procBatchLabel: 'Batch',
    procComingSoon: 'Coming Soon',
    procConfirmOrder: 'Confirm Order',
    procContinue: 'Continue',
    procCumulative: 'Total Spent',
    procDeleteBatch: 'Delete Batch',
    procDeleteBatchConfirm: 'Delete Batch #{n}? The linked expense record will also be removed.',
    procDeleteBatchConfirmV2: 'Delete "{batch}"? The linked expense record will also be removed.',
    procDeleteProduct: 'Delete Product',
    procDeleteProductConfirm: 'Delete "{name}"?',
    procDeleteProductWarning: 'Historical batches will no longer display the product name.',
    procDetail: 'Procurement Detail',
    procEditBatch: 'Edit Batch #{n}',
    procEditProduct: 'Edit Product',
    procEmptyHistoryHint: 'Records will appear here once you complete a procurement',
    procEmptyHistoryTitle: 'No procurement records',
    procEmptyNewHint: 'Add products in "Product Mgmt" first, then come back to order',
    procEmptyNewTitle: 'No products yet',
    procEmptyProductsHint: 'Tap "+ Add Product" above to start building your catalog',
    procEmptyProductsTitle: 'No products yet',
    procGenerating: 'Generating...',
    procGeneratingPDF: 'Generating purchase order...',
    procHistory: 'History',
    procImages: 'Voucher Preview',
    procMargin: 'Margin',
    procNewOrder: 'New Order',
    procNoteHintAddress: 'Pickup address',
    procNoteHintPhone: 'Pickup phone',
    procNoteLabel: 'Note',
    procNoteOptional: 'Note (optional)',
    procNowBatch: 'Batch #{n}',
    procOperator: 'Operator',
    procOrderDate: 'Date',
    procOrderItems: 'Items',
    procPaymentMethod: 'Payment',
    procPdfTitle: 'Order #{n}',
    procProduct: 'Product',
    procProductMgmt: 'Products',
    procProductName: 'Name',
    procProductNote: 'Note (optional)',
    procProductPrice: 'Price',
    procProductSpec: 'Spec',
    procProductSupplier: 'Supplier',
    procPurchase: 'Purchase',
    procSearchHistory: 'Search batch#, e.g. 1, 2, 3',
    procSearchPlaceholder: 'Search products…',
    procSearchProducts: 'Search name, supplier…',
    procSelected: 'Selected',
    procSettle: 'Settle',
    procSettleAt: 'Settled at',
    procSettleBy: 'Settled by',
    procSettleInfo: 'Settlement',
    procSettleMsg: 'Mark this batch as settled? This action cannot be undone.',
    procSettleSuccess: 'Marked as settled',
    procSettleTitle: 'Confirm Settlement',
    procSettled: 'Settled',
    procSubmit: 'Submit Order',
    procSubmitted: 'Order Submitted',
    procSubmittedMsg: 'Procurement order saved',
    procSubtotal: 'Subtotal',
    procThisBatch: 'This Batch',
    procTitle: 'Procurement',
    procTotal: 'Total',
    procUnit: 'items',
    procUnsettled: 'Unsettled',
    procUpdated: 'Order Updated',
    procUpdatedMsg: 'Procurement order updated',
    procViewDetail: 'View Details',
    procViewRecords: 'View Records',
    procurement: 'Purchase',
    profileEmail: 'Email Address',
    profit: 'Profit',
    pwHint: '8+ chars, letter + number + special',
    realName: 'Real Name',
    receiptExpenseLabel: 'View Receipt',
    receivable: 'Total Receivable',
    reconComplete: 'Complete Recon',
    reconDate: 'Date',
    reconHistory: 'Recon History',
    reconciledBy: 'Reconciled by',
    recordedBy: 'By',
    recrop: 'Re-crop',
    refundAmount: 'Refund Amount (¥)',
    refundMode: 'Refund Mode',
    register: 'Register',
    registerBtn: 'Register',
    registrationTime: 'Registration Time',
    remarks: 'Remarks',
    rememberMe: 'Remember me',
    rent: 'Rent',
    resendCode: 'Resend',
    reset: 'Reset',
    resetBtn: 'Reset',
    resetDefault: 'Reset to Default',
    resetHint: 'Code sent to',
    restoreAccount: 'Restore Account',
    retry: 'Retry',
    revCancelArchive: 'Reopen',
    revClosedReason: 'Closed for the day',
    revEmpty: 'No records',
    revEmptyHint: 'Start recording daily revenue',
    revEntered: 'Done',
    revHistory: 'Last 7 Days',
    revHistoryBtn: 'History',
    revJD: 'JD Revenue',
    revJDSub: 'JD Platform',
    revMarkArchive: 'Mark as',
    revNotEntered: 'Pending',
    revNote: 'Note',
    revNoteHint: 'e.g. events, promos',
    revQuickDB4: 'DB4',
    revQuickToday: 'Today',
    revQuickYesterday: 'Ytd',
    revRevenue: 'Revenue',
    revRevenueSub: 'Actual Received',
    revSaveDate: 'Save {date} Data',
    revSaveDayBefore: 'Save Day Before',
    revSaveToday: 'Save Today',
    revSaveYesterday: 'Save Yesterday',
    revSubmit: 'Submit',
    revTurnover: 'Turnover',
    revTurnoverSub: 'Total Sales',
    revWeekJD: '30-Day JD Revenue',
    revWeekRevenue: '30-Day Revenue',
    revWeekTurnover: '30-Day Turnover',
    revYesterdayLabel: 'Ytd:',
    revYesterdayNA: '—',
    revenue: 'Revenue',
    revenueDate: 'Revenue Date',
    role: 'Role',
    roundNote: 'Round Note',
    salary: 'Payroll',
    save: 'Save',
    saveImage: 'Save image',
    saving: 'Saving…',
    searchUser: 'Search users',
    securitySettings: 'Security Settings',
    selectPartner: 'Select Partner',
    sendCode: 'Send Code',
    sessionKickedButton: 'OK',
    sessionKickedTitle: 'Signed out',
    sessionKickedToast: 'Signed in elsewhere. This session was ended.',
    sessionTimeoutDesc: 'Auto sign-out after this idle period',
    sessionTimeoutLabel: 'Session timeout',
    shangouWaimai: 'Flash Waimai',
    share: 'Share',
    shareCalcResult: 'Share calculation result:',
    shareFailed: 'Share failed',
    shareImage: 'Share Image',
    shareLink: 'Share link',
    sharePDF: 'Share PDF',
    sharePercent: 'Share',
    shareTo: 'Shared to {label}',
    shareholders: 'shareholders',
    signaturePlaceholder: 'This person is lazy and left nothing...',
    signatureSaved: 'Signature saved',
    ssoDesc: 'Only one device can stay signed in at a time',
    ssoLabel: 'Single-device sign-in',
    staff: 'Staff',
    stampPrefixBurgundy: 'In this body, I have witnessed',
    stampPrefixObsidian: 'The light has cast its',
    stampPrefixTeal: 'Under starry frost, we have weathered',
    stampSuffixBurgundy: ' dawns and dusks of mortal life.',
    stampSuffixObsidian: ' lash upon these seasons.',
    stampSuffixTeal: ' tides of rise and fall.',
    status: 'Status',
    statusFilter: 'Status Filter',
    stayPage: 'Stay',
    subscribedTotal: 'Total Subscription',
    subtitle: 'Life is not simple, keep it simple',
    summary: 'Summary',
    tabExpense: 'Expenses',
    tabRecon: 'Recon',
    tabRevenue: 'Revenue',
    tapForDetail: 'Tap card for details',
    taxId: 'Company Tax ID',
    themeLabel: 'Theme',
    themePicker: 'Theme',
    toastLoadFailed: 'Failed to load data',
    toastSubmitFailed: 'Submit failed, please retry',
    today: 'Today',
    todayExpense: 'Today Expense',
    todayIncome: 'Today Income',
    todayProfit: 'Today Profit',
    totalCapital: 'Total Initial Capital',
    totalDividends: 'Total Dividends',
    totalDividendsPaid: 'Total Dividends',
    totalInvest: 'Total Investment',
    totalRecords: '{n} records total',
    totalToPool: 'Total amount to dividend pool (¥)',
    totalUsers: '{n} users total',
    transactions: 'Transactions',
    tuan: 'Group Buy',
    unlinkPartner: 'Unlink',
    unlinked: 'Unlinked',
    uploadFailed: 'Upload failed, please retry',
    uploadFailedShort: 'Upload failed',
    uploadFileTip: 'Supports jpg/png/webp/pdf, max 10MB per file',
    uploadImage: 'Upload Receipt',
    takePhoto: 'Take Photo',
    chooseFromLibrary: 'Photo Library',
    chooseFile: 'Choose File',
    uploading: 'Uploading...',
    usePasswordLogin: 'Password Login',
    useThisAvatar: 'Use This Avatar',
    useThisBg: 'Use This Background',
    useThisCover: 'Use This Cover',
    userDetail: 'User Detail',
    userId: 'User ID',
    userManagement: 'User Management',
    userMgmt: 'User Management',
    username: 'Login Account',
    verifyBtn: 'Verify',
    verifyCode: 'Verification Code',
    verifyEmail: 'Verify Email',
    verifyNewBodyPost: '. Please check your inbox and follow the link to verify.',
    verifyNewBodyPre: 'Welcome to LiuWei TanMi! An activation code email is on its way to: ',
    verifyNewEditEmail: 'Edit email',
    verifyNewNoEmail: 'Haven\'t received it? Don\'t worry, you can ',
    verifyNewOrSpam: ' or check your spam folder.',
    verifyNewResend: 'resend',
    verifyNewTitle: 'Just one last step! ✨',
    verifyNewWrongEmail: 'Wrong email address? ',
    verifying: 'Verifying...',
    wages: 'Wages',
    willDelete: 'Will delete 「',
    yesterdayExpense: 'Yesterday Expense',
    yesterdayIncome: 'Yesterday Income',
    yesterdayProfit: 'Yesterday Profit',
  },
};
;

export type I18nKey =
  | 'accountCooldown'
  | 'accountInfo'
  | 'actualReceived'
  | 'addFeeEntry'
  | 'addImage'
  | 'additional'
  | 'addressPhone'
  | 'adminCannotDelete'
  | 'all'
  | 'allDividendRecords'
  | 'allowLogin'
  | 'amount'
  | 'amountLabel'
  | 'any'
  | 'apply'
  | 'atLeastOneFee'
  | 'authSettingsTitle'
  | 'autoByShare'
  | 'avatarCropTitle'
  | 'avatarSizeHint'
  | 'avatarUpdated'
  | 'back'
  | 'backToList'
  | 'backToLogin'
  | 'bankAccount'
  | 'bankName'
  | 'basicInfo'
  | 'batchLabel'
  | 'bgHint'
  | 'bgResultHint'
  | 'bgSettings'
  | 'bgUpdated'
  | 'billDate'
  | 'bookBalance'
  | 'bookDiff'
  | 'byRoundAndInvest'
  | 'cancel'
  | 'capitalLedger'
  | 'cardBalance'
  | 'cashBalance'
  | 'cashOnHand'
  | 'ceo'
  | 'chairman'
  | 'changeEmail'
  | 'changePassword'
  | 'chartSwitchBar'
  | 'chartSwitchDay'
  | 'chartSwitchHint'
  | 'chartSwitchMonth'
  | 'chartSwitchPie'
  | 'chartXAxis'
  | 'chartXAxisDay'
  | 'chartYAxis'
  | 'chooseFile'
  | 'chooseFromLibrary'
  | 'chooseImage'
  | 'clear'
  | 'codeSent'
  | 'companyAddress'
  | 'companyBankAccount'
  | 'companyBankName'
  | 'companyName'
  | 'companyPhone'
  | 'companyTaxId'
  | 'confirm'
  | 'confirmDelete'
  | 'confirmDeleteRecord'
  | 'confirmDisable'
  | 'confirmIssue'
  | 'confirmLogout'
  | 'confirmNewPassword'
  | 'confirmPassword'
  | 'confirmRecord'
  | 'confirmUnlinkMsg'
  | 'confirmUse'
  | 'copyright'
  | 'coverCropTitle'
  | 'coverHint'
  | 'coverUpdated'
  | 'createdAt'
  | 'cropFailed'
  | 'cropFlip'
  | 'cropPill'
  | 'cropRotate'
  | 'cumulativeByShare'
  | 'cumulativeExpense'
  | 'cumulativeRevenue'
  | 'currentBalance'
  | 'daily'
  | 'dailyProfit'
  | 'dailyRevenue'
  | 'dailyTrend'
  | 'dangerZone'
  | 'date'
  | 'dateFrom'
  | 'dateTo'
  | 'delete'
  | 'deleteAccount'
  | 'deleteAccountBtn'
  | 'deleteAccountConfirmMsg'
  | 'deleteAccountConfirmTitle'
  | 'deleteAccountGraceNote'
  | 'deleteAccountSuccess'
  | 'deleteRecord'
  | 'deleteUser'
  | 'deleteUserConfirm'
  | 'deleteUserGraceNote'
  | 'disableFaceIDConfirm'
  | 'devCodeLabel'
  | 'dineIn'
  | 'disabledStatus'
  | 'discountAmount'
  | 'displayName'
  | 'distributedPool'
  | 'dividend'
  | 'dividendHistory'
  | 'dividendRoundFmt'
  | 'dividendRoundOnly'
  | 'done'
  | 'downloadImage'
  | 'downloadPdf'
  | 'edit'
  | 'editBg'
  | 'editCover'
  | 'editProfile'
  | 'email'
  | 'emailAction'
  | 'emailBodyExtra'
  | 'emailUpdated'
  | 'emptyExpenseHint'
  | 'emptyInvoiceHint'
  | 'emptyReconHint'
  | 'enterAmount'
  | 'enterCode'
  | 'enterUsernameToConfirm'
  | 'entryDate'
  | 'errDateFuture'
  | 'errDateRange'
  | 'errDateRangeTooLong'
  | 'errEmailInvalid'
  | 'errPhoneInvalid'
  | 'errBankCardInvalid'
  | 'errEmptyFields'
  | 'errEnterCode'
  | 'errFileSize'
  | 'errNetworkError'
  | 'errOldPwRequired'
  | 'errPwMismatch'
  | 'errPwNeedLetter'
  | 'errPwNeedNumber'
  | 'errPwNeedSpecial'
  | 'errPwRequirements'
  | 'errPwTooShort'
  | 'errUserInfoUnavailable'
  | 'errWrongCredentials'
  | 'errWrongPassword'
  | 'err_partner_cannot_delete'
  | 'err_user_linked_partner'
  | 'expConfirmMsg'
  | 'expConfirmTitle'
  | 'expDate'
  | 'expDetail'
  | 'expSavedMsg'
  | 'expTotalAmount'
  | 'expUpdated'
  | 'expense'
  | 'expenseBreakdown'
  | 'expenseBreakdownOfMonth'
  | 'expenseCategory'
  | 'expenseDate'
  | 'expenseHistory'
  | 'expenseNote'
  | 'faceIDDesc'
  | 'faceIDLabel'
  | 'faceIDLogin'
  | 'feeAllMonths'
  | 'feeCurrent'
  | 'feeDetail'
  | 'feeEntry'
  | 'feeNotUpdated'
  | 'enterFeeFirst'
  | 'reconLater'
  | 'feeHistory'
  | 'feePreview'
  | 'feeViewDetail'
  | 'filledBy'
  | 'filterCategory'
  | 'filterDate'
  | 'flashSale'
  | 'forgotPassword'
  | 'forgotSendBtn'
  | 'forgotStep1'
  | 'friendlyReminder'
  | 'fullyPaidBack'
  | 'fullyPaidBackDetail'
  | 'fundsInTransit'
  | 'goBack'
  | 'goods'
  | 'graceStatus'
  | 'imgNotLoaded'
  | 'income'
  | 'initial'
  | 'initialInvest'
  | 'invApply'
  | 'invApplyAmount'
  | 'invAutoFilled'
  | 'invBankInfo'
  | 'invCenter'
  | 'invContact'
  | 'invPleaseMaintain'
  | 'invDelConfirmPrefix'
  | 'invDelConfirmSuffix'
  | 'invDownload'
  | 'invDownloading'
  | 'invDrawerAmount'
  | 'invDrawerBatch'
  | 'invDrawerBatchPlaceholder'
  | 'invDrawerBuyer'
  | 'invDrawerDate'
  | 'invDrawerNote'
  | 'invDrawerNotePlaceholder'
  | 'invDrawerRef'
  | 'invDrawerTaxId'
  | 'invDrawerType'
  | 'invEdit'
  | 'invEditBank'
  | 'invEditInfo'
  | 'invEmail'
  | 'invEmpty'
  | 'invExportToast'
  | 'invFileUploaded'
  | 'invFilterAll'
  | 'invFilterDone'
  | 'invFilterPending'
  | 'invFilterRejected'
  | 'invGeneral'
  | 'invGeneralFull'
  | 'invHeaderInfo'
  | 'invInfoTab'
  | 'invLabel'
  | 'invOptional'
  | 'invPending'
  | 'invReapply'
  | 'invRecAddTitle'
  | 'invRecConfirmDelete'
  | 'invRecDeleteOk'
  | 'invRecEditTitle'
  | 'invRecEmpty'
  | 'invRecInvoiceNo'
  | 'invRecMarkDone'
  | 'invRecSaveOk'
  | 'invRecStatusDone'
  | 'invRecStatusPending'
  | 'invReceipt'
  | 'invReceiveMethod'
  | 'invRecordsTab'
  | 'invSave'
  | 'invSaved'
  | 'invSelectBatch'
  | 'invSettingsToast'
  | 'invShareToast'
  | 'invStatus'
  | 'invStatusDone'
  | 'invStatusPending'
  | 'invStatusRejected'
  | 'invSubmit'
  | 'invSubmitDone'
  | 'invTaxAmount'
  | 'invTips'
  | 'invTitle'
  | 'invToInvoice'
  | 'invTotalAmount'
  | 'invTotalCount'
  | 'invTypePref'
  | 'invUploadFiles'
  | 'invUploadHint'
  | 'invUploadInvoice'
  | 'invUrge'
  | 'invVatSpecial'
  | 'invVatSpecialFull'
  | 'invest'
  | 'investComplete'
  | 'invoiceSave'
  | 'invoiceSaved'
  | 'invoiceSaving'
  | 'invoiceTitle'
  | 'issueDividend'
  | 'issueProportional'
  | 'janitor'
  | 'jd'
  | 'jokeClosedLoop'
  | 'jokeRecon'
  | 'language'
  | 'anyDate'
  | 'last30Days'
  | 'last3Months'
  | 'last7Days'
  | 'lastLogin'
  | 'linkCopied'
  | 'linkPartner'
  | 'linkedPartner'
  | 'loadMore'
  | 'loading'
  | 'login'
  | 'loginBtn'
  | 'loginDisabledHint'
  | 'loginPlaceholder'
  | 'loginStatus'
  | 'logout'
  | 'logoutConfirm'
  | 'lpControl'
  | 'lpStructure'
  | 'manager'
  | 'markRead'
  | 'meituan'
  | 'meituanCashier'
  | 'meituanTuan'
  | 'meituanWaimai'
  | 'mid'
  | 'month'
  | 'month1'
  | 'month10'
  | 'month11'
  | 'month12'
  | 'month2'
  | 'month3'
  | 'month4'
  | 'month5'
  | 'month6'
  | 'month7'
  | 'month8'
  | 'month9'
  | 'monthExpense'
  | 'monthIncome'
  | 'monthProfit'
  | 'monthUnit'
  | 'monthlyProfit'
  | 'monthlyTrend'
  | 'nameJiang'
  | 'nameLan'
  | 'nameZhang'
  | 'newEmail'
  | 'newPassword'
  | 'newUserBadge'
  | 'noDividendRecords'
  | 'noExpenseRecords'
  | 'noRecords'
  | 'noUsers'
  | 'normalStatus'
  | 'normalUser'
  | 'notePlaceholder'
  | 'oldPassword'
  | 'opacity'
  | 'otherInfo'
  | 'paidInRate'
  | 'partnerSeats'
  | 'partnerStructure'
  | 'partnerTitle'
  | 'password'
  | 'passwordChanged'
  | 'payAlipay'
  | 'payBank'
  | 'payCash'
  | 'payOther'
  | 'payWechat'
  | 'paybackProgress'
  | 'paybackRate'
  | 'paymentMethod'
  | 'pdfGenerating'
  | 'pdfLoadFailed'
  | 'pdfLoading'
  | 'pdfPageInfo'
  | 'pendingPayback'
  | 'phone'
  | 'platformFee'
  | 'preferences'
  | 'procAddProduct'
  | 'procAll'
  | 'procSelectSupplier'
  | 'procBatchCount'
  | 'procBatchLabel'
  | 'procCartCount'
  | 'procComingSoon'
  | 'procConfirmOrder'
  | 'procContinue'
  | 'procCumulative'
  | 'procDeleteBatch'
  | 'procDeleteBatchConfirm'
  | 'procDeleteBatchConfirmV2'
  | 'procDeleteProduct'
  | 'procDeleteProductConfirm'
  | 'procDeleteProductWarning'
  | 'procDetail'
  | 'procEditBatch'
  | 'procEditProduct'
  | 'procEmptyHistoryHint'
  | 'procEmptyHistoryTitle'
  | 'procEmptyNewHint'
  | 'procEmptyNewTitle'
  | 'procEmptyProductsHint'
  | 'procEmptyProductsTitle'
  | 'procGenerating'
  | 'procGeneratingPDF'
  | 'procHistory'
  | 'procImages'
  | 'procManageProducts'
  | 'procMargin'
  | 'procNewOrder'
  | 'procNoHistory'
  | 'procNoteHintAddress'
  | 'procNoteHintPhone'
  | 'procNoteLabel'
  | 'procNoteOptional'
  | 'procNowBatch'
  | 'procOperator'
  | 'procOrderDate'
  | 'procOrderItems'
  | 'procPaymentMethod'
  | 'procPdfTitle'
  | 'procProduct'
  | 'procProductMgmt'
  | 'procProductName'
  | 'procProductNote'
  | 'procProductPrice'
  | 'procProductSpec'
  | 'procProductSupplier'
  | 'procPurchase'
  | 'procSearchHistory'
  | 'procSearchPlaceholder'
  | 'procSearchProducts'
  | 'procSelected'
  | 'procSettle'
  | 'procSettleAt'
  | 'procSettleBy'
  | 'procSettleInfo'
  | 'procSettleMsg'
  | 'procSettleSuccess'
  | 'procSettleTitle'
  | 'procSettled'
  | 'procSubmit'
  | 'procSubmitted'
  | 'procSubmittedMsg'
  | 'procSubtotal'
  | 'procThisBatch'
  | 'procTitle'
  | 'procTotal'
  | 'procUniqueItems'
  | 'procUnit'
  | 'procUnsettled'
  | 'procUpdated'
  | 'procUpdatedMsg'
  | 'procUploadHint'
  | 'procUploadReceipt'
  | 'procViewDetail'
  | 'procViewRecords'
  | 'procurement'
  | 'profileEmail'
  | 'profit'
  | 'pwHint'
  | 'realName'
  | 'receiptExpenseLabel'
  | 'receivable'
  | 'reconComplete'
  | 'reconDate'
  | 'reconHistory'
  | 'reconciledBy'
  | 'recordedBy'
  | 'recrop'
  | 'refundAmount'
  | 'refundMode'
  | 'register'
  | 'registerBtn'
  | 'registrationTime'
  | 'remarks'
  | 'rememberMe'
  | 'rent'
  | 'resendCode'
  | 'reset'
  | 'resetBtn'
  | 'resetDefault'
  | 'resetHint'
  | 'restoreAccount'
  | 'retry'
  | 'revCancelArchive'
  | 'revClosedReason'
  | 'revConfirmDelete'
  | 'revDateConflict'
  | 'revDelete'
  | 'revEdit'
  | 'revEmpty'
  | 'revEmptyHint'
  | 'revEntered'
  | 'revHistory'
  | 'revHistoryBtn'
  | 'revJD'
  | 'revJDSub'
  | 'revMarkArchive'
  | 'revNotEntered'
  | 'revNote'
  | 'revNoteHint'
  | 'revQuickDB4'
  | 'revQuickToday'
  | 'revQuickYesterday'
  | 'revRevenue'
  | 'revRevenueSub'
  | 'revSaveDate'
  | 'revSaveDayBefore'
  | 'revSaveToday'
  | 'revSaveYesterday'
  | 'revSubmit'
  | 'revToday'
  | 'revTurnover'
  | 'revTurnoverSub'
  | 'revWeekJD'
  | 'revWeekRevenue'
  | 'revWeekTurnover'
  | 'revYesterdayLabel'
  | 'revYesterdayNA'
  | 'revenue'
  | 'revenueDate'
  | 'role'
  | 'roundNote'
  | 'salary'
  | 'save'
  | 'saveImage'
  | 'saving'
  | 'searchUser'
  | 'securitySettings'
  | 'selectPartner'
  | 'sendCode'
  | 'sessionKickedButton'
  | 'sessionKickedTitle'
  | 'sessionKickedToast'
  | 'sessionTimeoutDesc'
  | 'sessionTimeoutLabel'
  | 'shangouWaimai'
  | 'share'
  | 'shareCalcResult'
  | 'shareFailed'
  | 'shareImage'
  | 'shareLink'
  | 'sharePDF'
  | 'sharePercent'
  | 'shareTo'
  | 'shareholders'
  | 'signaturePlaceholder'
  | 'signatureSaved'
  | 'ssoDesc'
  | 'ssoLabel'
  | 'staff'
  | 'stampPrefixBurgundy'
  | 'stampPrefixObsidian'
  | 'stampPrefixTeal'
  | 'stampSuffixBurgundy'
  | 'stampSuffixObsidian'
  | 'stampSuffixTeal'
  | 'status'
  | 'statusFilter'
  | 'stayPage'
  | 'subscribedTotal'
  | 'subtitle'
  | 'summary'
  | 'tabExpense'
  | 'tabRecon'
  | 'tabRevenue'
  | 'takePhoto'
  | 'tapForDetail'
  | 'taxId'
  | 'themeLabel'
  | 'themePicker'
  | 'toastLoadFailed'
  | 'toastSubmitFailed'
  | 'today'
  | 'todayExpense'
  | 'todayIncome'
  | 'todayProfit'
  | 'totalCapital'
  | 'totalDividends'
  | 'totalDividendsPaid'
  | 'totalInvest'
  | 'totalRecords'
  | 'totalToPool'
  | 'totalUsers'
  | 'transactions'
  | 'tuan'
  | 'unlinkPartner'
  | 'unlinked'
  | 'uploadFailed'
  | 'uploadFailedShort'
  | 'uploadFileTip'
  | 'uploadImage'
  | 'uploading'
  | 'usePasswordLogin'
  | 'useThisAvatar'
  | 'useThisBg'
  | 'useThisCover'
  | 'userDetail'
  | 'userId'
  | 'userManagement'
  | 'userMgmt'
  | 'username'
  | 'verifyBtn'
  | 'verifyCode'
  | 'verifyEmail'
  | 'verifyNewBodyPost'
  | 'verifyNewBodyPre'
  | 'verifyNewEditEmail'
  | 'verifyNewNoEmail'
  | 'verifyNewOrSpam'
  | 'verifyNewResend'
  | 'verifyNewTitle'
  | 'verifyNewWrongEmail'
  | 'verifying'
  | 'wages'
  | 'willDelete'
  | 'yesterdayExpense'
  | 'yesterdayIncome'
  | 'yesterdayProfit'


type Lang = 'zh-CN' | 'zh-TW' | 'en';

export const langs: [Lang, string][] = [
  ['zh-CN', '简'],
  ['zh-TW', '繁'],
  ['en', 'EN'],
];

// In React Native there is no `window`, so we use globalThis.curLang as a
// module-level holder that t()/getLang() can read synchronously from anywhere.
(globalThis as any).curLang =
  (globalThis as any).curLang ||
  (typeof localStorage !== 'undefined' && (() => {
    try { return localStorage.getItem('lang'); } catch { return null; }
  })()) ||
  'zh-CN';
if (typeof navigator !== 'undefined') {
  const bl = (navigator as any).language || '';
  try {
    if (!(typeof localStorage !== 'undefined' && localStorage.getItem('lang'))) {
      if (bl.startsWith('zh-TW') || bl.startsWith('zh-HK')) (globalThis as any).curLang = 'zh-TW';
      else if (bl.startsWith('zh')) (globalThis as any).curLang = 'zh-CN';
      else if (bl.startsWith('en')) (globalThis as any).curLang = 'en';
    }
  } catch {}
}

export function t(key: I18nKey | string): string {
  const lang = (globalThis as any).curLang || 'zh-CN';
  return I18N[lang]?.[key] || I18N['zh-CN']?.[key] || key;
}

export function getLang(): string {
  return (globalThis as any).curLang || 'zh-CN';
}

/**
 * Legacy module-level mutator used by LoginScreen/HomeScreen for instant
 * language switching (does NOT trigger a re-render in subscribed components).
 * For React-rerender-driven switches, use the `useLang()` hook below.
 */
export function setLang(lang: string, callback?: () => void) {
  if (!I18N[lang]) return;
  (globalThis as any).curLang = lang;
  try { localStorage.setItem('lang', lang); } catch {}
  // Persist to backend so language follows the user across devices. Lazily
  // import the api client to avoid a circular import (client.ts imports
  // getLang from this module).
  import('./api/client').then(({ api }) => {
    api.saveLang(lang).catch(() => {});
  }).catch(() => {});
  callback?.();
}

interface LangContextValue {
  lang: string;
  setLang: (lang: string) => void;
}

const LangContext = createContext<LangContextValue>({
  lang: 'zh-CN',
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  const [lang, setLangState] = useState<string>(() => {
    const cur = localStorage.getItem('lang') || (globalThis as any).curLang || 'zh-CN';
    (globalThis as any).curLang = cur; // 同步给 t()/getLang() 使用
    return cur;
  });

  const setLang = useCallback((l: string) => {
    if (!I18N[l]) return;
    setLangState(l);
    (globalThis as any).curLang = l;
    try { localStorage.setItem('lang', l); } catch {}
    // Lazily persist to backend via the same path as the legacy setLang().
    import('./api/client').then(({ api }) => {
      api.saveLang(l).catch(() => {});
    }).catch(() => {});
  }, []);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
