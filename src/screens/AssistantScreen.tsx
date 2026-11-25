import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { api, API_BASE, type AppSearchRecord, type AssistantChatState, type AssistantChatTurn, type AssistantPreference, type AssistantPreferences, type ExpenseDraft, type LedgerAction, type LedgerAnswer, type LedgerRequest, type LedgerResponse, type LedgerTotal } from '../api/client';
import { getLang, t } from '../i18n';
import { FONTS, useTheme, withAlpha } from '../theme';
import { fmtAmtFull, formatDate } from '../utils/format';
import { translateDividendNote, translateName } from './partner/usePartnerData';
import AppTextInput from '../components/AppTextInput';
import AssistantMemoryPanel, { preferenceLabel, preferenceValueLabel } from '../components/AssistantMemoryPanel';
import HistoryHeader from '../components/HistoryHeader';
import HomeBackground from '../components/HomeBackground';
import SubmitButton from '../components/SubmitButton';
import { useAssistantSpeech } from '../hooks/useAssistantSpeech';
import { discoverUsageKey, rankDiscoverShortcuts, readDiscoverUsage, recordDiscoverOpen } from '../utils/discoverUsage';
import { getCurrentUserId } from '../utils/storage';
import { WriteSubmission } from '../utils/writeSubmission';

const modes = {
  ask: { label: 'assistantChat', placeholder: 'assistantChatPlaceholder', action: 'assistantChatSend', limit: 500 },
  record: { label: 'assistantRecord', placeholder: 'expenseAiExample', action: 'expenseAiGenerate', limit: 500 },
} as const;
type AssistantMode = keyof typeof modes;
const modelErrors = [
  'ledgerAiUnavailable', 'ledgerAiUnclear', 'ledgerAiAdminOnly', 'ledgerAiContextRequired', 'ledgerAiContextExpired', 'expenseAiRateLimit', 'expenseAiUnavailable', 'expenseAiUnclear',
];
const actionLabels: Record<LedgerAction, string> = {
  this_month: 'ledgerAiThisMonth', last_month: 'ledgerAiLastMonth', compare_last_month: 'ledgerAiCompareLastMonth',
  details: 'ledgerAiDetails', order_value: 'ledgerAiOrderValue', posted_expense: 'ledgerAiPostedExpense',
};

const pages = {
  invoice: 'appSearchInvoice',
  invoiceInfo: 'invInfoTab',
  invoiceRecords: 'invRecordsTab',
  invoiceApply: 'invApply',
  expense: 'expenseHistory',
  expenseEntry: 'appSearchExpenseEntry',
  refund: 'appSearchRefund',
  expenseAi: 'expenseAiTitle',
  askLedger: 'assistantAsk',
  procurement: 'procTitle',
  newOrder: 'procNewOrder',
  procurementHistory: 'procHistory',
  products: 'appSearchProducts',
  addProduct: 'procAddProduct',
  procurementCart: 'appSearchCart',
  revenue: 'revHistoryBtn',
  revenueEntry: 'dailyRevenue',
  statistics: 'appSearchStatistics',
  reconciliation: 'reconHistory',
  reconciliationEntry: 'tabRecon',
  fee: 'platformFee',
  feeHistory: 'appSearchFeeHistory',
  feeEntry: 'addFeeEntry',
  partner: 'appSearchPartner',
  partnerStructure: 'lpStructure',
  issueDividend: 'issueDividend',
  dividendHistory: 'dividendHistory',
  profile: 'appSearchProfile',
  account: 'accountInfo',
  email: 'changeEmail',
  password: 'changePassword',
  security: 'securitySettings',
  avatar: 'appSearchAvatar',
  cover: 'editCover',
  signature: 'appSearchSignature',
  theme: 'themeLabel',
  themeSettings: 'bgSettings',
  language: 'language',
  loginSecurity: 'authSettingsTitle',
  faceId: 'faceIDLabel',
  singleSession: 'ssoLabel',
  sessionTimeout: 'sessionTimeoutLabel',
  deleteAccount: 'deleteAccount',
  logout: 'logout',
  userManagement: 'userManagement',
} as const;

const recordLabels: Record<AppSearchRecord['kind'], string> = {
  expense: 'expenseHistory', procurement: 'procTitle', invoice: 'appSearchInvoice',
  product: 'appSearchProduct', partner: 'appSearchPartner', revenue: 'dailyRevenue', reconciliation: 'reconHistory',
};

export type AppSearchPage = keyof typeof pages;
type SearchResult = AppSearchPage | AppSearchRecord | {
  kind: 'operatingHistory';
  screen: 'DailyHistory' | 'ExpenseHistory';
  range: { from: string; to: string };
};
export type AppSearchTarget = Exclude<SearchResult, 'expenseAi' | 'askLedger'>;
const defaultDiscoverShortcuts: readonly AppSearchPage[] = ['procurementHistory', 'expense', 'statistics', 'invoice'];
const discoverPages = (Object.keys(pages) as AppSearchPage[]).filter(page =>
  !['askLedger', 'expenseAi', 'password', 'deleteAccount', 'logout'].includes(page));
const publicDiscoverPages = discoverPages.filter(page => page !== 'userManagement');

function SearchResults({ records, onOpen, disabled }: {
  records: AppSearchRecord[];
  onOpen: (target: SearchResult) => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.hitList}>
      {(Object.keys(recordLabels) as AppSearchRecord['kind'][]).map(kind => {
        const matchingRecords = records.filter(record => record.kind === kind);
        if (!matchingRecords.length) return null;
        return (
          <View key={kind} style={styles.hitList}>
            <Text style={{ color: colors.textSub }}>{t(recordLabels[kind])}</Text>
            {matchingRecords.map(record => {
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
      {!records.length && <Text style={{ color: colors.textSub }}>{t('appSearchNoMatches')}</Text>}
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
  profit: ['operatingProfitBeforeFees', 'ledgerAiProfitBasis', 'statistics'],
  net_received: ['operatingNetReceived', 'operatingNetBasis', 'statistics'],
  operating_profit: ['operatingProfit', 'operatingProfitBasis', 'statistics'],
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

function LedgerResult({ answer, onOpenResult, onSearchSupplier, onShowRegistrations, hideUserManagement, disabled }: {
  answer: LedgerAnswer;
  onOpenResult: (target: SearchResult) => void;
  onSearchSupplier: (name: string) => void;
  onShowRegistrations: (offset?: number) => void;
  hideUserManagement: boolean;
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
  const { supplier, category, current, comparison, difference, registrations } = answer;
  const range = current.start_date ? { from: current.start_date, to: current.end_date } : null;
  const revenueMetric = ['turnover', 'received', 'net_received', 'operating_profit', 'profit'].includes(answer.metric);
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
      {answer.metric === 'registered_users' && (
        registrations ? (
          <>
            <Text style={[styles.title, { color: colors.textMain }]}>{t('ledgerAiRegistrationDetails')}</Text>
            {registrations.users.map(({ id, username, created_at }) =>
              row(username, created_at.slice(0, 16).replace('T', ' ') || '—', id))}
            {!registrations.users.length && <Text style={{ color: colors.textSub }}>{t('ledgerAiNoRecords')}</Text>}
            {registrations.next_offset !== null &&
              link(t('loadMore'), () => onShowRegistrations(registrations.next_offset ?? undefined))}
          </>
        ) : current.records > 0 && link(t('ledgerAiRegistrationDetails'), () => onShowRegistrations())
      )}
      {current.fees_complete === false && (
        <Text style={[styles.caption, { color: colors.warning }]}>{t('operatingFeeGap')}</Text>
      )}
      {comparison?.fees_complete === false && current.fees_complete !== false && (
        <Text style={[styles.caption, { color: colors.warning }]}>{t('operatingComparisonGap')}</Text>
      )}
      {current.received !== undefined && row(t('actualReceived'), fmtAmtFull(current.received))}
      {current.platform_fees !== undefined && row(t('platformFee'), fmtAmtFull(current.platform_fees))}
      {answer.metric === 'operating_profit' && current.expenses !== undefined && row(t('expense'), fmtAmtFull(current.expenses))}
      {range && revenueMetric && link(t('revHistoryBtn'), () => onOpenResult({ kind: 'operatingHistory', screen: 'DailyHistory', range }))}
      {range && answer.metric === 'operating_profit' && link(t('expenseHistory'),
        () => onOpenResult({ kind: 'operatingHistory', screen: 'ExpenseHistory', range }))}
      {!!supplier && isProcurement && <Text style={[styles.caption, { color: colors.textSub }]}>{t('ledgerAiProcurementSupplierBasis')}</Text>}
      {supplier && !isProcurement
        ? link(t('appSearchRelated'), () => onSearchSupplier(supplier))
        : !(page === 'userManagement' && hideUserManagement) && link(t(pages[page]), () => onOpenResult(page))}
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

export default function AssistantScreen({ active, onBack, onOpen, onReviewDraft }: {
  active: boolean;
  onBack: () => void;
  onOpen: (target: AppSearchTarget, signal: AbortSignal) => Promise<() => void>;
  onReviewDraft: (draft: ExpenseDraft) => void;
}) {
  const { colors } = useTheme();
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<AssistantChatState | null>(null);
  const [chatError, setChatError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [memoryVisible, setMemoryVisible] = useState(false);
  const [preferences, setPreferences] = useState<AssistantPreferences | null>(null);
  const [memoryBusy, setMemoryBusy] = useState(false);
  const [memoryError, setMemoryError] = useState('');
  const memoryRequest = useRef<AbortController | null>(null);
  const [pendingText, setPendingText] = useState('');
  const [cardUpdates, setCardUpdates] = useState<Record<string, LedgerResponse[]>>({});
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraft | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<AssistantMode>('ask');
  const [adminShortcutKey, setAdminShortcutKey] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const chatWrite = useRef(new WriteSubmission<{ text: string | null; revision: string | null }>());
  const chatScroll = useRef<ScrollView>(null);
  const followChat = useRef(true);
  const input = useRef<React.ElementRef<typeof AppTextInput>>(null);
  const speechPrefix = useRef('');
  const speech = useAssistantSpeech(active && mode === 'record', transcript => {
    setQuestion([speechPrefix.current, transcript].filter(Boolean).join(' ').slice(0, modes.record.limit));
    setDraft(null);
    setError('');
  });
  useEffect(() => {
    if (active) return () => request.current?.abort();
    request.current = null;
    setBusy(false);
    setPendingText('');
  }, [active]);

  useEffect(() => {
    if (!active) return;
    setKeyboardVisible(Keyboard.isVisible());
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [active]);

  const usageKey = discoverUsageKey(API_BASE, getCurrentUserId());
  const discoverRankings = useMemo(() => {
    const usage = readDiscoverUsage(active ? usageKey : null);
    return {
      all: rankDiscoverShortcuts(usage, discoverPages, defaultDiscoverShortcuts),
      public: rankDiscoverShortcuts(usage, publicDiscoverPages, defaultDiscoverShortcuts),
    };
  }, [active, usageKey]);
  const needsAdminCheck = discoverRankings.all.includes('userManagement');
  useEffect(() => {
    setAdminShortcutKey(null);
    if (!active || !usageKey || !needsAdminCheck) return;
    const controller = new AbortController();
    api.admin.check(controller.signal).then(({ is_admin }) => {
      if (!controller.signal.aborted && is_admin === true) setAdminShortcutKey(usageKey);
    }).catch(() => {});
    return () => controller.abort();
  }, [active, usageKey, needsAdminCheck]);
  const discoverShortcuts = adminShortcutKey && adminShortcutKey === usageKey
    ? discoverRankings.all : discoverRankings.public;

  const changeQuestion = (text: string) => {
    setQuestion(text);
    setDraft(null);
    setError('');
  };

  const refreshChat = async (signal: AbortSignal) => {
    setChatError('');
    try {
      const state = await api.getAssistantChat(signal);
      if (!signal.aborted) {
        followChat.current = true;
        setChat(state);
      }
    } catch {
      if (!signal.aborted) setChatError(t('assistantChatLoadFailed'));
    }
  };

  useEffect(() => {
    if (!active || mode !== 'ask' || chat) return;
    const controller = new AbortController();
    void refreshChat(controller.signal);
    return () => controller.abort();
  }, [active, mode, chat, loadAttempt]);

  useEffect(() => () => memoryRequest.current?.abort(), []);

  const refreshPreferences = async () => {
    if (memoryRequest.current) return;
    const controller = new AbortController();
    memoryRequest.current = controller;
    setMemoryBusy(true);
    setMemoryError('');
    try {
      const values = await api.getAssistantPreferences(controller.signal);
      if (!controller.signal.aborted) setPreferences(values);
    } catch {
      if (!controller.signal.aborted) setMemoryError(t('assistantMemoryFailed'));
    } finally {
      if (memoryRequest.current === controller) memoryRequest.current = null;
      if (!controller.signal.aborted) setMemoryBusy(false);
    }
  };

  const editPreference = async (key: AssistantPreference['key'], value: AssistantPreference['value'] | null) => {
    if (memoryRequest.current) return;
    const controller = new AbortController();
    memoryRequest.current = controller;
    setMemoryBusy(true);
    setMemoryError('');
    try {
      const values = await api.setAssistantPreference(key, value, controller.signal);
      if (!controller.signal.aborted) setPreferences(values);
    } catch {
      if (!controller.signal.aborted) setMemoryError(t('assistantMemoryFailed'));
    } finally {
      if (memoryRequest.current === controller) memoryRequest.current = null;
      if (!controller.signal.aborted) setMemoryBusy(false);
    }
  };

  const loadOlder = async () => {
    if (!chat?.older_before || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const older = await api.getAssistantChat(controller.signal, chat.older_before);
      if (controller.signal.aborted) return;
      if (older.revision !== chat.revision) {
        await refreshChat(controller.signal);
        if (!controller.signal.aborted) setError(t('assistantChatChanged'));
      } else {
        setChat({ ...chat, older_before: older.older_before, turns: [...older.turns, ...chat.turns] });
      }
    } catch {
      if (!controller.signal.aborted) setError(t('assistantChatLoadFailed'));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  };

  const switchMode = (next: AssistantMode) => {
    if (next === mode || request.current) return;
    if (next === 'ask') followChat.current = true;
    setMode(next);
    changeQuestion('');
  };

  const submitChat = async (message: string | null) => {
    if (!chat || request.current || message === '') return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    followChat.current = true;
    setPendingText(message ?? '');
    if (message === null) {
      Keyboard.dismiss();
    } else {
      setQuestion(current => current.trim() === message ? '' : current);
    }
    try {
      const next = await chatWrite.current.run(
        { revision: chat.revision, message },
        () => ({ revision: chat.revision, text: message }),
        async (payload, key) => ({
          status: 'ok',
          state: await api.updateAssistantChat(payload.revision, key, payload.text, controller.signal),
        }),
      );
      if (next && !controller.signal.aborted) {
        followChat.current = true;
        setChat(current => {
          const first = next.state.turns[0]?.position;
          if (!current || !first || message === null) return next.state;
          const older = current.turns.filter(turn => turn.position !== undefined && turn.position < first);
          return older.length ? { ...next.state, older_before: current.older_before,
            turns: [...older, ...next.state.turns] } : next.state;
        });
        if (next.state.turns.at(-1)?.saved_preference) void refreshPreferences();
        if (message === null) {
          setQuestion('');
          setCardUpdates({});
        }
      }
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (message !== null) setQuestion(current => current || message);
      if (failure instanceof Error && failure.message === 'assistantChatChanged') {
        await refreshChat(controller.signal);
        if (!controller.signal.aborted) setError(t('assistantChatChanged'));
      } else {
        setError(t('ledgerAiFailed'));
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setPendingText('');
        setBusy(false);
      }
    }
  };

  const submit = async () => {
    const text = question.trim();
    if (!text || request.current || speech.active) return;
    if (mode === 'ask') {
      await submitChat(text);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    setDraft(null);
    Keyboard.dismiss();
    try {
      const result = await api.generateExpenseDraft(text, controller.signal);
      if (!controller.signal.aborted) setDraft(result.draft);
    } catch (failure) {
      if (controller.signal.aborted) return;
      const message = failure instanceof Error ? failure.message : '';
      setError(t(modelErrors.includes(message) ? message : 'expenseAiFailed'));
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
      Keyboard.dismiss();
      navigate();
      if (mode === 'ask' && usageKey && typeof target === 'string' && discoverPages.includes(target)
        && usageKey === discoverUsageKey(API_BASE, getCurrentUserId())) {
        recordDiscoverOpen(usageKey, target);
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

  const activeMode = modes[mode];
  const isChat = mode === 'ask';
  const controlsDisabled = busy || speech.active;
  const disabled = !question.trim() || controlsDisabled || (mode === 'ask' && !chat);

  const runCardAction = async (card: string, entry: LedgerResponse, query: LedgerRequest) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const result = await api.askLedger(query, controller.signal);
      if (controller.signal.aborted) return;
      setCardUpdates(previous => {
        const updates = previous[card] ?? [];
        if (result.status === 'details') {
          const previousPage = updates.find(item => item.status === 'details');
          const records = previousPage?.status === 'details' ? previousPage.records : [];
          const ids = new Set(records.map(record => record.id));
          return { ...previous, [card]: [entry, {
            ...result, records: [...records, ...result.records.filter(record => !ids.has(record.id))],
          }] };
        }
        if ('action' in query && query.action === 'registration_details' && query.offset && entry.status === 'ok'
          && 'registrations' in entry.answer && entry.answer.registrations && result.status === 'ok'
          && 'registrations' in result.answer && result.answer.registrations) {
          const users = entry.answer.registrations.users;
          const ids = new Set(users.map(user => user.id));
          const page = result.answer.registrations;
          return { ...previous, [card]: [{ ...result, answer: { ...result.answer, registrations: {
            ...page, users: [...users, ...page.users.filter(user => !ids.has(user.id))],
          } } }] };
        }
        return { ...previous, [card]: [result] };
      });
    } catch (failure) {
      if (controller.signal.aborted) return;
      const message = failure instanceof Error ? failure.message : '';
      setError(t(modelErrors.includes(message) ? message : 'ledgerAiFailed'));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  };

  const renderTurn = (turn: AssistantChatTurn) => (
    <View key={turn.id} style={styles.chatTurn}>
      <Text style={[styles.userMessage, { backgroundColor: colors.primary, color: colors.surface }]}>{turn.text}</Text>
      {!!turn.message && <Text style={[styles.assistantMessage, { color: colors.textMain }]}>{turn.message}</Text>}
      {!!turn.notice && <Text style={[styles.assistantMessage, { color: colors.textSub }]}>{t(turn.notice)}</Text>}
      {!!turn.destinations.length && !turn.message && !turn.answers.length && (
        <Text style={[styles.assistantMessage, { color: colors.textMain }]}>{t('assistantChatDestination')}</Text>
      )}
      {turn.saved_preference && (
        <Text style={[styles.assistantMessage, { color: colors.textMain }]}>
          {t('assistantMemorySaved').replace('{name}', t(preferenceLabel[turn.saved_preference.key]))
            .replace('{value}', t(preferenceValueLabel[turn.saved_preference.value]))}
        </Text>
      )}
      {turn.suggestion && (
        <View style={[styles.result, { backgroundColor: colors.bg }]}>
          <Text style={{ color: colors.textMain }}>
            {t('assistantMemorySuggestion').replace('{value}', t(preferenceValueLabel[turn.suggestion.value]))}
          </Text>
          <TouchableOpacity accessibilityRole="button" disabled={memoryBusy || busy
            || preferences?.[turn.suggestion.key] === turn.suggestion.value}
            onPress={() => turn.suggestion && void editPreference(turn.suggestion.key, turn.suggestion.value)}
            style={styles.resultLink}>
            <Text style={{ color: colors.primary }}>
              {t(preferences?.[turn.suggestion.key] === turn.suggestion.value ? 'assistantMemoryConfirmed' : 'assistantMemoryRemember')}
            </Text>
          </TouchableOpacity>
          {!!memoryError && <Text style={{ color: colors.danger }}>{memoryError}</Text>}
        </View>
      )}
      {turn.searches?.map((search, index) => (
        <View key={index} style={[styles.result, { backgroundColor: colors.bg }]}>
          <Text style={[styles.title, { color: colors.textMain }]}>{search.keyword}</Text>
          <SearchResults records={search.records} onOpen={openResult} disabled={busy} />
        </View>
      ))}
      {turn.draft && (
        <View style={styles.chatTurn}>
          <DraftResult draft={turn.draft} />
          <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => {
            if (turn.draft) {
              Keyboard.dismiss();
              onReviewDraft(turn.draft);
            }
          }} style={[styles.chatRoute, { backgroundColor: colors.bg }]}>
            <Text style={{ color: colors.primary }}>{t('assistantReviewDraft')} ›</Text>
          </TouchableOpacity>
        </View>
      )}
      {turn.answers.map((answer, index) => {
        const key = `${turn.id}-${index}`;
        const updates = cardUpdates[key];
        const entry = updates?.[0] ?? answer;
        if (entry.status === 'details') return null;
        const details = updates?.[1];
        const act = (action: LedgerAction | 'registration_details', offset?: number) => {
          if (entry.context) void runCardAction(key, entry, { action, context: entry.context, offset });
        };
        return (
          <View key={key} style={styles.chatTurn}>
            {entry.status === 'ok' ? (
              <LedgerResult answer={entry.answer} onOpenResult={openResult} onSearchSupplier={name => void submitChat(name)}
                onShowRegistrations={offset => act('registration_details', offset)} disabled={busy}
                hideUserManagement={turn.destinations.includes('userManagement')} />
            ) : (
              <Text style={{ color: colors.textMain }}>
                {t(entry.reason === 'period' ? 'ledgerAiChoosePeriod' : 'ledgerAiChooseBasis')}
              </Text>
            )}
            {!!entry.actions?.length && (
              <View style={styles.shortcuts}>
                {entry.actions.filter(action => action !== 'details' || !details).map(action => (
                  <TouchableOpacity key={action} accessibilityRole="button" disabled={busy} onPress={() => act(action)}
                    style={[styles.shortcut, { backgroundColor: colors.bg }]}>
                    <Text style={{ color: colors.primary }}>{t(actionLabels[action])}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {details?.status === 'details' && (
              <>
                {details.records.map(record => (
                  <TouchableOpacity key={record.id} accessibilityRole="button" disabled={busy} onPress={() => void openResult(record)}
                    style={styles.hit}>
                    <View style={styles.hitTitle}>
                      <Text style={{ color: colors.textMain }}>{t('procNowBatch').replace('{n}', record.title ?? '')}</Text>
                      <Text style={[styles.caption, { color: colors.textSub }]}>
                        {formatDate(record.date)} · {t(record.settled ? 'procSettled' : 'procUnsettled')}
                      </Text>
                    </View>
                    {record.amount !== null && <Text style={{ color: colors.textMain }}>{fmtAmtFull(record.amount)}</Text>}
                  </TouchableOpacity>
                ))}
                {!details.records.length && <Text style={{ color: colors.textSub }}>{t('ledgerAiNoRecords')}</Text>}
                {details.next_offset !== null && (
                  <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.shortcut}
                    onPress={() => act('details', details.next_offset ?? undefined)}>
                    <Text style={{ color: colors.primary }}>{t('ledgerAiMoreDetails')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        );
      })}
      {turn.destinations.filter((route): route is AppSearchPage =>
        Object.prototype.hasOwnProperty.call(pages, route),
      ).map(route => (
        <TouchableOpacity key={route} accessibilityRole="button" disabled={busy} onPress={() => void openResult(route)}
          style={[styles.chatRoute, { backgroundColor: colors.bg }]}>
          <Text style={{ color: colors.primary }}>{t('assistantChatOpen').replace('{page}', t(pages[route]))} ›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

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
      editable={isChat ? !!chat : !controlsDisabled}
      multiline
      maxLength={activeMode.limit}
      underlineColorAndroid="transparent"
      style={[
        styles.input, isChat ? styles.chatInput : styles.multilineInput,
        { color: colors.textMain, backgroundColor: isChat ? colors.surface : colors.bg },
      ]}
    />
  );

  const composerInput = mode === 'record' ? (
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
  ) : textInput;

  const submitButton = (
    <SubmitButton
      label={t(draft ? 'assistantReviewDraft' : activeMode.action)}
      onPress={() => {
        if (draft) {
          Keyboard.dismiss();
          onReviewDraft(draft);
        } else {
          void submit();
        }
      }}
      disabled={disabled}
      loading={busy}
      style={[styles.submit, isChat && styles.chatSend, { backgroundColor: colors.primary, opacity: disabled && !busy ? 0.45 : 1 }]}
      textStyle={{ color: colors.surface, fontWeight: '700' }}
    />
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <HomeBackground />
      {active && <StatusBar barStyle="dark-content" />}
      <HistoryHeader
        inline
        safeTop={insets.top}
        title={t('assistantTitle')}
        rightAction={mode === 'ask' ? (
          <View style={styles.chatHeaderActions}>
            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => {
              Keyboard.dismiss();
              setMemoryVisible(true);
              void refreshPreferences();
            }} style={styles.shortcut}>
              <Text style={{ color: colors.textMain }}>{t('assistantMemory')}</Text>
            </TouchableOpacity>
            {!!chat?.turns.length && (
              <TouchableOpacity accessibilityRole="button" onPress={() => {
                Alert.alert(t('assistantChatNew'), t('assistantChatResetConfirm'), [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('assistantChatNew'), style: 'destructive', onPress: () => void submitChat(null) },
                ]);
              }} disabled={busy} style={styles.shortcut}>
                <Text style={{ color: colors.textMain }}>{t('assistantChatNew')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : undefined}
        onBack={() => {
          Keyboard.dismiss();
          onBack();
        }}
      />
      <View style={[
        styles.screen,
        { backgroundColor: colors.surface, paddingLeft: insets.left, paddingRight: insets.right },
      ]}>
        <View style={[styles.toolbar, styles.contentWidth]}>
          <View accessibilityRole="tablist" style={[styles.modes, { backgroundColor: colors.bg }]}>
            {(Object.keys(modes) as AssistantMode[]).map(option => {
              const selected = mode === option;
              return (
                <TouchableOpacity key={option} accessibilityRole="tab" accessibilityState={{ selected, disabled: controlsDisabled }}
                  disabled={controlsDisabled} onPress={() => switchMode(option)}
                  style={[styles.mode, selected && { backgroundColor: colors.surface }]}>
                  <Text style={{ color: selected ? colors.primary : colors.textSub, fontWeight: selected ? '700' : '500' }}>
                    {t(modes[option].label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <ScrollView
          ref={chatScroll}
          onContentSizeChange={() => {
            if (mode === 'ask' && followChat.current) {
              followChat.current = false;
              chatScroll.current?.scrollToEnd({ animated: true });
            }
          }}
          style={styles.screen}
          contentContainerStyle={[styles.bodyContent, styles.contentWidth]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'ask' && (
            <>
              {!chat && !chatError && <ActivityIndicator size="small" color={colors.primary} />}
              {!!chatError && (
                <View style={styles.chatTurn}>
                  <Text style={{ color: colors.danger }}>{chatError}</Text>
                  <TouchableOpacity accessibilityRole="button" style={styles.shortcut} onPress={() => {
                    setChat(null);
                    setLoadAttempt(attempt => attempt + 1);
                  }}>
                    <Text style={{ color: colors.primary }}>{t('retry')}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!!chat?.older_before && (
                <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void loadOlder()}
                  style={[styles.chatRoute, { backgroundColor: colors.bg }]}>
                  <Text style={{ color: colors.primary }}>{t('assistantChatOlder')}</Text>
                </TouchableOpacity>
              )}
              {chat?.turns.map(renderTurn)}
              {chat && !chat.turns.length && !pendingText && (
                <View style={styles.chatTurn}>
                  <Text style={[styles.chatWelcome, { color: colors.textMain }]}>{t('assistantChatWelcome')}</Text>
                  <View style={styles.shortcuts}>
                    {discoverShortcuts.map(page => (
                      <TouchableOpacity key={page} accessibilityRole="button" disabled={busy} onPress={() => void openResult(page)}
                        style={[styles.shortcut, { backgroundColor: colors.bg }]}>
                        <Text style={{ color: colors.textMain }}>{t(pages[page])}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {!!pendingText && (
                <View style={styles.chatTurn}>
                  <Text style={[styles.userMessage, { backgroundColor: colors.primary, color: colors.surface }]}>{pendingText}</Text>
                  <ActivityIndicator size="small" color={colors.primary} style={styles.chatLoading} />
                </View>
              )}
            </>
          )}
          {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{error}</Text>}
          {draft && <DraftResult draft={draft} />}
        </ScrollView>
        <View style={[
          styles.composer, styles.contentWidth, isChat && styles.chatComposer,
          { borderTopColor: colors.bg, paddingBottom: keyboardVisible ? 10 : Math.max(10, insets.bottom),
            backgroundColor: isChat ? colors.bg : colors.surface },
        ]}>
          {composerInput}
          {!isChat && !!speech.error && (
            <Text accessibilityLiveRegion="polite" style={[styles.caption, { color: colors.danger }]}>
              {t(speech.error)}
            </Text>
          )}
          {submitButton}
        </View>
      </View>
      <AssistantMemoryPanel visible={memoryVisible} onClose={() => setMemoryVisible(false)} values={preferences}
        busy={memoryBusy} error={memoryError} onEdit={(key, value) => void editPreference(key, value)}
        onRetry={() => void refreshPreferences()} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  contentWidth: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  toolbar: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  title: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },
  amount: { fontSize: FONTS.h2.size, fontWeight: '700', fontVariant: ['tabular-nums'] },
  caption: { fontSize: FONTS.micro.size, lineHeight: 17 },
  bodyContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  input: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  chatInput: { flex: 1, minWidth: 0, maxHeight: 112 },
  chatSend: { minWidth: 68 },
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
  modes: { flexDirection: 'row', padding: 3, gap: 2, borderRadius: 12 },
  mode: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 4, borderRadius: 9 },
  hitList: { gap: 3 },
  hit: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingVertical: 7, gap: 8 },
  hitTitle: { flex: 1 },
  result: { borderRadius: 12, padding: 12, gap: 5 },
  resultLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  chatHeaderActions: { flexDirection: 'row', alignItems: 'center' },
  chatTurn: { gap: 9, paddingBottom: 6 },
  userMessage: { alignSelf: 'flex-end', maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 15 },
  assistantMessage: { lineHeight: 21 },
  chatWelcome: { fontSize: FONTS.h2.size, fontWeight: '600', marginVertical: 8 },
  chatLoading: { alignSelf: 'flex-start', margin: 8 },
  chatRoute: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', borderRadius: 10, paddingHorizontal: 13 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  shortcut: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 8 },
  totalRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  period: { flex: 1 },
  chatComposer: { flexDirection: 'row', alignItems: 'flex-end' },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  submit: { minHeight: 44, minWidth: 94, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
});
