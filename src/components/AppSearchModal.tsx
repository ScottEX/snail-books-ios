import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { api, API_BASE, type AppSearchRecord, type ExpenseDraft, type LedgerAction, type LedgerAnswer, type LedgerRequest, type LedgerResponse, type LedgerTotal } from '../api/client';
import { getLang, t } from '../i18n';
import { FONTS, useTheme, withAlpha } from '../theme';
import { MODAL_CARD_RADIUS } from '../sharedStyles';
import { fmtAmtFull, formatDate } from '../utils/format';
import { translateDividendNote, translateName } from '../screens/partner/usePartnerData';
import AppTextInput from './AppTextInput';
import CloseButton from './CloseButton';
import DropdownArrow from './DropdownArrow';
import ModalOverlay from './ModalOverlay';
import SubmitButton from './SubmitButton';
import { useAssistantSpeech } from '../hooks/useAssistantSpeech';
import { discoverUsageKey, rankDiscoverShortcuts, readDiscoverUsage, recordDiscoverOpen } from '../utils/discoverUsage';
import { getCurrentUserId } from '../utils/storage';

const modes = {
  search: { label: 'assistantDiscover', placeholder: 'appSearchPlaceholder', action: 'appSearchFind', limit: 80 },
  ask: { label: 'assistantAsk', placeholder: 'ledgerAiLatestProcurementExample', action: 'ledgerAiAsk', limit: 300 },
  record: { label: 'assistantRecord', placeholder: 'expenseAiExample', action: 'expenseAiGenerate', limit: 500 },
} as const;
type AssistantMode = keyof typeof modes;
const modelErrors = [
  'ledgerAiUnavailable', 'ledgerAiUnclear', 'ledgerAiAdminOnly', 'ledgerAiContextRequired', 'ledgerAiContextExpired', 'expenseAiRateLimit', 'expenseAiUnavailable', 'expenseAiUnclear',
];
const askExamples = [
  ['latest_procurement', 'ledgerAiLatestProcurementExample'],
  ['procurement_summary', 'ledgerAiProcurementSummaryExample'],
  ['unsettled_procurement', 'ledgerAiUnsettledProcurementExample'],
  ['turnover', 'ledgerAiTurnoverExample'],
  ['profit', 'ledgerAiProfitExample'],
  ['salary', 'ledgerAiSalaryExample'],
  ['latest_expense', 'ledgerAiLatestExpenseExample'],
  ['latest_revenue', 'ledgerAiLatestRevenueExample'],
  ['latest_reconciliation', 'ledgerAiLatestReconciliationExample'],
  ['latest_invoice', 'ledgerAiLatestInvoiceExample'],
  ['dividends', 'ledgerAiDividendExample'],
  ['shareholders', 'ledgerAiShareholdersExample'],
  ['users', 'ledgerAiUsersExample'],
] as const;
const actionLabels: Record<LedgerAction, string> = {
  this_month: 'ledgerAiThisMonth', last_month: 'ledgerAiLastMonth', compare_last_month: 'ledgerAiCompareLastMonth',
  details: 'ledgerAiDetails', order_value: 'ledgerAiOrderValue', posted_expense: 'ledgerAiPostedExpense',
};

const pages = {
  invoice: ['appSearchInvoice', '发票|發票|发票管理|開票|开票|票據|invoice'],
  invoiceInfo: ['invInfoTab', '发票资料|發票資料|开票信息|開票資訊|invoice info|billing details'],
  invoiceRecords: ['invRecordsTab', '发票记录|發票紀錄|开票记录|開票記錄|发票历史|發票歷史|上传发票|上傳發票|invoice records|upload invoice'],
  invoiceApply: ['invApply', '申请开票|申請開票|新建发票|新增發票|apply for invoice|new invoice'],
  expense: ['expenseHistory', '支出记录|支出記錄|支出历史|支出歷史|流水|expense history'],
  expenseEntry: ['appSearchExpenseEntry', '记账|記帳|录入支出|輸入支出|凭证上传|憑證上傳|add expense'],
  refund: ['appSearchRefund', '退款|退费|退費|refund'],
  expenseAi: ['expenseAiTitle', '一句话记账|一句話記帳|智能记账|智慧記帳|ai expense'],
  askLedger: ['assistantAsk', '问答|問答|ai 查账|ai 查帳|ai查账|ai查帳|查账|查帳|问账|問帳|ask the ledger'],
  procurement: ['procTitle', '采购管理|採購管理|进货管理|進貨管理|procurement'],
  newOrder: ['procNewOrder', '采购|採購|进货|進貨|新建采购单|新增採購單|new purchase order'],
  procurementHistory: ['procHistory', '采购记录|採購記錄|采购历史|採購歷史|进货记录|進貨記錄|清账|清賬|采购结算|採購結算|采购单PDF|採購單PDF|purchase history|settlement'],
  products: ['appSearchProducts', '商品|产品|產品|商品管理|产品管理|產品管理|编辑商品|編輯商品|编辑产品|編輯產品|供应商|供應商|products|edit product|supplier'],
  addProduct: ['procAddProduct', '添加商品|新增商品|添加产品|新增產品|add product|new product'],
  procurementCart: ['appSearchCart', '购物车|購物車|采购车|採購車|采购清单|採購清單|cart'],
  revenue: ['revHistoryBtn', '营收记录|營收記錄|营收历史|營收歷史|revenue history'],
  revenueEntry: ['dailyRevenue', '营收|營收|营业额|營業額|录入营收|輸入營收|daily revenue'],
  statistics: ['appSearchStatistics', '统计|統計|图表|圖表|经营总览|經營總覽|收支总览|收支總覽|收支统计|收支統計|statistics|charts|trends'],
  reconciliation: ['reconHistory', '对账记录|對帳記錄|對賬記錄|对账历史|對帳歷史|recon history'],
  reconciliationEntry: ['tabRecon', '对账|對帳|對賬|日记账|日記帳|reconciliation'],
  fee: ['platformFee', '平台手续费|平台手續費|手续费|手續費|platform fees'],
  feeHistory: ['appSearchFeeHistory', '手续费历史|手續費歷史|手续费记录|手續費記錄|fee history'],
  feeEntry: ['addFeeEntry', '录入手续费|錄入手續費|輸入手續費|添加手续费|新增手續費|add platform fee'],
  partner: ['appSearchPartner', '合伙人|合夥人|股东|股東|partners'],
  partnerStructure: ['lpStructure', '合伙人结构|合夥人結構|股权结构|股權結構|组织架构|組織架構|partner structure'],
  issueDividend: ['issueDividend', '发起分红|發起分紅|分红|分紅|issue dividend'],
  dividendHistory: ['dividendHistory', '分红记录|分紅記錄|分红历史|分紅歷史|dividend history'],
  profile: ['appSearchProfile', '个人中心|個人中心|个人资料|個人資料|profile'],
  account: ['accountInfo', '账户信息|帳戶資訊|账号|帳號|昵称|暱稱|account info'],
  email: ['changeEmail', '修改邮箱|修改郵箱|更改邮箱|更改郵箱|email'],
  password: ['changePassword', '改密码|改密碼|更改密码|更改密碼|更换密码|更換密碼|password'],
  security: ['securitySettings', '安全设置|安全設定|账户安全|帳戶安全|account security'],
  avatar: ['appSearchAvatar', '换头像|換頭像|修改头像|修改頭像|avatar'],
  cover: ['editCover', '更换封面|更換封面|换封面|換封面|cover photo'],
  signature: ['appSearchSignature', '签名|簽名|个性签名|個性簽名|signature'],
  theme: ['themeLabel', '主题|主題|切换主题|切換主題|theme'],
  themeSettings: ['bgSettings', '背景图|背景圖|背景透明度|背景設定|主题设置|主題設定|background|theme settings'],
  language: ['language', '语言设置|語言設定|切换语言|切換語言|偏好设置|偏好設定|language|preferences'],
  loginSecurity: ['authSettingsTitle', '登录安全|登入安全|登录设置|登入設定|sign-in security'],
  faceId: ['faceIDLabel', '面容登录|面容登入|指纹登录|指紋登入|face id|touch id|biometric login'],
  singleSession: ['ssoLabel', '单设备登录|單裝置登入|单会话|單會話|single session'],
  sessionTimeout: ['sessionTimeoutLabel', '会话超时|工作階段逾時|自动登出|自動登出|session timeout'],
  deleteAccount: ['deleteAccount', '注销账户|註銷帳戶|删除账号|刪除帳號|delete account'],
  logout: ['logout', '退出登录|登出|注销登录|log out|sign out'],
  userManagement: ['userManagement', '用户管理|用戶管理|使用者管理|管理用户|管理用戶|管理使用者|审核用户|審核用戶|编辑用户|編輯用戶|user management|manage users|review users'],
} as const;

const recordLabels: Record<AppSearchRecord['kind'], string> = {
  expense: 'expenseHistory', procurement: 'procTitle', invoice: 'appSearchInvoice',
  product: 'appSearchProduct', partner: 'appSearchPartner', revenue: 'dailyRevenue', reconciliation: 'reconHistory',
};

export type AppSearchPage = keyof typeof pages;
type SearchResult = AppSearchPage | AppSearchRecord;
export type AppSearchTarget = Exclude<SearchResult, 'expenseAi' | 'askLedger'>;
const defaultDiscoverShortcuts: readonly AppSearchPage[] = ['procurementHistory', 'expense', 'statistics', 'invoice'];
const discoverPages = (Object.keys(pages) as AppSearchPage[]).filter(page =>
  !['askLedger', 'expenseAi', 'password', 'deleteAccount', 'logout'].includes(page));
const publicDiscoverPages = discoverPages.filter(page => page !== 'userManagement');

function findPages(keyword: string) {
  const query = keyword.toLowerCase();
  return (Object.keys(pages) as AppSearchPage[]).flatMap(page => {
    const [label, aliases] = pages[page];
    const terms = [t(label), ...aliases.split('|')].map(term => term.toLowerCase());
    const rank = terms.includes(query) ? 0
      : terms.some(term => query.includes(term) || term.startsWith(query)) ? 1
      : terms.some(term => term.includes(query)) ? 2 : -1;
    return rank < 0 ? [] : [{ page, rank }];
  }).sort((a, b) => a.rank - b.rank).map(match => match.page);
}

async function findVisiblePages(keyword: string, signal: AbortSignal) {
  const matches = findPages(keyword);
  if (!matches.includes('userManagement')) return matches;
  const { is_admin } = await api.admin.check(signal);
  return is_admin === true ? matches : matches.filter(page => page !== 'userManagement');
}

function SearchResults({ hits, onOpen, disabled }: {
  hits: { pages: AppSearchPage[]; records: AppSearchRecord[] };
  onOpen: (target: SearchResult) => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.hitList}>
      {hits.pages.length > 0 && <Text style={{ color: colors.textSub }}>{t('appSearchPages')}</Text>}
      {hits.pages.map(page => (
        <TouchableOpacity key={page} accessibilityRole="button" disabled={disabled} onPress={() => onOpen(page)} style={styles.hit}>
          <Text style={[styles.hitTitle, { color: colors.textMain }]}>{t(pages[page][0])}</Text>
          <Text style={{ color: colors.textSub }}>›</Text>
        </TouchableOpacity>
      ))}
      {(Object.keys(recordLabels) as AppSearchRecord['kind'][]).map(kind => {
        const records = hits.records.filter(record => record.kind === kind);
        if (!records.length) return null;
        return (
          <View key={kind} style={styles.hitList}>
            <Text style={{ color: colors.textSub }}>{t(recordLabels[kind])}</Text>
            {records.map(record => {
              const detail = record.kind === 'expense' && record.detail ? t(record.detail) : record.detail;
              const subtitle = [detail, formatDate(record.date), record.amount !== null ? fmtAmtFull(record.amount) : '']
                .filter(Boolean).join(' · ');
              return (
                <TouchableOpacity key={record.id} accessibilityRole="button" disabled={disabled}
                  onPress={() => onOpen(record)} style={styles.hit}>
                  <View style={styles.hitTitle}>
                    <Text style={{ color: colors.textMain }} numberOfLines={2}>{record.title || t(recordLabels[record.kind])}</Text>
                    {!!subtitle && <Text style={[styles.caption, { color: colors.textSub }]} numberOfLines={2}>{subtitle}</Text>}
                  </View>
                  <Text style={{ color: colors.textSub }}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
      {!hits.pages.length && !hits.records.length && <Text style={{ color: colors.textSub }}>{t('appSearchNoMatches')}</Text>}
    </View>
  );
}

function periodLabel(total: Pick<LedgerTotal, 'start_date' | 'end_date'>) {
  const end = formatDate(total.end_date);
  if (!total.start_date) return t('ledgerAiThrough').replace('{date}', end);
  const start = formatDate(total.start_date);
  return total.start_date === total.end_date ? start : `${start} – ${end}`;
}

const aggregateLabels = {
  turnover: ['revTurnover', 'ledgerAiTurnoverBasis', 'revenue'],
  received: ['actualReceived', 'ledgerAiReceivedBasis', 'revenue'],
  expense: ['expense', 'ledgerAiExpenseBasis', 'expense'],
  profit: ['profit', 'ledgerAiProfitBasis', 'statistics'],
  registered_users: ['ledgerAiUsers', 'ledgerAiUsersBasis', 'userManagement'],
  dividend_amount: ['ledgerAiDividendAmount', 'ledgerAiDividendBasis', 'dividendHistory'],
  dividend_rounds: ['ledgerAiDividendRounds', 'ledgerAiDividendBasis', 'dividendHistory'],
  procurement_summary: ['ledgerAiProcurementSummary', 'ledgerAiProcurementSummaryBasis', 'procurementHistory'],
  unsettled_procurement: ['ledgerAiUnsettledProcurement', 'ledgerAiUnsettledProcurementBasis', 'procurementHistory'],
} as const;

const latestLabels = {
  latest_procurement: 'ledgerAiLatestProcurement',
  latest_expense: 'ledgerAiLatestExpense',
  latest_revenue: 'ledgerAiLatestRevenue',
  latest_reconciliation: 'ledgerAiLatestReconciliation',
  latest_invoice: 'ledgerAiLatestInvoice',
} as const;

function countLabel(count: number, unit: 'ledgerAiPeopleUnit' | 'ledgerAiRoundsUnit') {
  const key = Math.abs(count) !== 1 ? unit : unit === 'ledgerAiPeopleUnit' ? 'ledgerAiPersonUnit' : 'ledgerAiRoundUnit';
  return t(key).replace('{n}', count.toLocaleString(getLang()));
}

function LedgerResult({ answer, onOpenResult, onSearchSupplier, disabled }: {
  answer: LedgerAnswer;
  onOpenResult: (target: SearchResult) => void;
  onSearchSupplier: (name: string) => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  const resultStyle = [styles.result, { backgroundColor: withAlpha(colors.primary, 0.08) }];
  const link = (label: string, open: () => void) => (
    <TouchableOpacity accessibilityRole="button" onPress={open} disabled={disabled} style={styles.resultLink}>
      <Text style={{ color: colors.primary }}>{label} ›</Text>
    </TouchableOpacity>
  );
  const row = (label: string, value: string, key?: number) => (
    <View key={key} style={styles.totalRow}>
      <Text style={[styles.period, { color: colors.textSub }]}>{label}</Text>
      <Text style={{ color: colors.textMain, fontWeight: '600' }}>{value}</Text>
    </View>
  );

  if (answer.metric === 'shareholders') {
    return (
      <View style={resultStyle} accessibilityLiveRegion="polite">
        <Text style={[styles.title, { color: colors.textMain }]}>{t('ledgerAiShareholders')}</Text>
        <Text style={[styles.caption, { color: colors.textSub }]}>
          {t('ledgerAiThrough').replace('{date}', formatDate(answer.as_of))}
        </Text>
        {answer.shareholders.length
          ? answer.shareholders.map(({ id, name, share }) => row(
            translateName(name), `${(share * 100).toLocaleString(getLang(), { maximumFractionDigits: 2 })}%`, id,
          ))
          : <Text style={{ color: colors.textSub }}>{t('ledgerAiNoRecords')}</Text>}
        {link(t('appSearchPartner'), () => onOpenResult('partnerStructure'))}
      </View>
    );
  }

  if ('record' in answer) {
    const { record, category, supplier } = answer;
    const title = [t(latestLabels[answer.metric]), category && t(category), supplier].filter(Boolean).join(' · ');
    const reference = record?.kind === 'procurement' && record.title
      ? t('procNowBatch').replace('{n}', record.title) : record?.title;
    return (
      <View style={resultStyle} accessibilityLiveRegion="polite">
        <Text style={[styles.title, { color: colors.textMain }]}>{title}</Text>
        <Text style={[styles.amount, { color: colors.primary }]}>
          {record ? formatDate(record.date) : t('ledgerAiNoRecords')}
        </Text>
        {record ? (
          <>
            {!!reference && <Text style={{ color: colors.textMain }}>{reference}</Text>}
            {record.amount !== null && row(t(record.kind === 'revenue' ? 'revTurnover'
              : record.kind === 'procurement' ? 'procThisBatch' : 'amount'), fmtAmtFull(record.amount))}
            {record.settled !== undefined && <Text style={{ color: colors.textSub }}>
              {t(record.settled ? 'procSettled' : 'procUnsettled')}
            </Text>}
            {link(t('ledgerAiOpenRecord'), () => onOpenResult(record))}
          </>
        ) : <Text style={[styles.caption, { color: colors.textSub }]}>{periodLabel(answer)}</Text>}
      </View>
    );
  }

  const [defaultLabel, defaultBasis, page] = aggregateLabels[answer.metric];
  const { supplier, category, current, comparison, difference } = answer;
  const label = category ?? defaultLabel;
  const isProcurement = answer.metric === 'procurement_summary' || answer.metric === 'unsettled_procurement';
  const basis = supplier && !isProcurement ? 'appSearchSupplierBasis'
    : category === 'goods' ? 'ledgerAiGoodsBasis' : defaultBasis;
  const countUnit = answer.metric === 'registered_users' ? 'ledgerAiPeopleUnit'
    : answer.metric === 'dividend_rounds' ? 'ledgerAiRoundsUnit' : null;
  const formatAmount = (amount: number) => countUnit ? countLabel(amount, countUnit) : fmtAmtFull(amount);
  const totalLabel = (total: LedgerTotal) => countUnit || total.records || isProcurement ? formatAmount(total.amount) : t('ledgerAiNoRecords');

  return (
    <View style={resultStyle} accessibilityLiveRegion="polite">
      <Text style={[styles.title, { color: colors.textMain }]}>{t(label)}{supplier ? ` · ${supplier}` : ''}</Text>
      <Text style={[styles.amount, { color: colors.primary }]}>{totalLabel(current)}</Text>
      <Text style={[styles.caption, { color: colors.textSub }]}>
        {[current.round && translateDividendNote(current.round), periodLabel(current)].filter(Boolean).join(' · ')}
      </Text>
      {current.awaiting_review !== undefined && row(t('ledgerAiAwaitingReview'), countLabel(current.awaiting_review, 'ledgerAiPeopleUnit'))}
      {current.disabled !== undefined && row(t('ledgerAiDisabled'), countLabel(current.disabled, 'ledgerAiPeopleUnit'))}
      {isProcurement && row(t('procBatchLabel'), current.records.toLocaleString(getLang()))}
      {answer.metric === 'dividend_amount' && current.rounds !== undefined && row(t('ledgerAiDividendRounds'), countLabel(current.rounds, 'ledgerAiRoundsUnit'))}
      {answer.metric === 'dividend_rounds' && current.dividend_amount !== undefined && row(t('ledgerAiDividendAmount'), fmtAmtFull(current.dividend_amount))}
      {comparison && row(periodLabel(comparison), totalLabel(comparison))}
      {difference !== null && (
        <Text style={{ color: colors.primary, fontWeight: '600' }}>
          {t('ledgerAiDifference')} {difference > 0 ? '+' : ''}{formatAmount(difference)}
        </Text>
      )}
      <Text style={[styles.caption, { color: colors.textSub }]}>{t(basis)}</Text>
      {!!supplier && isProcurement && <Text style={[styles.caption, { color: colors.textSub }]}>{t('ledgerAiProcurementSupplierBasis')}</Text>}
      {supplier && !isProcurement
        ? link(t('appSearchRelated'), () => onSearchSupplier(supplier))
        : link(t(pages[page][0]), () => onOpenResult(page))}
    </View>
  );
}

function DraftResult({ draft }: { draft: ExpenseDraft }) {
  const { colors } = useTheme();
  const details = [
    ['ledgerAiDraftDate', draft.date && formatDate(draft.date)],
    ['ledgerAiDraftCategory', draft.category && t(draft.category)],
    ['ledgerAiDraftAccount', draft.account && t(draft.account)],
  ] as const;
  return (
    <View style={[styles.result, { backgroundColor: withAlpha(colors.primary, 0.08) }]} accessibilityLiveRegion="polite">
      <Text style={[styles.title, { color: colors.textMain }]}>{t('assistantDraft')}</Text>
      <Text style={[styles.amount, { color: colors.primary }]}>{fmtAmtFull(Number(draft.amount))}</Text>
      {details.map(([label, value]) => (
        <View key={label} style={styles.totalRow}>
          <Text style={[styles.period, { color: colors.textSub }]}>{t(label)}</Text>
          <Text style={{ color: value ? colors.textMain : colors.danger }}>{value || t('ledgerAiDraftMissing')}</Text>
        </View>
      ))}
      {!!draft.note && <Text style={{ color: colors.textMain }}>{draft.note}</Text>}
    </View>
  );
}

export default function AppSearchModal({ visible, onClose, onOpen, onReviewDraft }: {
  visible: boolean;
  onClose: () => void;
  onOpen: (target: AppSearchTarget, signal: AbortSignal) => Promise<() => void>;
  onReviewDraft: (draft: ExpenseDraft) => void;
}) {
  const { colors } = useTheme();
  const [question, setQuestion] = useState('');
  const [ledger, setLedger] = useState<Exclude<LedgerResponse, { status: 'details' }> | null>(null);
  const [supportingRecords, setSupportingRecords] = useState<Extract<LedgerResponse, { status: 'details' }> | null>(null);
  const { height } = useWindowDimensions();
  const [draft, setDraft] = useState<ExpenseDraft | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<AssistantMode>('search');
  const [showExamples, setShowExamples] = useState(false);
  const [adminShortcutKey, setAdminShortcutKey] = useState<string | null>(null);
  const [hits, setHits] = useState<{ pages: AppSearchPage[]; records: AppSearchRecord[] } | null>(null);
  const request = useRef<AbortController | null>(null);
  const ledgerContext = useRef<string>();
  const input = useRef<React.ElementRef<typeof AppTextInput>>(null);
  const speechPrefix = useRef('');
  const speech = useAssistantSpeech(visible && mode === 'record', transcript => {
    setQuestion([speechPrefix.current, transcript].filter(Boolean).join(' ').slice(0, modes.record.limit));
    setDraft(null);
    setError('');
  });
  const pendingNavigation = useRef<(() => void) | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const usageKey = discoverUsageKey(API_BASE, getCurrentUserId());
  const discoverRankings = useMemo(() => {
    const usage = readDiscoverUsage(visible ? usageKey : null);
    return {
      all: rankDiscoverShortcuts(usage, discoverPages, defaultDiscoverShortcuts),
      public: rankDiscoverShortcuts(usage, publicDiscoverPages, defaultDiscoverShortcuts),
    };
  }, [visible, usageKey]);
  const needsAdminCheck = discoverRankings.all.includes('userManagement');
  useEffect(() => {
    setAdminShortcutKey(null);
    if (!visible || !usageKey || !needsAdminCheck) return;
    const controller = new AbortController();
    api.admin.check(controller.signal).then(({ is_admin }) => {
      if (!controller.signal.aborted && is_admin === true) setAdminShortcutKey(usageKey);
    }).catch(() => {});
    return () => controller.abort();
  }, [visible, usageKey, needsAdminCheck]);
  const discoverShortcuts = adminShortcutKey && adminShortcutKey === usageKey
    ? discoverRankings.all : discoverRankings.public;

  const dismiss = (navigate: (() => void) | null = null) => {
    pendingNavigation.current = navigate;
    speech.cancel();
    Keyboard.dismiss();
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setQuestion('');
    setLedger(null);
    ledgerContext.current = undefined;
    setSupportingRecords(null);
    setDraft(null);
    setHits(null);
    setMode('search');
    setShowExamples(false);
    setError('');
    onClose();
  };
  const close = () => dismiss();

  const changeQuestion = (text: string) => {
    setQuestion(text);
    setDraft(null);
    setHits(null);
    setError('');
  };

  const switchMode = (next: AssistantMode) => {
    if (next === mode || request.current) return;
    setMode(next);
    setLedger(null);
    ledgerContext.current = undefined;
    setSupportingRecords(null);
    setShowExamples(false);
    changeQuestion('');
  };

  const submit = async (submitMode: AssistantMode = mode, query = question, ledgerRequest?: LedgerRequest) => {
    const text = query.trim();
    if ((!text && !ledgerRequest) || request.current || speech.active) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setShowExamples(false);
    setError('');
    const detailsRequest = ledgerRequest && 'action' in ledgerRequest && ledgerRequest.action === 'details';
    if (!detailsRequest) setSupportingRecords(null);
    if (submitMode === 'ask' && (!ledgerRequest || 'example' in ledgerRequest)) setLedger(null);
    setDraft(null);
    setHits(null);
    Keyboard.dismiss();
    try {
      if (submitMode === 'search') {
        const matchedPages = await findVisiblePages(text, controller.signal);
        if (controller.signal.aborted) return;
        if (matchedPages.length) setHits({ pages: matchedPages, records: [] });
        const result = await api.searchApp(text, controller.signal);
        if (!controller.signal.aborted) setHits({ pages: matchedPages, records: result.results });
      } else if (submitMode === 'ask') {
        const result = await api.askLedger(ledgerRequest ?? { question: text, context: ledgerContext.current }, controller.signal);
        if (controller.signal.aborted) return;
        if (result.status === 'details') {
          setSupportingRecords(previous => ({
            ...result,
            records: [...(previous?.records ?? []), ...result.records.filter(record =>
              !previous?.records.some(item => item.id === record.id))],
          }));
        } else {
          ledgerContext.current = result.context ?? undefined;
          setLedger(result);
        }
      } else {
        const result = await api.generateExpenseDraft(text, controller.signal);
        if (!controller.signal.aborted) setDraft(result.draft);
      }
    } catch (failure) {
      if (controller.signal.aborted) return;
      const message = failure instanceof Error ? failure.message : '';
      const fallback = submitMode === 'ask' ? 'ledgerAiFailed' : 'expenseAiFailed';
      setError(t(submitMode === 'search' ? 'appSearchFailed' : modelErrors.includes(message) ? message : fallback));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  };

  const openResult = async (target: SearchResult) => {
    if (request.current || speech.active) return;
    if (target === 'expenseAi' || target === 'askLedger') {
      switchMode(target === 'expenseAi' ? 'record' : 'ask');
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const navigate = await onOpen(target, controller.signal);
      if (controller.signal.aborted) return;
      if (mode === 'search' && usageKey && typeof target === 'string' && discoverPages.includes(target)) {
        dismiss(() => {
          navigate();
          if (usageKey === discoverUsageKey(API_BASE, getCurrentUserId())) recordDiscoverOpen(usageKey, target);
        });
      } else {
        dismiss(navigate);
      }
    } catch {
      if (!controller.signal.aborted) setError(t('appSearchOpenFailed'));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  };

  const finishNavigation = () => {
    const navigate = pendingNavigation.current;
    pendingNavigation.current = null;
    navigate?.();
  };

  const searchSupplier = (name: string) => {
    setMode('search');
    setLedger(null);
    ledgerContext.current = undefined;
    setSupportingRecords(null);
    setQuestion(name);
    void submit('search', name);
  };

  const activeMode = modes[mode];
  const isSearch = mode === 'search';
  const controlsDisabled = busy || speech.active;
  const disabled = !question.trim() || controlsDisabled;
  const runAction = (action: LedgerAction, offset?: number) => {
    if (ledger?.context) void submit('ask', question, { action, context: ledger.context, offset });
  };

  const listening = speech.status === 'listening';
  const speechPending = speech.active && !listening;
  const voiceColor = listening ? colors.danger : colors.primary;
  const voiceDisabled = busy || speechPending;
  const voiceLabel = {
    idle: speech.available ? 'assistantSpeechStart' : 'assistantSpeechKeyboard',
    permission: 'assistantSpeechPreparing',
    starting: 'assistantSpeechPreparing',
    listening: 'assistantSpeechStop',
    stopping: 'assistantSpeechTranscribing',
  }[speech.status];
  const textInput = (
    <AppTextInput
      ref={input}
      accessibilityLabel={t(activeMode.label)}
      placeholder={t(listening ? 'assistantSpeechListening' : activeMode.placeholder)}
      placeholderTextColor={colors.textSub}
      value={question}
      onChangeText={changeQuestion}
      editable={!controlsDisabled}
      multiline={!isSearch}
      returnKeyType={isSearch ? 'search' : 'default'}
      onSubmitEditing={isSearch ? () => void submit() : undefined}
      maxLength={activeMode.limit}
      underlineColorAndroid="transparent"
      style={[
        styles.input, !isSearch && styles.multilineInput,
        { color: colors.textMain, backgroundColor: colors.bg },
      ]}
    />
  );

  return (
    <ModalOverlay
      visible={visible}
      onClose={close}
      onDismiss={Platform.OS === 'ios' ? finishNavigation : undefined}
      onClosed={Platform.OS === 'ios' ? undefined : finishNavigation}
      animation="springScale"
      avoidKeyboard
    >
      <View style={[styles.card, { backgroundColor: colors.surface, maxHeight: Math.min(560, height * 0.72) }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={[styles.title, { color: colors.surface }]}>{t('assistantTitle')}</Text>
          <CloseButton onPress={close} accessibilityLabel={t('assistantClose')} />
        </View>
        <View style={[styles.modes, { backgroundColor: colors.bg }]}>
          {(Object.keys(modes) as AssistantMode[]).map(option => {
            const selected = mode === option;
            return (
              <TouchableOpacity key={option} accessibilityRole="button" accessibilityState={{ selected, disabled: controlsDisabled }}
                disabled={controlsDisabled} onPress={() => switchMode(option)}
                style={[styles.mode, selected && { backgroundColor: colors.surface }]}>
                <Text style={{ color: selected ? colors.primary : colors.textSub, fontWeight: selected ? '700' : '500' }}>
                  {t(modes[option].label)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          {mode === 'record' ? (
            <View style={[styles.voiceComposer, { backgroundColor: colors.bg }]}>
              {textInput}
              <View style={styles.voiceToolbar}>
                <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: voiceDisabled, busy: speechPending }}
                  accessibilityLabel={t(voiceLabel)} disabled={voiceDisabled} activeOpacity={0.72}
                  onPress={() => {
                    if (!speech.available) {
                      input.current?.focus();
                      return;
                    }
                    if (!speech.active) speechPrefix.current = question.trim();
                    Keyboard.dismiss();
                    void speech.toggle();
                  }}
                  style={[
                    styles.voiceButton,
                    { backgroundColor: withAlpha(voiceColor, 0.11), opacity: busy ? 0.5 : 1 },
                  ]}>
                  {speechPending ? <ActivityIndicator size="small" color={voiceColor} style={styles.voiceSpinner} /> : (
                    <Svg width={17} height={17} viewBox="0 0 24 24" accessible={false}>
                      {listening ? <Rect x={5} y={5} width={14} height={14} rx={3} fill={voiceColor} /> : (
                        <>
                          <Rect x={9} y={2.5} width={6} height={12} rx={3} stroke={voiceColor} strokeWidth={1.8} />
                          <Path d="M6 11v.5a6 6 0 0 0 12 0V11M12 17.5V21m-3 0h6"
                            stroke={voiceColor} strokeWidth={1.8} strokeLinecap="round" fill="none" />
                        </>
                      )}
                    </Svg>
                  )}
                  <Text style={[styles.voiceLabel, { color: voiceColor }]}>{t(voiceLabel)}</Text>
                </TouchableOpacity>
                {listening && (
                  <View style={styles.voiceActivity} accessibilityLiveRegion="polite">
                    <View style={[styles.voiceDot, { backgroundColor: voiceColor }]} />
                    <Text style={[styles.caption, { color: voiceColor }]}>{t('assistantSpeechListening')}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : textInput}
          {mode === 'record' && !!speech.error && (
            <Text accessibilityLiveRegion="polite" style={[styles.caption, { color: colors.danger }]}>{t(speech.error)}</Text>
          )}
          {isSearch && !question.trim() && !busy && (
            <View style={styles.shortcuts}>
              {discoverShortcuts.map(page => (
                <TouchableOpacity key={page} accessibilityRole="button" onPress={() => void openResult(page)}
                  style={[styles.shortcut, { backgroundColor: colors.bg }]}>
                  <Text style={{ color: colors.textMain }}>{t(pages[page][0])}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {mode === 'ask' && !busy && (
            <View>
              <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showExamples }}
                onPress={() => { Keyboard.dismiss(); setShowExamples(!showExamples); }} style={styles.examplesTrigger}>
                <Text style={{ color: colors.primary }}>{t('ledgerAiExampleList')}</Text>
                <DropdownArrow color={colors.primary} expanded={showExamples} />
              </TouchableOpacity>
              {showExamples && (
                <ScrollView style={[styles.examplesList, { backgroundColor: colors.bg }]} nestedScrollEnabled
                  keyboardShouldPersistTaps="always" persistentScrollbar>
                  {askExamples.map(([example, key]) => (
                    <TouchableOpacity key={key} accessibilityRole="button" style={styles.exampleRow} onPress={() => {
                      const text = t(key);
                      changeQuestion(text);
                      void submit('ask', text, { example, question: text });
                    }}>
                      <Text style={{ color: colors.textMain }}>{t(key)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
          {!isSearch && <Text style={[styles.caption, { color: colors.textSub }]}>{t('assistantPrivacy')}</Text>}
          {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{error}</Text>}
          {hits && <SearchResults hits={hits} onOpen={openResult} disabled={busy} />}
          {mode === 'ask' && ledger?.status === 'ok' && (
            <LedgerResult answer={ledger.answer} onSearchSupplier={searchSupplier} onOpenResult={openResult} disabled={busy} />
          )}
          {mode === 'ask' && ledger?.status === 'clarify' && (
            <Text style={{ color: colors.textMain }}>{t(ledger.reason === 'period' ? 'ledgerAiChoosePeriod' : 'ledgerAiChooseBasis')}</Text>
          )}
          {mode === 'ask' && !!ledger?.actions?.length && (
            <View style={styles.shortcuts}>
              {ledger.actions.filter(action => action !== 'details' || !supportingRecords).map(action => (
                <TouchableOpacity key={action} accessibilityRole="button" disabled={busy} onPress={() => runAction(action)}
                  style={[styles.shortcut, { backgroundColor: colors.bg }]}>
                  <Text style={{ color: colors.primary }}>{t(actionLabels[action])}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {!!supportingRecords && (
            <>
              {supportingRecords.records.map(record => (
                <TouchableOpacity key={record.id} accessibilityRole="button" disabled={busy}
                  onPress={() => void openResult(record)} style={styles.hit}>
                  <View style={styles.hitTitle}>
                    <Text style={{ color: colors.textMain }}>{t('procNowBatch').replace('{n}', record.title ?? '')}</Text>
                    <Text style={[styles.caption, { color: colors.textSub }]}>
                      {formatDate(record.date)} · {t(record.settled ? 'procSettled' : 'procUnsettled')}
                    </Text>
                  </View>
                  {record.amount !== null && <Text style={{ color: colors.textMain }}>{fmtAmtFull(record.amount)}</Text>}
                </TouchableOpacity>
              ))}
              {!supportingRecords.records.length && <Text style={{ color: colors.textSub }}>{t('ledgerAiNoRecords')}</Text>}
              {supportingRecords.next_offset !== null && (
                <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.example}
                  onPress={() => runAction('details', supportingRecords.next_offset ?? undefined)}>
                  <Text style={{ color: colors.primary }}>{t('ledgerAiMoreDetails')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {draft && <DraftResult draft={draft} />}
        </ScrollView>
        <View style={styles.actions}>
          <SubmitButton
            label={t(draft ? 'assistantReviewDraft' : activeMode.action)}
            onPress={() => draft ? dismiss(() => onReviewDraft(draft)) : void submit()}
            disabled={disabled}
            loading={busy}
            style={[styles.submit, { backgroundColor: colors.primary, opacity: disabled && !busy ? 0.45 : 1 }]}
            textStyle={{ color: colors.surface, fontWeight: '700' }}
          />
        </View>
      </View>
    </ModalOverlay>
  );
}

const styles = StyleSheet.create({
  card: { width: 360, maxWidth: '100%', flexShrink: 1, borderRadius: MODAL_CARD_RADIUS, overflow: 'hidden' },
  header: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },
  amount: { fontSize: FONTS.h2.size, fontWeight: '700', fontVariant: ['tabular-nums'] },
  caption: { fontSize: FONTS.micro.size, lineHeight: 17 },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6, gap: 8 },
  input: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  multilineInput: { minHeight: 70, maxHeight: 108, textAlignVertical: 'top' },
  voiceComposer: { borderRadius: 14 },
  voiceToolbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12, rowGap: 4,
    paddingHorizontal: 10, paddingBottom: 8 },
  voiceButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingHorizontal: 12, borderRadius: 22 },
  voiceLabel: { fontSize: FONTS.micro.size, fontWeight: '600', flexShrink: 1 },
  voiceActivity: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  voiceDot: { width: 6, height: 6, borderRadius: 3 },
  voiceSpinner: { width: 17 },
  modes: { flexDirection: 'row', marginHorizontal: 20, marginTop: 12, padding: 3, gap: 2, borderRadius: 12 },
  mode: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  hitList: { gap: 3 },
  hit: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingVertical: 7, gap: 8 },
  hitTitle: { flex: 1 },
  result: { borderRadius: 12, padding: 12, gap: 5 },
  resultLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  example: { minHeight: 44, justifyContent: 'center' },
  examplesTrigger: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
  examplesList: { maxHeight: 140, borderRadius: 10 },
  exampleRow: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  shortcut: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 8 },
  totalRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  period: { flex: 1 },
  actions: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16 },
  submit: { minHeight: 44, minWidth: 94, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
});
