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
  invoice: ['appSearchInvoice', '发票|發票|发票管理|開票|开票|票據|invoice'],
  invoiceInfo: ['invInfoTab', '发票资料|發票資料|开票信息|開票資訊|invoice info|billing details'],
  invoiceRecords: ['invRecordsTab', '发票记录|發票紀錄|开票记录|開票記錄|发票历史|發票歷史|上传发票|上傳發票|invoice records|upload invoice'],
  invoiceApply: ['invApply', '申请开票|申請開票|新建发票|新增發票|apply for invoice|new invoice'],
  expense: ['expenseHistory', '支出记录|支出記錄|支出历史|支出歷史|流水|expense history'],
  expenseEntry: ['appSearchExpenseEntry', '记账|記帳|录入支出|輸入支出|凭证上传|憑證上傳|add expense'],
  refund: ['appSearchRefund', '退款|退费|退費|refund'],
  expenseAi: ['expenseAiTitle', '一句话记账|一句話記帳|智能记账|智慧記帳|ai expense'],
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
export type AppSearchTarget = AppSearchPage | AppSearchRecord;

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
