import React, { useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Dimensions, Switch, Keyboard,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import { useToast } from '../hooks/useToast';
import { getCurrentUser, getCurrentUserId } from '../utils/storage';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import DatePickerModal from '../components/DatePickerModal';
import CategoryChips from '../components/CategoryChips';
import MonthPicker from '../components/MonthPicker';
import PaymentMethodChips from '../components/PaymentMethodChips';
import ExpenseNoteInput from '../components/ExpenseNoteInput';
import ReceiptUpload from '../components/ReceiptUpload';
import ButtonPair from '../components/ButtonPair';
import CloseButton from '../components/CloseButton';
import EmptyState from '../components/EmptyState';
import SubmitButton from '../components/SubmitButton';
import { useTheme, withAlpha, ThemeColors, FONTS, SHEET_HANDLE_COLOR } from '../theme';
import { modalCardAnimation, modalClose, MODAL_CARD_RADIUS, bottomSheetOverlay, uploadReceiptStyles } from '../sharedStyles';
import { fmtAmt as fmt, fmtAmtFull, toDec2Comma } from '../utils/format';
import { blockNeg, fmtDecInput, toDec2, fmtRefundInput } from '../utils/numbers';
import NumberTickerExt from '../components/NumberTicker';
import { useServerDate } from '../hooks/useServerDate';
import { useExpenseForm } from '../hooks/useExpenseForm';
import ModalOverlay from '../components/ModalOverlay';
import { useDateField } from '../hooks/useDateField';
import DateErrorHint from '../components/DateErrorHint';

import FadeInView from '../components/FadeInView';

/* ── helpers ── */
// Date helpers replaced by useServerDate() hook (server time, not client)
const fmtLocalDate = (s: string) => {
  const [y, m, d] = s.split('-');
  const l = getLang();
  if (l.startsWith('en')) {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[+m-1]} ${+d}, ${y}`;
  }
  return `${y}年${m}月${d}日`;
};
const fmtMonth = (year: number, month: number) => {
  return `${year}年${String(month).padStart(2, '0')}月`;
};
const toNum = (s: string) => parseFloat(s) || 0;

/* ═══════════════════════════════════════════════════════════
   NumberTicker — moved to src/components/NumberTicker.tsx (imported as NumberTickerExt)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   InputWithFocus — 聚焦时边框过渡到品牌红
   ═══════════════════════════════════════════════════════════ */
function InputWithFocus({ style, inputStyle, ...props }: any) {
  const [focused, setFocused] = useState(false);
  const { colors } = useTheme();

  return (
    <AppTextInput
      {...props}
      onFocus={(e: any) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e: any) => { setFocused(false); props.onBlur?.(e); }}
      style={[
        inputStyle,
        {
          borderColor: focused ? colors.primary : colors.secondary,
          // @ts-ignore — web-only transition
          transition: 'border-color 200ms ease',
        },
      ]}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   DateErrorHint — moved to src/components/DateErrorHint.tsx
   ═══════════════════════════════════════════════════════════ */

// Image upload handlers
/* ═══════════════════════════════════════════════════════════
   EXPENSE SCREEN
   ═══════════════════════════════════════════════════════════ */
export default function ExpenseScreen({
  onReconHistory,
  onExpenseHistory,
}: {
  onReconHistory?: () => void;
  onExpenseHistory?: () => void;
}) {
  const { colors } = useTheme();
  const sd = useServerDate();
  // Load business summary internally (matching web)
  const [businessSummary, setBusinessSummary] = useState<any>({});
  const loadBusinessSummary = useCallback(() => {
    api.getBusinessSummary().then((data: any) => {
      setBusinessSummary(data || {});
    }).catch(() => {});
  }, []);
  useEffect(() => { loadBusinessSummary(); }, [loadBusinessSummary]);
  const urlCache = useRef<Map<any, string>>(new Map());
  const getPreviewUrl = (file: any) => {
    // RN: expo-image-picker returns { uri, type, name, size }
    return file?.uri || '';
  };
  const revokePreviewUrl = (file: any) => {
    const url = urlCache.current.get(file);
    if (url) urlCache.current.delete(file);
  };
  const clearUrlCache = () => { urlCache.current.clear(); };
  useEffect(() => { return () => clearUrlCache(); }, []);
  const [activeTab, setActiveTabState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('expense_active_tab');
      return saved !== null ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  });
  const setActiveTab = (i: number) => {
    setActiveTabState(i);
    if (i === 1) setExpDateErr(0);
    try { localStorage.setItem('expense_active_tab', String(i)); } catch {}
  };
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to active card when activeTab changes (tap on card)
  useEffect(() => {
    if (scrollRef.current) {
      const w = Dimensions.get('window').width;
      // Card 0 at content x=18, card 1 at content x=w-18. Snap to viewport x=18 → offsets 0, w-36
      const offsets = [0, w - 36];
      scrollRef.current.scrollTo({ x: offsets[activeTab] || 0, animated: true });
    }
  }, [activeTab]);

  const [showReconConfirm, setShowReconConfirm] = useState(false);
  const [reconSaving, setReconSaving] = useState(false);
  const [showFeeReminder, setShowFeeReminder] = useState(false);
  const hideReconConfirm = () => setShowReconConfirm(false);
  const { showToast, ToastHost } = useToast();

  // Snap-scroll effects are web-only (CSS scroll-snap + DOM scroll listener).

  /* ── 模块一：对账 ── */
  const recDate = useDateField({ sd });
  const [reconForm, setReconForm] = useState({
    cardBalance: '', cashBalance: '', dineIn: '', meituan: '',
    flashSale: '', tuan: '', jd: '',
  });
  const updateRecon = (k: keyof typeof reconForm, v: string) =>
    setReconForm(f => ({ ...f, [k]: v }));
  const { cardBalance, cashBalance, dineIn, meituan, flashSale, tuan, jd } = reconForm;

  const initReconValues = useRef({ card: '', cash: '', dine: '', mt: '', fs: '', jd: '', tuan: '' });
  const reconJustLoaded = useRef(false);
  const reconLoadId = useRef(0);  // guard against stale async responses
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Load reconciliation data from backend
  // Rule:
  //   1. Exact match on bill_date → show that record's values
  //   2. No match + recDate >= last bill_date → fill with last record's values
  //   3. No match + recDate < last bill_date → leave empty
  useEffect(() => {
    (async () => {
      const id = ++reconLoadId.current;
      try {
        const data = await api.getReconciliations(365);
        if (id !== reconLoadId.current) return; // stale
        if (!data || data.length === 0) {
          updateRecon('cardBalance', ''); updateRecon('cashBalance', '');
          updateRecon('dineIn', ''); updateRecon('meituan', '');
          updateRecon('flashSale', ''); updateRecon('tuan', ''); updateRecon('jd', '');
          reconJustLoaded.current = true;
          return;
        }
        const last = data[0]; // most recent record
        const match = data.find((r: any) => r.bill_date === recDate.value);
        if (match) {
          updateRecon('cardBalance', toDec2(match.card_balance));
          updateRecon('cashBalance', toDec2(match.cash_balance));
          updateRecon('dineIn', toDec2(match.dine_in));
          updateRecon('meituan', toDec2(match.meituan));
          updateRecon('flashSale', toDec2(match.flash_sale));
          updateRecon('tuan', toDec2(match.tuan));
          updateRecon('jd', toDec2(match.jd));
        } else if (recDate.value >= (last.bill_date || '')) {
          updateRecon('cardBalance', toDec2(last.card_balance));
          updateRecon('cashBalance', toDec2(last.cash_balance));
          updateRecon('dineIn', toDec2(last.dine_in));
          updateRecon('meituan', toDec2(last.meituan));
          updateRecon('flashSale', toDec2(last.flash_sale));
          updateRecon('tuan', toDec2(last.tuan));
          updateRecon('jd', toDec2(last.jd));
        } else {
          updateRecon('cardBalance', ''); updateRecon('cashBalance', '');
          updateRecon('dineIn', ''); updateRecon('meituan', '');
          updateRecon('flashSale', ''); updateRecon('tuan', ''); updateRecon('jd', '');
        }
        reconJustLoaded.current = true;
      } catch { showToast(t('toastLoadFailed')); }
    })();
  }, [recDate.value]);

  // Capture initial values after data load settles
  useEffect(() => {
    if (reconJustLoaded.current) {
      reconJustLoaded.current = false;
      initReconValues.current = { card: cardBalance, cash: cashBalance, dine: dineIn, mt: meituan, fs: flashSale, jd, tuan };
      forceUpdate();
    }
  }, [cardBalance, cashBalance, dineIn, meituan, flashSale, jd, tuan]);

  const submitRecon = useCallback(async () => {
    if (sd.ready && sd.isFuture(recDate.value)) { showToast(t('errDateFuture')); return; }
    setReconSaving(true);
    try {
      const username = getCurrentUser();
      const latestSummary = await api.getBusinessSummary();
      const latestCashOnHand = latestSummary?.cash_on_hand || 0;
      const latestCashOnHandCents = toCents(latestCashOnHand);
      const latestDiff = (realTotalCents - latestCashOnHandCents) / 100;
      setBusinessSummary(latestSummary || {});
      await api.createReconciliation({
        bill_date: recDate.value,
        card_balance: toNum(cardBalance),
        cash_balance: toNum(cashBalance),
        dine_in: toNum(dineIn),
        meituan: toNum(meituan),
        flash_sale: toNum(flashSale),
        jd: toNum(jd),
        tuan: toNum(tuan),
        cash_on_hand: latestCashOnHand,
        diff: latestDiff,
        reconciled_by: username,
      });
      setShowReconConfirm(false);
      onReconHistory?.();
    } catch { showToast(t('toastSubmitFailed')); }
    finally { setReconSaving(false); }
  }, [recDate.value, cardBalance, cashBalance, dineIn, meituan, flashSale, tuan, jd, onReconHistory]);

  // 检查对账当月手续费是否在今天更新过
  const checkFeeToday = async (): Promise<boolean> => {
    try {
      const all = await api.getPlatformFees();
      const allArr = Array.isArray(all) ? all : [];
      const [ry, rm] = (recDate.value || '').split('-').map(Number);
      const match = allArr.find((f: any) => f.year === ry && f.month === rm);
      if (!match?.updated_at) return false;
      const updatedDay = String(match.updated_at).split(' ')[0].split('T')[0];
      return updatedDay === sd.today;
    } catch { return true; } // 网络失败不拦
  };

  const handleReconPress = async () => {
    if (!hasReconChanges) return;
    const feeToday = await checkFeeToday();
    if (feeToday) {
      setShowReconConfirm(true);
    } else {
      setShowFeeReminder(true);
    }
  };

  const toCents = (v: any) => Math.round((parseFloat(String(v ?? '0')) || 0) * 100);
  // Precise arithmetic: convert to cents (integer), compute, convert back
  // Avoids IEEE 754 float issues (e.g., 0.1 + 0.2 !== 0.3)
  const channelTotalCents = toCents(dineIn) + toCents(meituan) + toCents(flashSale) + toCents(tuan) + toCents(jd);
  const channelTotal = channelTotalCents / 100;
  const realTotalCents = toCents(cardBalance) + toCents(cashBalance) + channelTotalCents;
  const cashOnHandCents = toCents((businessSummary && businessSummary.cash_on_hand) || 0);
  const realTotal = realTotalCents / 100;
  const diff = (realTotalCents - cashOnHandCents) / 100;

  const hasReconChanges =
    toNum(cardBalance) !== toNum(initReconValues.current.card) ||
    toNum(cashBalance) !== toNum(initReconValues.current.cash) ||
    toNum(dineIn) !== toNum(initReconValues.current.dine) ||
    toNum(meituan) !== toNum(initReconValues.current.mt) ||
    toNum(flashSale) !== toNum(initReconValues.current.fs) ||
    toNum(jd) !== toNum(initReconValues.current.jd) ||
    toNum(tuan) !== toNum(initReconValues.current.tuan);

  /* ── 模块二：平台手续费 ── */
  const thisYear = sd.year || new Date().getFullYear();
  const thisMonth = sd.month || new Date().getMonth() + 1;

  // Generate full month list 2024-05 → current (not limited to DB data)
  const feeMonthList = useMemo(() => {
    const list: { year: number; month: number }[] = [];
    let y = 2024, m = 5;
    while (y < thisYear || (y === thisYear && m <= thisMonth)) {
      list.push({ year: y, month: m });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return list.reverse(); // newest first
  }, [thisYear, thisMonth]);

  const [feeData, setFeeData] = useState<any>(null);        // current month
  const [allFees, setAllFees] = useState<any[]>([]);         // all months for detail
  const [feeMonth, setFeeMonth] = useState<'all' | { year: number; month: number }>('all');
  const feeMonthInited = useRef(false);
  useEffect(() => { if (sd.ready && !feeMonthInited.current) { feeMonthInited.current = true; setFeeMonth({ year: sd.year, month: sd.month }); } }, [sd.ready, sd.year, sd.month]);
  const [showFeeSheet, setShowFeeSheet] = useState(false);
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const cap = -Dimensions.get('window').height * 0.28;
  const expenseCapAmount = -Dimensions.get('window').height * 0.12;
  const expenseCapNote   = -Dimensions.get('window').height * 0.24;
  const activeTabSV = useSharedValue(0);
  useEffect(() => { activeTabSV.value = activeTab; }, [activeTab]);
  const pushCapSV = useSharedValue(expenseCapAmount); // default: amount cap, animated for smooth field switching
  const contentStyle = useAnimatedStyle(() => {
    if (activeTabSV.value !== 1) return { transform: [{ translateY: Math.max(keyboardHeight.value, cap) }] };
    return { transform: [{ translateY: Math.max(keyboardHeight.value, pushCapSV.value) }] };
  });
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardHeight.value }],
  }));
  const closeFeeSheet = () => { Keyboard.dismiss(); setTimeout(() => setShowFeeSheet(false), 50); };
  const [showFeeHistory, setShowFeeHistory] = useState(false);
  const [feeHistoryFilter, setFeeHistoryFilter] = useState<'all' | { year: number; month: number }>('all');
  const feeDate = useDateField({ sd, initial: '' });
  // Default to today's date once server date is ready
  useEffect(() => { if (sd.ready && sd.today) feeDate.setValue(sd.today); }, [sd.ready]);
  const [feeForm, setFeeForm] = useState({ feeMc: '', feeMw: '', feeEw: '', feeMt: '' });
  const updateFee = (k: keyof typeof feeForm, v: string) => setFeeForm(f => ({ ...f, [k]: v }));
  const { feeMc, feeMw, feeEw, feeMt } = feeForm;
  const [savingFee, setSavingFee] = useState(false);
  const [negativeMode, setNegativeMode] = useState(false);
  const feeLoadId = useRef(0);  // guard against stale async responses

  const loadFeeData = async () => {
    const id = ++feeLoadId.current;
    try {
      const all = await api.getPlatformFees();
      if (id !== feeLoadId.current) return; // stale
      const allArr = Array.isArray(all) ? all : [];
      setAllFees(allArr);
      // Derive feeData from feeMonth
      if (feeMonth !== 'all') {
        const match = allArr.find((f: any) => f.year === feeMonth.year && f.month === feeMonth.month);
        setFeeData(match || null);
      } else {
        setFeeData(null);
      }
    } catch { showToast(t('toastLoadFailed')); }
  };
  useEffect(() => { loadFeeData(); }, [feeMonth]);

  const handleAddFee = async () => {
    if (feeMonth === 'all') return;
    if (sd.isFuture(feeDate.value)) { showToast(t('errDateFuture')); return; }
    const factor = negativeMode ? -1 : 1;
    const mc = toNum(feeMc) * factor, mw = toNum(feeMw) * factor, ew = toNum(feeEw) * factor, mt = toNum(feeMt) * factor;
    if (mc + mw + ew + mt === 0) { showToast(t('atLeastOneFee')); return; }
    setSavingFee(true);
    try {
      const r = await api.addPlatformFeeEntry({
        year: feeMonth.year, month: feeMonth.month,
        entry_date: feeDate.value,
        meituan_cashier: mc, meituan_waimai: mw,
        shangou_waimai: ew, meituan_tuan: mt,
      });
      if (r?.status === 'ok') {
        setFeeData(r?.data);
        setFeeForm({ feeMc: '', feeMw: '', feeEw: '', feeMt: '' });
        setNegativeMode(false);
        closeFeeSheet();
        // Reload all months to keep totals accurate
        api.getPlatformFees().then((all: any) => setAllFees(Array.isArray(all) ? all : [])).catch(() => {});
      } else {
        showToast(r?.message || t('toastSubmitFailed'));
      }
    } catch { showToast(t('toastSubmitFailed')); }
    setSavingFee(false);
  };

  /* ── 模块三：支出 ── */
  const {
    expDate, setExpDate,
    expDateErr, setExpDateErr,
    expAmount, setExpAmount,
    expCategory, setExpCategory,
    payMethod, setPayMethod,
    expNote, setExpNote,
    expImages,
    uploadingImg,
    loadingExp,
    isRefund, setIsRefund,
    handleAddExpense,
    handleImageSelect,
    removeImage,
    isAmountInvalid,
  } = useExpenseForm({
    onExpenseHistory,
    onExpenseAdded: loadBusinessSummary,
    getPreviewUrl,
    revokePreviewUrl,
    clearUrlCache,
    onToast: showToast,
  });

  // Fast glass-card totals from business-summary API (matching web)
  const glassCatTotals = useMemo(() => ({
    daily: (businessSummary as any)?.expense_by_category?.daily ?? 0,
    rent: (businessSummary as any)?.expense_by_category?.rent ?? 0,
    salary: (businessSummary as any)?.expense_by_category?.salary ?? 0,
    goods: (businessSummary as any)?.expense_by_category?.goods ?? 0,
  }), [(businessSummary as any)?.expense_by_category]);

  // Image upload handlers
  const [showRecDatePicker, setShowRecDatePicker] = useState(false);
  const [showExpDatePicker, setShowExpDatePicker] = useState(false);
  const [showFeeDatePicker, setShowFeeDatePicker] = useState(false);

  /* ── 卡片摘要数据 ── */
  const feeTotal = feeMonth === 'all'
    ? allFees.reduce((sum: number, f: any) => sum + (f.meituan_cashier || 0) + (f.meituan_waimai || 0) + (f.shangou_waimai || 0) + (f.meituan_tuan || 0), 0)
    : feeData
    ? ((feeData.meituan_cashier || 0) + (feeData.meituan_waimai || 0) + (feeData.shangou_waimai || 0) + (feeData.meituan_tuan || 0))
    : 0;
  const lang = getLang();
  const uid = getCurrentUserId();
  const storedOpacity = (() => {
    try {
      const key = uid ? `bg-opacity-${uid}` : 'bg-opacity';
      const v = localStorage.getItem(key);
      if (v !== null) return parseFloat(v);
    } catch {}
    return 0.5;
  })();
  const activeAlpha = storedOpacity === 1 ? 0.30 : 0.48;
  const tabCards = useMemo(() => [
    // 对账 — diff between book balance and current balance
    { gradient: [withAlpha(colors.expenseGradientStart, 0.22), withAlpha(colors.expenseGradientEnd, 0.22)], gradientActive: [withAlpha(colors.expenseGradientStart, activeAlpha), withAlpha(colors.expenseGradientEnd, activeAlpha)], title: t('tabRecon'), stat: diff, statFmt: fmt(diff), statColor: diff >= 0 ? colors.success : colors.danger, prefix: diff >= 0 ? '+' : '' },
    // 支出 — cumulative expense from backend (matching web)
    { gradient: [withAlpha(colors.expenseGradientStart, 0.22), withAlpha(colors.expenseGradientEnd, 0.22)], gradientActive: [withAlpha(colors.expenseGradientStart, activeAlpha), withAlpha(colors.expenseGradientEnd, activeAlpha)], title: t('tabExpense'), stat: (businessSummary && businessSummary.cumulative_expense) || 0, statFmt: fmt((businessSummary && businessSummary.cumulative_expense) || 0), statColor: colors.textMain, prefix: '' },
  ], [diff, businessSummary, colors, lang, activeAlpha]);

  const st = useMemo(() => getSt(colors), [colors]);

  /* ── Render ── */
  return (
    <>
    <ReAnimated.View style={[{ flex: 1 }, contentStyle]}>
      <View style={st.root}>
      {/* ══════ 卡片式Tab ══════ */}
      <View style={st.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          testID="snap-scroll"
          ref={scrollRef}
          pagingEnabled={false}
          snapToOffsets={[0, Dimensions.get('window').width - 36]}
          snapToStart={false}
          snapToEnd={false}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => {
            const offset = e.nativeEvent.contentOffset.x;
            const w = Dimensions.get('window').width;
            const idx = offset < (w - 36) / 2 ? 0 : 1;
            if (idx >= 0 && idx < tabCards.length) setActiveTab(idx);
          }}
          contentContainerStyle={st.tabScroll}>
          {tabCards.map((tab, i) => {
            const active = activeTab === i;
            const bgGrad = active ? tab.gradientActive : tab.gradient;
            return (
              <TouchableOpacity
                key={i}
                testID="snap-card"
                style={[st.tabCard, active && st.tabCardActive,
                  i === 0 && { marginRight: 14 },
                  i === 1 && { width: Dimensions.get('window').width - 36 },
                ]}
                onPress={() => setActiveTab(i)}
                activeOpacity={0.7}
              >
                {/* Web uses ONLY a CSS linear-gradient for the tab card
                    background — NO backdrop-filter. Re-creating with
                    <LinearGradient> absolute-filled behind the content
                    (RN's <View> can't render CSS gradient strings). */}
                <LinearGradient
                  colors={bgGrad as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
                <View style={st.tabInner}>
                  <Text style={[st.tabTitle, active && st.tabTitleActive]}>
                    {tab.title}
                    {i === 1 && (
                      <Text style={{ color: colors.expenseAmountColor }}>
                        {' ¥' + toDec2Comma((businessSummary && businessSummary.cumulative_expense) || 0)}
                      </Text>
                    )}
                  </Text>
                  {i === 0 && (
                    <View style={{ flex: 1, justifyContent: 'space-between' }}>
                      {/* Hero: 账面差额 (big amount, expenseAmountColor) */}
                      <View style={{ alignItems: 'flex-start', gap: 2, marginTop: 16 }}>
                        <Text style={st.cardFieldLabel}>{t('bookDiff')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                          <Text style={{ fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: colors.expenseAmountColor }}>
                            {diff >= 0 ? '+' : '-'}¥
                          </Text>
                          <Text style={{ fontSize: FONTS.h1.size + 4, fontWeight: FONTS.h1.weight, color: colors.expenseAmountColor }}>
                            {toDec2Comma(Math.abs(diff))}
                          </Text>
                        </View>
                      </View>
                      {/* Sub-cards row: 账面余额 | 当前结余 (success / info tinted) */}
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={[st.subCard, { backgroundColor: withAlpha(colors.success, 0.15), borderColor: withAlpha(colors.success, 0.30) }]}>
                          <Text style={st.cardFieldLabel}>{t('bookBalance')}</Text>
                          <Text style={[st.cardFieldVal, { fontSize: FONTS.body.size }]}>{'¥' + toDec2Comma((businessSummary && businessSummary.cash_on_hand) || 0)}</Text>
                        </View>
                        <View style={[st.subCard, { backgroundColor: withAlpha(colors.info, 0.15), borderColor: withAlpha(colors.info, 0.30) }]}>
                          <Text style={st.cardFieldLabel}>{t('currentBalance')}</Text>
                          <Text style={[st.cardFieldVal, { fontSize: FONTS.body.size }]}>{'¥' + toDec2Comma(realTotal)}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  {i === 1 && (
                    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                      {/* Row 1: 日常 | 采购 (gradient start/end tinted sub-cards) */}
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={[st.expenseSubCard, { backgroundColor: withAlpha(colors.expenseGradientStart, 0.22), borderColor: withAlpha(colors.expenseGradientStart, 0.35) }]}>
                          <Text style={st.cardFieldLabel}>{t('daily')}</Text>
                          <Text style={[st.cardFieldVal, { fontSize: FONTS.body.size }]}>{'¥' + toDec2Comma(glassCatTotals.daily)}</Text>
                        </View>
                        <View style={[st.expenseSubCard, { backgroundColor: withAlpha(colors.expenseGradientEnd, 0.22), borderColor: withAlpha(colors.expenseGradientEnd, 0.35) }]}>
                          <Text style={st.cardFieldLabel}>{t('goods')}</Text>
                          <Text style={[st.cardFieldVal, { fontSize: FONTS.body.size }]}>{'¥' + toDec2Comma(glassCatTotals.goods)}</Text>
                        </View>
                      </View>
                      {/* Row 2: 房租 | 薪资 */}
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <View style={[st.expenseSubCard, { backgroundColor: withAlpha(colors.expenseGradientStart, 0.22), borderColor: withAlpha(colors.expenseGradientStart, 0.35) }]}>
                          <Text style={st.cardFieldLabel}>{t('rent')}</Text>
                          <Text style={[st.cardFieldVal, { fontSize: FONTS.body.size }]}>{'¥' + toDec2Comma(glassCatTotals.rent)}</Text>
                        </View>
                        <View style={[st.expenseSubCard, { backgroundColor: withAlpha(colors.expenseGradientEnd, 0.22), borderColor: withAlpha(colors.expenseGradientEnd, 0.35) }]}>
                          <Text style={st.cardFieldLabel}>{t('salary')}</Text>
                          <Text style={[st.cardFieldVal, { fontSize: FONTS.body.size }]}>{'¥' + toDec2Comma(glassCatTotals.salary)}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ══════ 内容区（FadeIn 切换） ══════ */}
      <ScrollView style={st.contentScroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={st.contentInner}>

        {/* ── 模块一：每日对账 ── */}
        {activeTab === 0 && (
        <FadeInView style={st.moduleWrap}>
          {/* Platform fees card */}
          <View style={[st.card]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Text style={{ fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: colors.textMain }}>{t('platformFee')}</Text>
                <MonthPicker selected={feeMonth} onSelect={(v) => setFeeMonth(v)} months={feeMonthList} colors={colors} />
              </View>
              {(feeMonth !== 'all' || allFees.length > 0) && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                onPress={() => {
                  if (feeMonth === 'all') {
                    setShowFeeHistory(true); setFeeHistoryFilter('all');
                  } else {
                    setFeeForm({ feeMc: '', feeMw: '', feeEw: '', feeMt: '' });
                    setNegativeMode(false);
                    feeDate.setError(0); loadFeeData(); setShowFeeSheet(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: FONTS.subBold.size, color: colors.primary, fontWeight: FONTS.subBold.weight }}>
                  {feeMonth === 'all' ? t('feeViewDetail') : t('feeDetail')}
                </Text>
                <Text style={{ fontSize: FONTS.body.size, color: colors.primary, fontWeight: FONTS.h2.weight }}>→</Text>
              </TouchableOpacity>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 }}>
              <Text style={{ fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: colors.primary, marginRight: 6 }}>¥</Text>
              <Text style={{ fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: colors.textMain }}>
                {feeTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {([
                { k: 'meituanCashier', v: feeMonth === 'all' ? allFees.reduce((s: number, f: any) => s + (f.meituan_cashier || 0), 0) : (feeData?.meituan_cashier || 0), color: colors.info },
                { k: 'meituanWaimai', v: feeMonth === 'all' ? allFees.reduce((s: number, f: any) => s + (f.meituan_waimai || 0), 0) : (feeData?.meituan_waimai || 0), color: colors.warning },
                { k: 'shangouWaimai', v: feeMonth === 'all' ? allFees.reduce((s: number, f: any) => s + (f.shangou_waimai || 0), 0) : (feeData?.shangou_waimai || 0), color: colors.info },
                { k: 'meituanTuan', v: feeMonth === 'all' ? allFees.reduce((s: number, f: any) => s + (f.meituan_tuan || 0), 0) : (feeData?.meituan_tuan || 0), color: colors.success },
              ] as const).map((p) => (
                <View key={p.k} style={{ flex: 1, minWidth: '45%', backgroundColor: colors.bg, borderRadius: 10, padding: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.color }} />
                    <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight }}>{t(p.k)}</Text>
                  </View>
                  <Text style={{ fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: colors.textMain }}>
                    ¥{p.v.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          {/* ── 日记账 ── */}
          <View style={[st.card, { marginTop: 16 }]}>
            {/* 日期行 */}
            <View style={st.dateRow}>
              <Text style={{ fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub }}>{t('billDate')}</Text>
              <TouchableOpacity
                onPress={() => setShowRecDatePicker(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, position: 'relative' }}
                activeOpacity={0.7}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={1.5}>
                  <Rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <Line x1="16" y1="2" x2="16" y2="6"/>
                  <Line x1="8" y1="2" x2="8" y2="6"/>
                  <Line x1="3" y1="10" x2="21" y2="10"/>
                </Svg>
                <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.primary }}>
                  {(() => {
                    const l = getLang();
                    const [y, m, d] = recDate.value.split('-');
                    if (l.startsWith('en')) {
                      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                      return `${months[+m-1]} ${+d}, ${y}`;
                    }
                    if (l === 'zh-Hant' || l === 'zh-TW') {
                      return `${y}年${m}月${d}日`;
                    }
                    return `${y}年${m}月${d}日`;
                  })()}
                </Text>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M8 5l8 7-8 7"/></Svg>
              </TouchableOpacity>
            </View>
            <DateErrorHint trigger={recDate.error} message={t('errDateFuture')} color={colors.danger} />

            <View style={st.row2}>
              <View style={st.inputGroup}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ translateY: -1 }] }}><Rect x="2" y="4" width="20" height="16" rx="2"/><Path d="M2 10h20"/><Rect x="5" y="14" width="3" height="2" rx="0.5"/></Svg><Text style={st.inputLabel}>{t('cardBalance')}</Text></View>
                <InputWithFocus inputStyle={st.input}
                  value={cardBalance} onChangeText={(v: string) => updateRecon('cardBalance',blockNeg(v))}
                  onBlur={() => { if (cardBalance !== '') updateRecon('cardBalance',toDec2(cardBalance)); }}
                  keyboardType="decimal-pad"
                  placeholder="0.00" placeholderTextColor={colors.textSub} />
              </View>
              <View style={st.inputGroup}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ translateY: -1 }] }}><Rect x="2" y="5" width="20" height="14" rx="2"/><Circle cx="12" cy="12" r="2.5"/><Path d="M18.5 9l-1 0M18.5 15l-1 0M5.5 9l1 0M5.5 15l1 0"/></Svg><Text style={st.inputLabel}>{t('cashBalance')}</Text></View>
                <InputWithFocus inputStyle={st.input}
                  value={cashBalance} onChangeText={(v: string) => updateRecon('cashBalance',blockNeg(v))}
                  onBlur={() => { if (cashBalance !== '') updateRecon('cashBalance',toDec2(cashBalance)); }}
                  keyboardType="decimal-pad"
                  placeholder="0.00" placeholderTextColor={colors.textSub} />
              </View>
            </View>

            {/* 在途资金 */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub }}>{t('fundsInTransit')}</Text>
              <NumberTickerExt value={channelTotal} formatFn={fmtAmtFull} style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.primary }} />
            </View>
            <View style={st.channelGrid}>
              {/* Row 1: 堂食 + 美团 + 闪购 */}
              <View style={{ flexDirection: 'row', width: '100%', gap: 8 }}>
                <TouchableOpacity style={[st.channelChip, { flex: 1 }]} activeOpacity={1}>
                  <Text style={st.chipLabel}>{t('dineIn')}</Text>
                  <InputWithFocus inputStyle={st.chipInput}
                    value={dineIn} onChangeText={(v: string) => updateRecon('dineIn',blockNeg(v))}
                    onBlur={() => { if (dineIn !== '') updateRecon('dineIn',toDec2(dineIn)); }}
                    keyboardType="decimal-pad"
                    placeholder="0.00" placeholderTextColor={colors.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={[st.channelChip, { flex: 1 }]} activeOpacity={1}>
                  <Text style={st.chipLabel}>{t('meituan')}</Text>
                  <InputWithFocus inputStyle={st.chipInput}
                    value={meituan} onChangeText={(v: string) => updateRecon('meituan',blockNeg(v))}
                    onBlur={() => { if (meituan !== '') updateRecon('meituan',toDec2(meituan)); }}
                    keyboardType="decimal-pad"
                    placeholder="0.00" placeholderTextColor={colors.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={[st.channelChip, { flex: 1 }]} activeOpacity={1}>
                  <Text style={st.chipLabel}>{t('flashSale')}</Text>
                  <InputWithFocus inputStyle={st.chipInput}
                    value={flashSale} onChangeText={(v: string) => updateRecon('flashSale',blockNeg(v))}
                    onBlur={() => { if (flashSale !== '') updateRecon('flashSale',toDec2(flashSale)); }}
                    keyboardType="decimal-pad"
                    placeholder="0.00" placeholderTextColor={colors.textSub} />
                </TouchableOpacity>
              </View>
              {/* Row 2: 京东 + 团购 */}
              <View style={{ flexDirection: 'row', width: '100%', gap: 8 }}>
                <TouchableOpacity style={[st.channelChip, { flex: 1 }]} activeOpacity={1}>
                  <Text style={st.chipLabel}>{t('jd')}</Text>
                  <InputWithFocus inputStyle={st.chipInput}
                    value={jd} onChangeText={(v: string) => updateRecon('jd',blockNeg(v))}
                    onBlur={() => { if (jd !== '') updateRecon('jd',toDec2(jd)); }}
                    keyboardType="decimal-pad"
                    placeholder="0.00" placeholderTextColor={colors.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={[st.channelChip, { flex: 1 }]} activeOpacity={1}>
                  <Text style={st.chipLabel}>{t('tuan')}</Text>
                  <InputWithFocus inputStyle={st.chipInput}
                    value={tuan} onChangeText={(v: string) => updateRecon('tuan',blockNeg(v))}
                    onBlur={() => { if (tuan !== '') updateRecon('tuan',toDec2(tuan)); }}
                    keyboardType="decimal-pad"
                    placeholder="0.00" placeholderTextColor={colors.textSub} />
                </TouchableOpacity>
              </View>
            </View>

            {/* 按钮行：对账记录(左) + 添加(右) */}
            <ButtonPair
              leftLabel={t('reconHistory')}
              leftOnPress={onReconHistory}
              rightLabel={t('reconComplete')}
              rightOnPress={handleReconPress}
              rightDisabled={!hasReconChanges}
            />
          </View>
        </FadeInView>
        )}

        {/* ── 模块二：支出明细 ── */}
        {activeTab === 1 && (
        <FadeInView style={st.moduleWrap}>
          <View style={st.card}>
            {/* 录入台 */}
            <View style={st.expForm}>
              {/* 大金额输入 */}
              <View style={st.bigAmtWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 6 }}>
                  <Text style={st.bigAmtLabel}>{isRefund ? t('refundAmount') : t('amountLabel')}</Text>
                  <TouchableOpacity
                    onPress={() => { setIsRefund(!isRefund); if (!isRefund) setExpAmount(''); }}
                    activeOpacity={0.7}
                    style={{
                      padding: 2, borderRadius: 4, marginTop: -7,
                      backgroundColor: isRefund ? withAlpha(colors.danger, 0.1) : withAlpha(colors.textMain, 0.06),
                    }}
                  >
                    <Svg width={18} height={18} viewBox="0 0 1024 1024">
                      <Path d="M941 512c0 229.2-185.8 415-415 415S111 741.2 111 512 296.8 97 526 97c22.9 0 41.5 18.6 41.5 41.5S548.9 180 526 180c-183.4 0-332 148.6-332 332s148.6 332 332 332 332-148.6 332-332c0-22.9 18.6-41.5 41.5-41.5S941 489.1 941 512z m-356.3-83.2h65.8c22.9 0 41.5 18.6 41.5 41.5s-18.6 41.5-41.5 41.5h-83v41.5h83c22.9 0 41.5 18.6 41.5 41.5s-18.6 41.5-41.5 41.5h-83v83c0 22.9-18.6 41.5-41.5 41.5s-41.5-18.6-41.5-41.5v-83h-83c-22.9 0-41.5-18.6-41.5-41.5s18.6-41.5 41.5-41.5h83v-41.5h-83c-22.9 0-41.5-18.6-41.5-41.5s18.6-41.5 41.5-41.5h65.8L396.5 358c-16.2-16.2-16.2-42.5 0-58.7s42.5-16.2 58.7 0l70.8 70.8 70.8-70.8c16.2-16.2 42.5-16.2 58.7 0 16.2 16.2 16.2 42.5 0 58.7l-70.8 70.8z" fill={isRefund ? colors.danger : colors.textSub} />
                      <Path d="M853.4 243.7l-88 88c-16.2 16.2-42.5 16.2-58.7 0s-16.2-42.5 0-58.7l88-88-88-88h234.8v234.8l-88.1-88.1z" fill={isRefund ? colors.danger : colors.textSub} />
                    </Svg>
                  </TouchableOpacity>
                </View>
                <View style={[st.bigAmtRow, isRefund && { borderColor: withAlpha(colors.danger, 0.3) }]}>
                  {isRefund ? (
                    <Text style={[st.bigAmtSymbol, { color: colors.danger }]}>+</Text>
                  ) : (
                    <Text style={st.bigAmtSymbol}>-</Text>
                  )}
                  <Text style={st.bigAmtSymbol}>¥</Text>
                  <AppTextInput style={st.bigAmtInput}
                    onFocus={() => { pushCapSV.value = withTiming(expenseCapAmount, { duration: 200 }); }}
                    value={expAmount} onChangeText={(v: string) => setExpAmount(fmtRefundInput(v, isRefund))}
                    onBlur={() => { if (expAmount !== '') setExpAmount(toDec2Comma(expAmount)); }}
                    keyboardType="decimal-pad" placeholder="0.00"
                    placeholderTextColor={colors.textSub}
                    autoFocus={false} />
                </View>
                <View style={st.amtCursor} />
              </View>
              {/* 分类胶囊 */}
              <CategoryChips selected={expCategory} onSelect={setExpCategory} />
              {/* 支付方式 */}
              <PaymentMethodChips selected={payMethod} onSelect={setPayMethod} />
              {/* 支出说明 */}
              <ExpenseNoteInput value={expNote} onChangeText={setExpNote} onFocus={() => { pushCapSV.value = withTiming(expenseCapNote, { duration: 200 }); }} />
              {/* 凭证上传 */}
              <ReceiptUpload
                newFiles={expImages}
                onAdd={handleImageSelect}
                onRemoveNew={removeImage}
                getPreviewUrl={getPreviewUrl}
                maxThumbSize={120}
              />
              {/* 日期选择 */}
              <View style={st.expDateRow}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={1.5}>
                  <Rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <Line x1="16" y1="2" x2="16" y2="6"/>
                  <Line x1="8" y1="2" x2="8" y2="6"/>
                  <Line x1="3" y1="10" x2="21" y2="10"/>
                </Svg>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    onPress={() => setShowExpDatePicker(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.primary }}>
                      {(() => {
                        const l = getLang();
                        const [y, m, d] = expDate.split('-');
                        if (l.startsWith('en')) {
                          const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                          return `${months[+m-1]} ${+d}, ${y}`;
                        }
                        return `${y}年${m}月${d}日`;
                      })()}
                    </Text>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M8 5l8 7-8 7"/></Svg>
                  </TouchableOpacity>
                  <DateErrorHint trigger={expDateErr} message={t('errDateFuture')} color={colors.danger} textAlign="left" />
                </View>
              </View>
              {/* 按钮行 */}
              <ButtonPair
                leftLabel={t('expenseHistory')}
                leftOnPress={() => onExpenseHistory?.()}
                rightLabel={t('confirmRecord')}
                rightOnPress={handleAddExpense}
                rightDisabled={isAmountInvalid}
                rightLoading={loadingExp}
              />
            </View>
          </View>
        </FadeInView>
        )}
      </ScrollView>

      {/* 添加提示弹窗 */}
      <ModalOverlay visible={showReconConfirm} onClose={hideReconConfirm} animation="springScale">
          <View style={st.modalCard} onStartShouldSetResponder={() => true}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{t('friendlyReminder')}</Text>
              <CloseButton onPress={hideReconConfirm} />
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              <Text style={{ fontSize: FONTS.sub.size, color: colors.textSub, textAlign: 'center' }}>
                {t('jokeRecon')}
              </Text>
              <ButtonPair
                leftLabel={t('cancel')}
                leftOnPress={hideReconConfirm}
                leftDisabled={reconSaving}
                rightLabel={t('confirm')}
                rightOnPress={submitRecon}
                rightLoading={reconSaving}
              />
            </View>
          </View>
        </ModalOverlay>

      {/* 手续费未更新提示弹窗 */}
        <ModalOverlay visible={showFeeReminder} onClose={() => setShowFeeReminder(false)} animation="springScale">
          <View style={st.modalCard} onStartShouldSetResponder={() => true}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{t('friendlyReminder')}</Text>
              <CloseButton onPress={() => setShowFeeReminder(false)} />
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              <Text style={{ fontSize: FONTS.sub.size, color: colors.textSub, textAlign: 'center' }}>
                {t('feeNotUpdated')}
              </Text>
              <ButtonPair
                leftLabel={t('reconLater')}
                leftOnPress={() => setShowFeeReminder(false)}
                rightLabel={t('enterFeeFirst')}
                rightOnPress={() => { setShowFeeReminder(false); setShowFeeSheet(true); }}
              />
            </View>
          </View>
        </ModalOverlay>

      {ToastHost}



      {/* Rec date picker */}
      <DatePickerModal
        visible={showRecDatePicker}
        value={recDate.value}
        onClose={() => setShowRecDatePicker(false)}
        onSelect={(d) => { recDate.setValue(d); recDate.setError(0); }}
        minDate={sd.today}
        title={t('billDate')}
      />
      {/* Exp date picker */}
      <DatePickerModal
        visible={showExpDatePicker}
        value={expDate}
        onClose={() => setShowExpDatePicker(false)}
        onSelect={(d) => { if (d <= sd.today) { setExpDate(d); setExpDateErr(0); } else { setExpDateErr(c => c + 1); } }}
        minDate={undefined}
        title={t('billDate')}
      />
      {/* Fee date picker */}
      <DatePickerModal
        visible={showFeeDatePicker}
        value={feeDate.value}
        onClose={() => setShowFeeDatePicker(false)}
        onSelect={(d) => { if (d <= sd.today) { feeDate.setValue(d); feeDate.setError(0); } else { feeDate.setError(Date.now()); } }}
        minDate={undefined}
        title={t('entryDate')}
      />
      </View>
      {/* Fee entry bottom sheet */}
      <ModalOverlay visible={showFeeSheet} onClose={closeFeeSheet} animation="slideUpScale"
          overlayStyle={bottomSheetOverlay as any}
          contentStyle={{ alignItems: 'stretch' } as any}>
          <ReAnimated.View style={sheetStyle}>
          <View style={[st.feeSheet, { width: '100%', maxWidth: 768, alignSelf: 'center' }]}>
            {/* Sheet header: handle on top, title + close button row below */}
            <View style={{ backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 20 }}>
              <View style={{ width: 36, height: 4, backgroundColor: SHEET_HANDLE_COLOR, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={st.modalTitle}>{t('addFeeEntry')}</Text>
                <TouchableOpacity style={{ padding: 4 }} onPress={closeFeeSheet}>
                  <Svg width="18" height="18" viewBox="0 0 24 24" stroke={colors.surface} strokeWidth="2" fill="none">
                    <Line x1="18" y1="6" x2="6" y2="18" />
                    <Line x1="6" y1="6" x2="18" y2="18" />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}>
              {/* Date + Negative toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Text style={{ fontSize: FONTS.sub.size, color: colors.textSub, fontWeight: FONTS.sub.weight }}>{t('entryDate')}</Text>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => setShowFeeDatePicker(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }} activeOpacity={0.7}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><Line x1="16" y1="2" x2="16" y2="6" /><Line x1="8" y1="2" x2="8" y2="6" /><Line x1="3" y1="10" x2="21" y2="10" />
                    </Svg>
                    <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.primary }}>
                      {fmtLocalDate(feeDate.value)}
                    </Text>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M8 5l8 7-8 7" />
                    </Svg>
                  </TouchableOpacity>
                  <DateErrorHint trigger={feeDate.error} message={t('errDateFuture')} color={colors.danger} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 10, color: colors.danger }}>负数</Text>
                  <Switch value={negativeMode} onValueChange={setNegativeMode}
                    trackColor={{ false: colors.secondary, true: withAlpha(colors.danger, 0.4) }}
                    thumbColor={negativeMode ? colors.danger : colors.surface}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>
              </View>

              {/* Column headers */}
              <View style={{ flexDirection: 'row', marginBottom: 10, gap: 6 }}>
                <Text style={{ flex: 1, minWidth: 80, maxWidth: 180, flexShrink: 1, fontSize: FONTS.microBold.size, color: colors.textSub, fontWeight: FONTS.microBold.weight }}></Text>
                <Text style={{ width: '22%', fontSize: FONTS.microBold.size, color: colors.textSub, fontWeight: FONTS.microBold.weight, textAlign: 'left' }}>{t('feePreview')}</Text>
                <Text style={{ width: '22%', fontSize: FONTS.microBold.size, color: colors.textSub, fontWeight: FONTS.microBold.weight, textAlign: 'left' }}>{t('feeCurrent')}</Text>
                <Text style={{ width: '22%', fontSize: FONTS.microBold.size, color: colors.textSub, fontWeight: FONTS.microBold.weight, textAlign: 'right' }}>{t('feeEntry')}</Text>
              </View>

              {/* Fee rows */}
              {([
                { k: 'meituanCashier', cur: feeData?.meituan_cashier || 0, val: feeMc, set: (v: string) => updateFee('feeMc', v) },
                { k: 'meituanWaimai', cur: feeData?.meituan_waimai || 0, val: feeMw, set: (v: string) => updateFee('feeMw', v) },
                { k: 'shangouWaimai', cur: feeData?.shangou_waimai || 0, val: feeEw, set: (v: string) => updateFee('feeEw', v) },
                { k: 'meituanTuan', cur: feeData?.meituan_tuan || 0, val: feeMt, set: (v: string) => updateFee('feeMt', v) },
              ] as const).map((row) => {
                const inputNum = toNum(row.val);
                const sign = negativeMode ? -1 : 1;
                return (
                  <View key={row.k} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 6 }}>
                    <Text style={{ flex: 1, minWidth: 80, maxWidth: 180, flexShrink: 1, fontSize: FONTS.sub.size, color: colors.textSub, fontWeight: FONTS.sub.weight, marginTop: 8 }}>{t(row.k)}</Text>
                    <Text style={{ width: '22%', fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain, textAlign: 'left', marginTop: 8 }}>
                      ¥{(row.cur + inputNum * sign).toFixed(2)}
                    </Text>
                    <Text style={{ width: '22%', fontSize: FONTS.micro.size, color: colors.textSub, textAlign: 'left', marginTop: 10 }}>
                      ¥{row.cur.toFixed(2)}
                    </Text>
                    <View style={{ width: '22%', flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
                      {negativeMode && (
                        <Text style={{ position: 'absolute', left: 10, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.danger, zIndex: 1 }}>−</Text>
                      )}
                      <AppTextInput
                        style={{ width: '100%', height: 38, borderWidth: 1, borderColor: negativeMode ? colors.danger : colors.secondary, borderRadius: 8, paddingLeft: negativeMode ? 24 : 10, paddingRight: 10, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub, textAlign: 'right', backgroundColor: colors.surface } as any}
                        value={row.val} onChangeText={(v: string) => row.set(fmtDecInput(v))}
                        keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSub}
                      />
                    </View>
                  </View>
                );
              })}

              {/* Confirm */}
              <SubmitButton
                onPress={handleAddFee}
                loading={savingFee}
                disabled={toNum(feeMc) + toNum(feeMw) + toNum(feeEw) + toNum(feeMt) === 0}
                label={t('confirm')}
                style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16, opacity: (toNum(feeMc) + toNum(feeMw) + toNum(feeEw) + toNum(feeMt) === 0) ? 0.35 : 1 }}
                textStyle={{ color: colors.surface, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight }}
              />
            </View>
            </ScrollView>
          </View>
          </ReAnimated.View>
      </ModalOverlay>
      {/* Fee history bottom sheet */}
      <ModalOverlay visible={showFeeHistory} onClose={() => { setShowFeeHistory(false); setFeeHistoryFilter('all'); }} animation="slideUpScale"
          overlayStyle={bottomSheetOverlay as any}
          contentStyle={{ alignItems: 'stretch', justifyContent: 'flex-end' } as any}>
          <View style={[st.feeSheet, { height: Dimensions.get('window').height * 0.7, width: '100%', maxWidth: 768, alignSelf: 'center' }]}>
            {/* Sheet header: handle on top, title + close button row below */}
            <View style={{ backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 20 }}>
              <View style={{ width: 36, height: 4, backgroundColor: SHEET_HANDLE_COLOR, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={st.modalTitle}>{t('feeHistory')}</Text>
                <TouchableOpacity style={{ padding: 4 }} onPress={() => { setShowFeeHistory(false); setFeeHistoryFilter('all'); }}>
                  <Svg width="18" height="18" viewBox="0 0 24 24" stroke={colors.surface} strokeWidth="2" fill="none">
                    <Line x1="18" y1="6" x2="6" y2="18" />
                    <Line x1="6" y1="6" x2="18" y2="18" />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>
            {/* Month filter */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
              <MonthPicker selected={feeHistoryFilter} onSelect={(v) => setFeeHistoryFilter(v)} months={feeMonthList} colors={colors} compact={false} />
            </View>
            <ScrollView style={{ flex: 1, paddingHorizontal: 12 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              {(() => {
                const filtered = feeHistoryFilter === 'all' ? allFees : allFees.filter((f: any) => f.year === feeHistoryFilter.year && f.month === feeHistoryFilter.month);
                if (filtered.length === 0) {
                  return (
                    <EmptyState
                      icon={<Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><Rect x="3" y="4" width="18" height="17" rx="2" /><Line x1="9" y1="8" x2="15" y2="8" /><Line x1="9" y1="12" x2="15" y2="12" /><Line x1="9" y1="16" x2="13" y2="16" /></Svg>}
                      title={feeHistoryFilter === 'all' ? '暂无手续费数据' : '该月份暂无手续费记录'}
                      hint="该月份还没有数据，去录入一笔吧"
                    />
                  );
                }
                return filtered.map((f: any, idx: number) => {
                const monthTotal = (f.meituan_cashier || 0) + (f.meituan_waimai || 0) + (f.shangou_waimai || 0) + (f.meituan_tuan || 0);
                const platforms = [
                  { label: t('meituanCashier'), value: f.meituan_cashier || 0, color: colors.info },
                  { label: t('meituanWaimai'), value: f.meituan_waimai || 0, color: colors.warning },
                  { label: t('shangouWaimai'), value: f.shangou_waimai || 0, color: colors.info },
                  { label: t('meituanTuan'), value: f.meituan_tuan || 0, color: colors.success },
                ];
                return (
                  <View key={f.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.secondary }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                      <Text style={{ fontSize: FONTS.subBold.size, color: colors.textSub, fontWeight: FONTS.subBold.weight }}>{fmtMonth(f.year, f.month)}</Text>
                      <Text style={{ fontSize: FONTS.body.size, color: colors.primary, fontWeight: FONTS.h2.weight }}>¥{monthTotal.toFixed(2)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {platforms.map((p) => (
                        <View key={p.label} style={{ flex: 1, minWidth: '46%', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 8, gap: 6 }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: p.color }} />
                          <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, flex: 1 }}>{p.label}</Text>
                          <Text style={{ fontSize: FONTS.microBold.size, color: colors.textMain, fontWeight: FONTS.microBold.weight }}>¥{p.value.toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              }); })()}
            </ScrollView>
          </View>
      </ModalOverlay>
    </ReAnimated.View>
    </>
  );
}

/* ═══════════════════════════════════════ STYLES ═══════════════════════════════════ */
const getSt = (colors: ThemeColors) => StyleSheet.create({
  ...uploadReceiptStyles(colors),
  root: { flex: 1, position: 'relative' as const, backgroundColor: 'transparent' as const },

  /* ── Tab Bar ── */
  tabBar: {
    paddingTop: 4, paddingBottom: 8,
    // @ts-ignore — 确保容器透明，让底层背景透出
    backgroundColor: 'transparent',
  },
  tabScroll: {
    paddingHorizontal: 18,
    // @ts-ignore — 确保 ScrollView 内容区透明
    backgroundColor: 'transparent',
  },
  tabCard: {
    // Web's ExpenseScreen tabCard (L1197-1212):
    //   width: calc(100vw - 61px), height: 210,
    //   borderRadius 14, padding 16/14, NO border (only tabCardActive
    //   has a 1px white inner glow border).
    // The CSS backgroundImage (linear-gradient) is re-created with
    // a <LinearGradient> child in the JSX (RN can't render CSS
    // gradient strings). Web has NO backdrop-filter on tabCard.
    width: Dimensions.get('window').width - 50, height: 210,
    borderRadius: 14, overflow: 'hidden',
    paddingHorizontal: 16, paddingVertical: 14,
    justifyContent: 'flex-start',
  },
  tabCardActive: {
    // Web's tabCardActive only sets borderColor (no borderWidth) — no visible border.
    // RN needs no border to match.
  },
  tabInner: {
    flex: 1, alignItems: 'stretch',
  },
  tabTitle: {
    fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: 'rgba(255,255,255,0.95)',
    alignSelf: 'flex-start',
  },
  tabTitleActive: {
    color: colors.surface, fontWeight: FONTS.amount.weight,
  },
  /* ── 对账卡片内字段 ── */
  cardFields: {
    flex: 1, justifyContent: 'center',
  },
  cardFieldRow: {
    flexDirection: 'row',
  },
  cardFieldCol: {
    flex: 1, alignItems: 'center', gap: 2,
  },
  cardFieldLabel: {
    fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: 'rgba(255,255,255,0.70)',
    // @ts-ignore
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  cardFieldVal: {
    fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: 'rgba(255,255,255,0.95)',
    // @ts-ignore
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  // Sub-cards inside i===0 对账 (账面余额 / 当前结余). Tinted
  // backgrounds use success / info at 15% alpha; the 30% border
  // alpha matches web. Padding 14, gap 6 between label + value,
  // borderRadius 10 — exact port of web ExpenseScreen.tsx L468-498.
  subCard: {
    flex: 1, borderRadius: 10, padding: 14, gap: 6,
    borderWidth: 0.5,
  },
  // Sub-cards inside i===1 支出 (日常 / 采购 / 房租 / 薪资).
  // Gradient-start / gradient-end tinted, 0.22 alpha bg + 0.35 alpha
  // border. Padding 10, gap 4 (tighter than i===0 sub-cards).
  expenseSubCard: {
    flex: 1, borderRadius: 10, padding: 10, gap: 4,
    borderWidth: 0.5,
  },
  tabStat: {
    fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, letterSpacing: -0.5,
    color: colors.surface,
    // @ts-ignore
    textShadow: '0 1px 4px rgba(0,0,0,0.15)',
  },

  /* ── Content ── */
  contentScroll: { flex: 1, backgroundColor: 'transparent' as const },
  contentInner: {
    paddingHorizontal: 18, paddingBottom: 100, gap: 0, backgroundColor: 'transparent' as const,
  },
  moduleWrap: {
    width: '100%',
  },

  /* ── Content Card (glass) ── */
  card: {
    borderRadius: 14,
    paddingTop: 18, paddingHorizontal: 18, paddingBottom: 12,
    gap: 14,
    backgroundColor: colors.surface,
  },

  /* ── Date ── */
  dateRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: {
    fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub,
    fontFamily: undefined,
  },
  dateInput: {
    fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub,
    borderWidth: 0, padding: 0, margin: 0,
    backgroundColor: 'transparent', fontFamily: 'inherit',
    // @ts-ignore
    outline: 'none',
    // @ts-ignore — native date picker icon
    WebkitAppearance: 'none',
  } as any,

  /* ── Labels ── */
  sectionLabel: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub },
  subLabel: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub, letterSpacing: 0.5, textTransform: 'uppercase' },

  /* ── Inputs ── */
  row2: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: FONTS.micro.size, lineHeight: Math.round(FONTS.micro.size * 1.4), color: colors.textSub, fontWeight: FONTS.micro.weight, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12,
    fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub, fontFamily: undefined,
    // @ts-ignore
    outline: 'none',
  },

  /* ── Channel grid ── */
  channelGrid: {
    flexDirection: 'column', gap: 8,
  },
  channelChip: {
    flex: 1, minWidth: 60,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingVertical: 4, paddingHorizontal: 4,
    alignItems: 'center',
    gap: 2,
  },
  chipLabel: {
    fontSize: FONTS.microBold.size, color: colors.textSub, fontWeight: FONTS.microBold.weight,
  },
  chipInput: {
    fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub,
    textAlign: 'center', paddingVertical: 2,
    fontFamily: undefined,
    width: '100%',
    borderWidth: 0, backgroundColor: 'transparent',
    // @ts-ignore
    outline: 'none',
  },

  /* ── Sum row ── */
  sumRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  sumLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },
  sumVal: { fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: colors.textMain },

  /* ── Result bar ── */
  resultBar: {
    flexDirection: 'row', backgroundColor: colors.bg,
    borderRadius: 14, padding: 16,
    alignItems: 'center',
  },
  resultItem: { flex: 1, alignItems: 'center' },
  resultDivider: { width: 1, height: 32, backgroundColor: colors.secondary },
  resultLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, marginBottom: 4 },
  resultVal: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: colors.textMain },
  resultDiff: { fontSize: FONTS.h1.size, fontWeight: FONTS.amount.weight, letterSpacing: -0.5 },
  /* ── Recon buttons ── */
  btnRow: {
    flexDirection: 'row', gap: 10, marginTop: 4,
  },
  reconBtn: {
    flex: 1, backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  reconBtnText: {
    fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.surface,
  },
  reconRecordBtn: {
    flex: 1, backgroundColor: colors.secondary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.secondary,
  },
  reconRecordBtnText: {
    fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub,
  },

  /* ── KPI ── */
  kpiRow: { flexDirection: 'row', gap: 12 },
  kpiCard: {
    flex: 1, backgroundColor: colors.bg,
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: colors.secondary,
  },
  kpiLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, marginBottom: 4 },
  kpiVal: { fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: colors.textMain },

  /* ── Table ── */
  tableWrap: {
    borderWidth: 1, borderColor: colors.secondary, borderRadius: 12, overflow: 'hidden',
  },
  tableHead: { backgroundColor: colors.bg },
  tableRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.secondary,
  },
  td: { paddingVertical: 10, paddingHorizontal: 10, fontSize: FONTS.micro.size, color: colors.textSub },
  tdDate: { width: 90, color: colors.textSub, fontSize: FONTS.micro.size },
  tdCat: { flex: 1 },
  tdAmt: { width: 100, textAlign: 'right', fontWeight: FONTS.microBold.weight },

  /* ── Date row ── */
  expDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingRight: 12,
  },
  expDateInput: {
    fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub,
    borderWidth: 0, padding: 0, backgroundColor: 'transparent',
    // @ts-ignore
    outline: 'none',
  },

  /* ── Expense form ── */
  expForm: { gap: 14 },
  /* Big amount input */
  bigAmtWrap: { alignItems: 'center', paddingVertical: 16 },
  bigAmtLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, marginBottom: 8 },
  bigAmtRow: { flexDirection: 'row', alignItems: 'flex-end' },
  bigAmtSymbol: { fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: colors.primary, marginRight: 6 },
  bigAmtInput: {
    fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: colors.textMain,
    borderWidth: 0, backgroundColor: 'transparent',
    textAlign: 'left', padding: 0,
    flex: 0, width: 180,
    // @ts-ignore
    outline: 'none',
  },
  amtCursor: {
    width: 40, height: 2, backgroundColor: colors.primary,
    marginTop: 10, borderRadius: 1,
  },
  /* Category chips */
  catSectionTitle: { fontSize: FONTS.microBold.size, color: colors.textSub, fontWeight: FONTS.microBold.weight, marginBottom: 10 },
  catGrid: { flexDirection: 'row', gap: 8 },
  catGridWide: { gap: 8 },
  catRow: { flexDirection: 'row', width: '100%' as any, gap: 8, marginBottom: 6 },
  catChip: {
    flex: 1, flexDirection: 'row', paddingVertical: 8, borderRadius: 22,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  catChipActive: { backgroundColor: colors.primary },
  catChipText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub },
  catChipTextActive: { color: colors.surface },
  /* Payment method chips */
  payGrid: { flexDirection: 'row', gap: 8 },
  payChip: {
    flex: 1, flexDirection: 'row', paddingVertical: 8, borderRadius: 22,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  payChipActive: { backgroundColor: colors.primary },
  payChipActiveWechat: { backgroundColor: '#07C160' },
  payChipActiveAlipay: { backgroundColor: '#1677FF' },
  payChipText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub },
  refundRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, marginBottom: 8 },
  payChipTextActive: { color: colors.surface },
  /* Chip icon circle */
  chipIconCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },
  chipIconCircleActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  /* Expense records */
  noteInput: {
    fontSize: FONTS.sub.size, color: colors.textSub,
    borderWidth: 0, backgroundColor: colors.bg,
    borderRadius: 10, padding: 12, minHeight: 60,
    textAlignVertical: 'top',
    // @ts-ignore
    outline: 'none',
  },
  expFormRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  expCatLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },
  expBtn: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', position: 'relative', overflow: 'hidden',
  },
  expBtnMask: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 12,
  },
  expBtnText: { color: colors.surface, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },

  /* ── Expense list ── */
  expRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.secondary,
  },
  expNote: { fontSize: FONTS.sub.size, color: colors.textSub, fontWeight: FONTS.sub.weight },
  expDateText: { fontSize: FONTS.micro.size, color: colors.textSub, marginTop: 2 },
  expAmt: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.danger },

  /* ── Empty ── */
  empty: {
    fontSize: FONTS.micro.size, color: colors.textSub, textAlign: 'center', paddingVertical: 24,
  },

  /* ── Modal ── */
  modalOverlay: {
    position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 200, justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.textMain, 0.4),
  },
  modalCard: {
    backgroundColor: colors.surface, borderRadius: MODAL_CARD_RADIUS, width: 320, maxWidth: '100%',
    overflow: 'hidden',
    // @ts-ignore
    ...modalCardAnimation,
    // @ts-ignore
    boxShadow: '0 8px 28px rgba(0,0,0,0.08)',
  },
  modalHeader: {
    backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalTitle: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.surface },
  modalClose: { ...modalClose, },
  modalBtn: {
    flex: 1, backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 10, alignItems: 'center',
  },
  modalBtnText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.surface },
  modalCancelBtn: {
    flex: 1, backgroundColor: colors.bg, borderRadius: 14,
    paddingVertical: 10, alignItems: 'center',
  },
  modalCancelText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub },
  /* Platform fee sheet — bottom half-screen */
  feeSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
    // @ts-ignore
    display: 'flex', flexDirection: 'column',
    // @ts-ignore
    boxShadow: '0 -8px 40px rgba(0,0,0,.18)',
  },
});
