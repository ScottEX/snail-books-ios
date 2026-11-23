import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api, type AppSearchRecord, type LedgerAnswer, type LedgerTotal } from '../api/client';
import { t } from '../i18n';
import { FONTS, useTheme, withAlpha } from '../theme';
import { MODAL_CARD_RADIUS } from '../sharedStyles';
import { fmtAmtFull, formatDate } from '../utils/format';
import AppTextInput from './AppTextInput';
import ButtonPair from './ButtonPair';
import CloseButton from './CloseButton';
import ModalOverlay from './ModalOverlay';

const examples = ['ledgerAiSalaryExample', 'ledgerAiTurnoverExample', 'ledgerAiGoodsExample'];
const knownErrors = ['ledgerAiUnavailable', 'ledgerAiUnclear', 'expenseAiRateLimit'];

const pages = {
  invoice: ['appSearchInvoice', '发票 開票 开票 票據 invoice'],
  expense: ['expenseHistory', '支出 流水 记账 記帳 expense'],
  procurement: ['procTitle', '采购 採購 进货 進貨 purchase order procurement'],
  revenue: ['dailyRevenue', '营收 營收 营业额 營業額 revenue'],
  reconciliation: ['reconHistory', '对账 對帳 對賬 reconciliation'],
  partner: ['appSearchPartner', '合伙人 合夥人 partner'],
  profile: ['appSearchProfile', '个人中心 個人中心 个人资料 個人資料 profile'],
  email: ['changeEmail', '修改邮箱 修改郵箱 更改邮箱 更改郵箱 email'],
  password: ['changePassword', '改密码 改密碼 更改密码 更改密碼 更换密码 更換密碼 password'],
  userManagement: ['userManagement', '用户管理 用戶管理 使用者管理 管理用户 管理用戶 管理使用者 user management manage users'],
} as const;

const recordLabels: Record<AppSearchRecord['kind'], string> = {
  expense: 'expenseHistory', procurement: 'procTitle', invoice: 'appSearchInvoice',
  product: 'appSearchProduct', partner: 'appSearchPartner', revenue: 'dailyRevenue', reconciliation: 'reconHistory',
};

export type AppSearchPage = keyof typeof pages;
export type AppSearchTarget = AppSearchPage | AppSearchRecord;

function findPages(keyword: string) {
  const query = keyword.toLowerCase();
  return (Object.keys(pages) as AppSearchPage[]).filter(page => {
    const [label, aliases] = pages[page];
    const title = t(label).toLowerCase();
    return title.includes(query) || query.includes(title) ||
      aliases.includes(query) || aliases.split(' ').some(alias => query.includes(alias));
  });
}

async function findVisiblePages(keyword: string, signal: AbortSignal) {
  const matches = findPages(keyword);
  if (!matches.includes('userManagement')) return matches;
  const { is_admin } = await api.admin.check(signal);
  return is_admin === true ? matches : matches.filter(page => page !== 'userManagement');
}

function SearchResults({ hits, onOpen, disabled }: {
  hits: { pages: AppSearchPage[]; records: AppSearchRecord[] };
  onOpen: (target: AppSearchTarget) => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.hitList}>
      {hits.pages.length > 0 && <Text style={{ color: colors.textSub }}>{t('appSearchPages')}</Text>}
      {hits.pages.map(page => (
        <TouchableOpacity key={page} accessibilityRole="button" disabled={disabled} onPress={() => onOpen(page)} style={styles.hit}>
          <Text style={{ color: colors.primary }}>{t(pages[page][0])}</Text>
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
                  <Text style={{ color: colors.primary }} numberOfLines={2}>{record.title || t(recordLabels[record.kind])}</Text>
                  {!!subtitle && <Text style={{ color: colors.textSub }} numberOfLines={2}>{subtitle}</Text>}
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

function periodLabel(total: LedgerTotal) {
  const start = formatDate(total.start_date);
  return total.start_date === total.end_date ? start : `${start} – ${formatDate(total.end_date)}`;
}

function LedgerResult({ answer, onSearchSupplier }: { answer: LedgerAnswer; onSearchSupplier: (name: string) => void }) {
  const { colors } = useTheme();
  const isExpense = answer.metric === 'expense';
  const label = isExpense ? answer.category ?? 'expense'
    : answer.metric === 'received' ? 'actualReceived' : 'revTurnover';
  const basis = answer.supplier ? 'appSearchSupplierBasis' : isExpense
    ? answer.category === 'goods' ? 'ledgerAiGoodsBasis' : 'ledgerAiExpenseBasis'
    : answer.metric === 'received' ? 'ledgerAiReceivedBasis' : 'ledgerAiTurnoverBasis';
  return (
    <View style={[styles.result, { backgroundColor: withAlpha(colors.primary, 0.08) }]} accessibilityLiveRegion="polite">
      <Text style={[styles.title, { color: colors.textMain }]}>{t(label)}{answer.supplier ? ` · ${answer.supplier}` : ''}</Text>
      {[answer.current, answer.comparison].map((total, index) => total && (
        <View key={index} style={styles.totalRow}>
          <Text style={[styles.period, { color: colors.textSub }]}>{periodLabel(total)}</Text>
          <Text style={{ color: colors.textMain, fontWeight: '600' }}>
            {total.records ? fmtAmtFull(total.amount) : t('ledgerAiNoRecords')}
          </Text>
        </View>
      ))}
      {answer.difference !== null && (
        <Text style={{ color: colors.primary, fontWeight: '600' }}>
          {t('ledgerAiDifference')} {answer.difference > 0 ? '+' : ''}{fmtAmtFull(answer.difference)}
        </Text>
      )}
      <Text style={{ color: colors.textSub }}>{t(basis)}</Text>
      {!!answer.supplier && (
        <TouchableOpacity accessibilityRole="button" onPress={() => onSearchSupplier(answer.supplier!)}>
          <Text style={{ color: colors.primary }}>{t('appSearchRelated')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function AppSearchModal({ visible, onClose, onOpen }: {
  visible: boolean;
  onClose: () => void;
  onOpen: (target: AppSearchTarget, signal: AbortSignal) => Promise<() => void>;
}) {
  const { colors } = useTheme();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<LedgerAnswer | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'search' | 'ask'>('search');
  const [hits, setHits] = useState<{ pages: AppSearchPage[]; records: AppSearchRecord[] } | null>(null);
  const request = useRef<AbortController | null>(null);
  const pendingNavigation = useRef<(() => void) | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const close = () => {
    pendingNavigation.current = null;
    Keyboard.dismiss();
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setQuestion('');
    setAnswer(null);
    setHits(null);
    setMode('search');
    setError('');
    onClose();
  };

  const changeQuestion = (text: string) => {
    setQuestion(text);
    setAnswer(null);
    setHits(null);
    setError('');
  };

  const submit = async (searchMode = mode, query = question) => {
    const text = query.trim();
    if (!text || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    setAnswer(null);
    setHits(null);
    Keyboard.dismiss();
    try {
      if (searchMode === 'search') {
        const matchedPages = await findVisiblePages(text, controller.signal);
        if (controller.signal.aborted) return;
        if (matchedPages.length) setHits({ pages: matchedPages, records: [] });
        const result = await api.searchApp(text, controller.signal);
        if (!controller.signal.aborted) setHits({ pages: matchedPages, records: result.results });
      } else {
        const result = await api.askLedger(text, controller.signal);
        if (!controller.signal.aborted) setAnswer(result.answer);
      }
    } catch (failure) {
      if (controller.signal.aborted) return;
      const message = failure instanceof Error ? failure.message : '';
      setError(t(searchMode === 'search' ? 'appSearchFailed' : knownErrors.includes(message) ? message : 'ledgerAiFailed'));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  };

  const openResult = async (target: AppSearchTarget) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const navigate = await onOpen(target, controller.signal);
      if (!controller.signal.aborted) {
        close();
        pendingNavigation.current = navigate;
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
    setQuestion(name);
    void submit('search', name);
  };

  return (
    <ModalOverlay
      visible={visible}
      onClose={close}
      onDismiss={Platform.OS === 'ios' ? finishNavigation : undefined}
      onClosed={Platform.OS === 'ios' ? undefined : finishNavigation}
      animation="springScale"
      avoidKeyboard
    >
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={[styles.title, { color: colors.surface }]}>{t('appSearchTitle')}</Text>
          <CloseButton onPress={close} />
        </View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <View style={styles.modes}>
            {(['search', 'ask'] as const).map(option => (
              <TouchableOpacity key={option} accessibilityRole="button" accessibilityState={{ selected: mode === option }}
                disabled={busy} onPress={() => { setMode(option); changeQuestion(''); }}
                style={[styles.mode, { backgroundColor: mode === option ? withAlpha(colors.primary, 0.12) : colors.surface }]}>
                <Text style={{ color: colors.primary }}>{t(option === 'search' ? 'appSearchFind' : 'ledgerAiTitle')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {mode === 'ask' && <Text style={{ color: colors.textSub }}>{t('ledgerAiPrivacy')}</Text>}
          <AppTextInput
            accessibilityLabel={t('appSearchTitle')}
            placeholder={t(mode === 'search' ? 'appSearchPlaceholder' : 'ledgerAiTurnoverExample')}
            placeholderTextColor={colors.textSub}
            value={question}
            onChangeText={changeQuestion}
            editable={!busy}
            multiline={mode === 'ask'}
            maxLength={mode === 'search' ? 80 : 300}
            underlineColorAndroid="transparent"
            style={[styles.input, { color: colors.textMain, backgroundColor: colors.bg }]}
          />
          {mode === 'ask' && !answer && !busy && examples.map(key => (
            <TouchableOpacity key={key} accessibilityRole="button" onPress={() => changeQuestion(t(key))}>
              <Text style={{ color: colors.primary, paddingVertical: 4 }}>{t(key)}</Text>
            </TouchableOpacity>
          ))}
          {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{error}</Text>}
          {hits && <SearchResults hits={hits} onOpen={openResult} disabled={busy} />}
          {answer && <LedgerResult answer={answer} onSearchSupplier={searchSupplier} />}
        </ScrollView>
        <View style={styles.actions}>
          <ButtonPair
            leftLabel={t('cancel')}
            leftOnPress={close}
            rightLabel={t(mode === 'search' ? 'appSearchFind' : 'ledgerAiAsk')}
            rightOnPress={() => void submit()}
            rightDisabled={!question.trim() || busy}
            rightLoading={busy}
          />
        </View>
      </View>
    </ModalOverlay>
  );
}

const styles = StyleSheet.create({
  card: { width: 360, maxWidth: '100%', flexShrink: 1, borderRadius: MODAL_CARD_RADIUS, overflow: 'hidden' },
  header: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: FONTS.subBold.size, fontWeight: '700' },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { padding: 18, paddingBottom: 12, gap: 8 },
  input: { minHeight: 66, maxHeight: 110, padding: 10, borderRadius: 10 },
  modes: { flexDirection: 'row', gap: 8 },
  mode: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 8 },
  hitList: { gap: 6 },
  hit: { paddingVertical: 7, gap: 3 },
  result: { borderRadius: 10, padding: 12, gap: 10 },
  totalRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  period: { flex: 1 },
  actions: { paddingHorizontal: 18, paddingBottom: 18 },
});
