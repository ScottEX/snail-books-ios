import React, { useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Animated, Dimensions, Image,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import Toast from '../components/Toast';
import DatePickerModal from '../components/DatePickerModal';
import { pickImages } from '../utils/imagePicker';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { modalCardAnimation, modalClose, uploadReceiptStyles } from '../sharedStyles';
import { fmtAmt as fmt } from '../utils/format';

/* ── helpers ── */
const fmtInt = (n: number) => n.toLocaleString();
const cnNow = () => { const d = new Date(); return new Date(d.getTime() + 8 * 3600000); };
const yesterdayStr = () => { const d = cnNow(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };
const todayStr = () => cnNow().toISOString().slice(0, 10);
const isFuture = (d: string) => d > todayStr();
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
  const l = getLang();
  if (l.startsWith('en')) {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[month-1]} ${year}`;
  }
  return `${year}年${month}月`;
};
const toNum = (s: string) => parseFloat(s) || 0;
const blockNeg = (s: string) => s.replace(/[^0-9.]/g, '');
const fmtDecInput = (s: string) => { s = blockNeg(s); return s.startsWith('.') ? '0' + s : s; };
const toDec2 = (v: any) => String((parseFloat(String(v ?? 0)) || 0).toFixed(2));

/* ═══════════════════════════════════════════════════════════
   NumberTicker — 数字从 0 平滑滚动到目标值
   ═══════════════════════════════════════════════════════════ */
function NumberTicker({ value, duration = 500, style }: {
  value: number; duration?: number; style?: any;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  // Pick formatter: if value has decimals use fmt, else fmtInt + ¥
  const text = value !== 0 && Number.isInteger(value) && Number.isInteger(display)
    ? '¥' + fmtInt(Math.round(display))
    : fmt(display);

  return <Text style={style}>{text}</Text>;
}

/* ═══════════════════════════════════════════════════════════
   FadeInView — 卡片平滑淡入提升 (300ms)
   ═══════════════════════════════════════════════════════════ */
function FadeInView({ children, style }: {
  children: React.ReactNode; style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════
   InputWithFocus — 聚焦时边框过渡到品牌红
   ═══════════════════════════════════════════════════════════ */
function InputWithFocus({ style, inputStyle, ...props }: any) {
  const [focused, setFocused] = useState(false);
  const { colors } = useTheme();

  return (
    <TextInput
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
   DateErrorHint — 未来日期红字提示，2.5s 自动消失
   ═══════════════════════════════════════════════════════════ */
function DateErrorHint({ trigger, message, colors, textAlign = 'right' }: { trigger: number; message: string; colors: any; textAlign?: 'left' | 'right' | 'center' }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger > 0) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(t);
    } else {
      setShow(false);
    }
  }, [trigger]);
  if (!show) return null;
  return <Text style={{ color: colors.danger, fontSize: 12, marginTop: 1, textAlign }}>{message}</Text>;
}

/* ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   EXPENSE SCREEN
   ═══════════════════════════════════════════════════════════ */
export default function ExpenseScreen({ onReconHistory, onExpenseHistory }: { onReconHistory?: () => void; onExpenseHistory?: () => void }) {
  const { colors } = useTheme();
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
      return saved !== null ? parseInt(saved, 10) : 1; // default to 营业 (index 1)
    } catch { return 1; }
  });
  const setActiveTab = (i: number) => {
    setActiveTabState(i);
    if (i === 2) setExpDateErr(0);
    try { localStorage.setItem('expense_active_tab', String(i)); } catch {}
  };
  const [showToast, setShowToast] = useState(false);
  const hideToast = () => setShowToast(false);

  // Snap-scroll effects are web-only (CSS scroll-snap + DOM scroll listener).
  // RN FlatList handles horizontal swiping natively; no-op here.
  useEffect(() => { /* no-op on RN */ }, []);
  useEffect(() => { /* no-op on RN */ }, [activeTab]);

  /* ── 模块一：对账 ── */
  const [recDate, setRecDate] = useState(yesterdayStr());
  const [recDateKey, setRecDateKey] = useState(0);
  const [recDateErr, setRecDateErr] = useState(0);
  const [toast, setToast] = useState('');
  const [cardBalance, setCardBalance] = useState('');
  const [cashBalance, setCashBalance] = useState('');
  const [dineIn, setDineIn] = useState('');
  const [meituan, setMeituan] = useState('');
  const [flashSale, setFlashSale] = useState('');
  const [tuan, setTuan] = useState('');
  const [jd, setJd] = useState('');

  const mountedRef = useRef(false);
  const initReconValues = useRef({ card: '', cash: '', dine: '', mt: '', fs: '', jd: '', tuan: '' });
  const reconJustLoaded = useRef(false);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Load reconciliation data from backend
  useEffect(() => {
    if (!mountedRef.current) {
      // First mount: load the last reconciliation
      mountedRef.current = true;
      (async () => {
        try {
          const data = await api.getReconciliations(1);
          if (data && data.length > 0) {
            const last = data[0];
            const d = last.bill_date || last.date || yesterdayStr();
            setRecDate(d);
            setCardBalance(toDec2(last.card_balance));
            setCashBalance(toDec2(last.cash_balance));
            setDineIn(toDec2(last.dine_in));
            setMeituan(toDec2(last.meituan));
            setFlashSale(toDec2(last.flash_sale));
            setTuan(toDec2(last.tuan));
            setJd(toDec2(last.jd));
          }
          reconJustLoaded.current = true;
        } catch { setToast(t('toastLoadFailed')); }
      })();
      return;
    }
    // When recDate changes: fetch reconciliation for that date from backend
    (async () => {
      try {
        const data = await api.getReconciliations(365);
        const match = (data || []).find((r: any) => r.bill_date === recDate);
        if (match) {
          setCardBalance(toDec2(match.card_balance));
          setCashBalance(toDec2(match.cash_balance));
          setDineIn(toDec2(match.dine_in));
          setMeituan(toDec2(match.meituan));
          setFlashSale(toDec2(match.flash_sale));
          setTuan(toDec2(match.tuan));
          setJd(toDec2(match.jd));
        } else {
          setCardBalance('');
          setCashBalance('');
          setDineIn('');
          setMeituan('');
          setFlashSale('');
          setTuan('');
          setJd('');
        }
        reconJustLoaded.current = true;
      } catch { setToast(t('toastLoadFailed')); }
    })();
  }, [recDate]);

  // Capture initial values after data load settles
  useEffect(() => {
    if (reconJustLoaded.current) {
      reconJustLoaded.current = false;
      initReconValues.current = { card: cardBalance, cash: cashBalance, dine: dineIn, mt: meituan, fs: flashSale, jd, tuan };
      forceUpdate();
    }
  }, [cardBalance, cashBalance, dineIn, meituan, flashSale, jd, tuan]);

  // 提交对账到后端
  const submitRecon = useCallback(async () => {
    if (isFuture(recDate)) { setToast(t('errDateFuture')); return; }
    try {
      const today = new Date().toISOString().slice(0, 10); // 对账日期 = 今天
      const username = localStorage.getItem('user') || '';
      await api.createReconciliation({
        date: today,
        bill_date: recDate,
        card_balance: toNum(cardBalance),
        cash_balance: toNum(cashBalance),
        dine_in: toNum(dineIn),
        meituan: toNum(meituan),
        flash_sale: toNum(flashSale),
        jd: toNum(jd),
        tuan: toNum(tuan),
        reconciled_by: username,
      });
      setToast(t('reconComplete'));
      onReconHistory?.();
    } catch { setToast(t('toastSubmitFailed')); }
  }, [recDate, cardBalance, cashBalance, dineIn, meituan, flashSale, tuan, jd, onReconHistory]);

  const channelTotal = toNum(dineIn) + toNum(meituan) + toNum(flashSale) + toNum(tuan) + toNum(jd);
  const realTotal = toNum(cardBalance) + toNum(cashBalance);
  const diff = realTotal - channelTotal;

  const hasReconChanges =
    cardBalance !== initReconValues.current.card ||
    cashBalance !== initReconValues.current.cash ||
    dineIn !== initReconValues.current.dine ||
    meituan !== initReconValues.current.mt ||
    flashSale !== initReconValues.current.fs ||
    jd !== initReconValues.current.jd ||
    tuan !== initReconValues.current.tuan;

  /* ── 模块二：平台手续费 ── */
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  const [feeData, setFeeData] = useState<any>(null);        // current month
  const [allFees, setAllFees] = useState<any[]>([]);         // all months for detail
  const [feeMonth, setFeeMonth] = useState<'all' | { year: number; month: number }>({ year: thisYear, month: thisMonth });
  const [showFeeMonthPicker, setShowFeeMonthPicker] = useState(false);
  const [showFeeSheet, setShowFeeSheet] = useState(false);
  const [showFeeHistory, setShowFeeHistory] = useState(false);
  const [feeHistoryFilter, setFeeHistoryFilter] = useState<'all' | { year: number; month: number }>('all');
  const [showFeeHistoryFilterPicker, setShowFeeHistoryFilterPicker] = useState(false);
  const [feeEntryDate, setFeeEntryDate] = useState(todayStr());
  const [feeDateErr, setFeeDateErr] = useState(0);
  const [feeMc, setFeeMc] = useState('');
  const [feeMw, setFeeMw] = useState('');
  const [feeEw, setFeeEw] = useState('');
  const [feeMt, setFeeMt] = useState('');
  const [savingFee, setSavingFee] = useState(false);
  const pickerTriggerRef = useRef<any>(null);
  const feeHistoryFilterTriggerRef = useRef<any>(null);
  const [pickerAnim] = useState(new Animated.Value(0));
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [feeHistoryPickerPos, setFeeHistoryPickerPos] = useState({ top: 0, left: 0 });

  const loadFeeData = async () => {
    try {
      const all = await api.getPlatformFees();
      const allArr = Array.isArray(all) ? all : [];
      setAllFees(allArr);
      // Derive feeData from feeMonth
      if (feeMonth !== 'all') {
        const match = allArr.find((f: any) => f.year === feeMonth.year && f.month === feeMonth.month);
        setFeeData(match || null);
      } else {
        setFeeData(null);
      }
    } catch { setToast(t('toastLoadFailed')); }
  };
  useEffect(() => { loadFeeData(); }, [feeMonth]);

  const handleAddFee = async () => {
    if (feeMonth === 'all') return;
    if (isFuture(feeEntryDate)) { setToast(t('errDateFuture')); return; }
    const mc = toNum(feeMc), mw = toNum(feeMw), ew = toNum(feeEw), mt = toNum(feeMt);
    if (mc + mw + ew + mt === 0) { setToast(t('atLeastOneFee')); return; }
    setSavingFee(true);
    try {
      const r = await api.addPlatformFeeEntry({
        year: feeMonth.year, month: feeMonth.month,
        entry_date: feeEntryDate,
        meituan_cashier: mc, meituan_waimai: mw,
        eleme_waimai: ew, meituan_tuan: mt,
      });
      if (r?.status === 'ok') {
        setFeeData(r.data);
        setFeeMc(''); setFeeMw(''); setFeeEw(''); setFeeMt('');
        setShowFeeSheet(false);
        // Reload all months to keep totals accurate
        api.getPlatformFees().then((all: any) => setAllFees(Array.isArray(all) ? all : []));
      } else {
        setToast(r?.message || t('toastSubmitFailed'));
      }
    } catch { setToast(t('toastSubmitFailed')); }
    setSavingFee(false);
  };

  /* ── 模块三：支出 ── */
  const [expDate, setExpDate] = useState(todayStr());
  const [expDateErr, setExpDateErr] = useState(0);
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('日常');
  const [payMethod, setPayMethod] = useState('微信');
  const [expNote, setExpNote] = useState('');
  const [expImages, setExpImages] = useState<any[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expCatTotals, setExpCatTotals] = useState({ daily: 0, rent: 0, salary: 0, goods: 0 });
  const [loadingExp, setLoadingExp] = useState(false);
  const [showExpConfirm, setShowExpConfirm] = useState(false);

  const loadExpenses = async () => {
    try {
      // Load all expense transactions for complete category totals
      const allExpenses: any[] = [];
      let page = 1;
      while (true) {
        const tx: any = await api.getTransactions(page, 100);
        const exps = (tx.transactions || []).filter((t: any) => t.type === 'expense');
        allExpenses.push(...exps);
        if (page >= (tx.pages || 1)) break;
        page++;
      }
      setExpenses(allExpenses);
      // Compute category totals
      let daily = 0, rent = 0, salary = 0, goods = 0;
      allExpenses.forEach((e: any) => {
        const cat = e.category || '';
        const amt = e.amount || 0;
        if (cat.includes('日常')) daily += amt;
        else if (cat.includes('房租')) rent += amt;
        else if (cat.includes('薪资')) salary += amt;
        else if (cat.includes('采购')) goods += amt;
      });
      setExpCatTotals({ daily, rent, salary, goods });
    } catch { setToast(t('toastLoadFailed')); }
  };
  useEffect(() => { loadExpenses(); }, []);

  // Sync uncontrolled date inputs when state changes externally
  useEffect(() => { if (recDateInputRef.current) recDateInputRef.current.value = recDate; }, [recDate]);
  useEffect(() => { if (expDateInputRef.current) expDateInputRef.current.value = expDate; }, [expDate]);
  useEffect(() => { if (feeDateInputRef.current) feeDateInputRef.current.value = feeEntryDate; }, [feeEntryDate]);

  // Image upload handlers
  const recDateInputRef = useRef<any>(null);
  const expDateInputRef = useRef<any>(null);
  const feeDateInputRef = useRef<any>(null);
  const [showRecDatePicker, setShowRecDatePicker] = useState(false);
  const [showExpDatePicker, setShowExpDatePicker] = useState(false);
  const [showFeeDatePicker, setShowFeeDatePicker] = useState(false);
  const [showImgTip, setShowImgTip] = useState(false);

  // Compress image — no-op on RN. (RN uses expo-image-manipulator instead.)
  const compressImage = (file: any): Promise<any> => Promise.resolve(file);

  const handleImageSelect = async (e: any) => {
    const files: any[] = e?.files || e?.target?.files || [];
    if (!files || files.length === 0) return;
    const newFiles: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) continue;
      if (f.size > 10 * 1024 * 1024) continue;
      if (expImages.some((e: any) => e.name === f.name && e.size === f.size)) continue;
      const compressed = await compressImage(f);
      newFiles.push(compressed);
    }
    setExpImages((prev: any[]) => [...prev, ...newFiles]);
  };

  const removeImage = (idx: number) => {
    setExpImages(prev => {
      if (prev[idx]) revokePreviewUrl(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleAddExpense = async () => {
    if (!expAmount || parseFloat(expAmount) <= 0) return;
    if (isFuture(expDate)) { setToast(t('errDateFuture')); return; }
    setLoadingExp(true);
    try {
      // Upload images first if any
      let imageUrls: string[] = [];
      let thumbUrls: string[] = [];
      if (expImages.length > 0) {
        setUploadingImg(true);
        const result = await api.uploadExpenseImages(expImages);
        setUploadingImg(false);
        if (result.status !== 'ok') {
          setToast(t('toastSubmitFailed'));
          setLoadingExp(false);
          return;
        }
        imageUrls = result.images || [];
        // Use the server-generated thumb URLs for the history list; fall back to
        // full-size images if the backend didn't return thumbs (PIL disabled).
        thumbUrls = (result.thumb_images && result.thumb_images.length > 0)
          ? result.thumb_images
          : imageUrls;
      }
      await api.createTransaction({
        type: 'expense',
        amount: parseFloat(expAmount),
        category: expCategory,
        account: payMethod,
        note: expNote,
        date: expDate,
        images: imageUrls,
        thumb_images: thumbUrls,
      });
      clearUrlCache();
      setExpAmount('');
      setExpCategory('日常');
      setPayMethod('微信');
      setExpNote('');
      setExpDate(todayStr());
      setExpImages([]);
      await loadExpenses();
      onExpenseHistory?.();
    } catch { setToast(t('toastSubmitFailed')); }
    setLoadingExp(false);
  };

  /* ── 卡片摘要数据 ── */
  const feeTotal = feeMonth === 'all'
    ? allFees.reduce((sum: number, f: any) => sum + (f.meituan_cashier || 0) + (f.meituan_waimai || 0) + (f.eleme_waimai || 0) + (f.meituan_tuan || 0), 0)
    : feeData
    ? ((feeData.meituan_cashier || 0) + (feeData.meituan_waimai || 0) + (feeData.eleme_waimai || 0) + (feeData.meituan_tuan || 0))
    : 0;
  const lang = getLang();
  const tabCards = useMemo(() => [
    { gradient: [withAlpha(colors.success, 0.22), withAlpha(colors.info, 0.22)], gradientActive: [withAlpha(colors.success, 0.48), withAlpha(colors.info, 0.48)], title: t('tabRecon'), stat: diff, statFmt: fmt(diff), statColor: diff >= 0 ? colors.success : colors.danger, prefix: diff >= 0 ? '+' : '' },
    { gradient: [withAlpha(colors.primary, 0.22), withAlpha(colors.warning, 0.22)], gradientActive: [withAlpha(colors.primary, 0.48), withAlpha(colors.warning, 0.48)], title: t('tabRevenue'), stat: feeTotal, statFmt: fmt(feeTotal), statColor: colors.textMain, prefix: '' },
    { gradient: [withAlpha(colors.danger, 0.22), withAlpha(colors.primary, 0.22)], gradientActive: [withAlpha(colors.danger, 0.48), withAlpha(colors.primary, 0.48)], title: t('tabExpense'), stat: expCatTotals.daily + expCatTotals.rent + expCatTotals.salary + expCatTotals.goods, statFmt: fmt(expCatTotals.daily + expCatTotals.rent + expCatTotals.salary + expCatTotals.goods), statColor: colors.textMain, prefix: '' },
  ], [diff, feeTotal, expCatTotals.daily, expCatTotals.rent, expCatTotals.salary, expCatTotals.goods, colors, lang]);

  const st = useMemo(() => getSt(colors), [colors]);

  /* ── Render ── */
  return (
    <View style={st.root}>
      {/* ══════ 卡片式Tab ══════ */}
      <View style={st.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          testID="snap-scroll"
          contentContainerStyle={st.tabScroll}>
          {tabCards.map((tab, i) => {
            const active = activeTab === i;
            const bgGrad = active ? tab.gradientActive : tab.gradient;
            return (
              <TouchableOpacity
                key={i}
                testID="snap-card"
                style={[st.tabCard, active && st.tabCardActive, {
                  // @ts-ignore — 每张卡片独立渐变色
                  backgroundImage: `linear-gradient(90deg, ${bgGrad[0]} 0%, ${bgGrad[1]} 100%)`,
                }]}
                onPress={() => setActiveTab(i)}
                activeOpacity={0.7}
              >
                <View style={st.tabInner}>
                  <Text style={[st.tabTitle, active && st.tabTitleActive]}>
                    {tab.title}{i === 2 ? ' ¥' + fmtInt(expCatTotals.daily + expCatTotals.rent + expCatTotals.salary + expCatTotals.goods) : ''}
                  </Text>
                  {i === 0 && (
                    <View style={st.cardFields}>
                      <View style={st.cardFieldRow}>
                        <View style={st.cardFieldCol}>
                          <Text style={st.cardFieldLabel}>{t('bookBalance')}</Text>
                          <Text style={[st.cardFieldVal, { color: colors.textMain }]}>{fmt(channelTotal)}</Text>
                        </View>
                        <View style={st.cardFieldCol}>
                          <Text style={st.cardFieldLabel}>{t('currentBalance')}</Text>
                          <Text style={[st.cardFieldVal, { color: colors.textMain }]}>{fmt(realTotal)}</Text>
                        </View>
                        <View style={st.cardFieldCol}>
                          <Text style={st.cardFieldLabel}>{t('bookDiff')}</Text>
                          <Text style={[st.cardFieldVal, { color: Math.abs(diff) < 0.005 ? colors.textMain : colors.primary }]}>{diff >= 0 ? '+' : '-'}{fmt(Math.abs(diff))}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  {i === 1 && (
                    <View style={st.cardFields}>
                      <View style={st.cardFieldRow}>
                        <View style={st.cardFieldCol}>
                          <Text style={st.cardFieldLabel}>{t('cumulativeRevenue')}</Text>
                          <Text style={st.cardFieldVal}>{fmt(channelTotal)}</Text>
                        </View>
                        <View style={st.cardFieldCol}>
                          <Text style={st.cardFieldLabel}>{t('cumulativeExpense')}</Text>
                          <Text style={st.cardFieldVal}>{fmt(expCatTotals.daily + expCatTotals.rent + expCatTotals.salary + expCatTotals.goods)}</Text>
                        </View>
                        <View style={st.cardFieldCol}>
                          <Text style={st.cardFieldLabel}>{t('cashOnHand')}</Text>
                          <Text style={[st.cardFieldVal, { color: Math.abs(realTotal) < 0.005 ? colors.textMain : colors.primary }]}>{fmt(realTotal)}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
                {i === 2 && (
                  <View style={st.cardFields}>
                    <View style={st.cardFieldRow}>
                      <View style={st.cardFieldCol}>
                        <Text style={st.cardFieldLabel}>{t('daily')}</Text>
                        <Text style={[st.cardFieldVal, { fontSize: FONTS.body.size }]}>{fmt(expCatTotals.daily)}</Text>
                      </View>
                      <View style={st.cardFieldCol}>
                        <Text style={st.cardFieldLabel}>{t('rent')}</Text>
                        <Text style={[st.cardFieldVal, { fontSize: FONTS.body.size }]}>{fmt(expCatTotals.rent)}</Text>
                      </View>
                      <View style={st.cardFieldCol}>
                        <Text style={st.cardFieldLabel}>{t('salary')}</Text>
                        <Text style={[st.cardFieldVal, { fontSize: FONTS.body.size }]}>{fmt(expCatTotals.salary)}</Text>
                      </View>
                      <View style={st.cardFieldCol}>
                        <Text style={st.cardFieldLabel}>{t('goods')}</Text>
                        <Text style={[st.cardFieldVal, { fontSize: FONTS.body.size }]}>{fmt(expCatTotals.goods)}</Text>
                      </View>
                    </View>
                  </View>
                )}
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
          <View style={st.card}>
            {/* 日期行 */}
            <View style={st.dateRow}>
              <Text style={{ fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub }}>{t('billDate')}</Text>
              <TouchableOpacity
                onPress={() => setShowRecDatePicker(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, position: 'relative' }}
                activeOpacity={0.7}
              >
                <Text style={st.dateText}>
                  {(() => {
                    const l = getLang();
                    const [y, m, d] = recDate.split('-');
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
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ translateY: 0 }] }}><Path d="M10 6l6 6-6 6"/></Svg>
              </TouchableOpacity>
            </View>
            <DateErrorHint trigger={recDateErr} message={t('errDateFuture')} colors={colors} />

            <View style={st.row2}>
              <View style={st.inputGroup}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ translateY: -1 }] }}><Rect x="2" y="4" width="20" height="16" rx="2"/><Path d="M2 10h20"/><Rect x="5" y="14" width="3" height="2" rx="0.5"/></Svg><Text style={st.inputLabel}>{t('cardBalance')}</Text></View>
                <InputWithFocus inputStyle={st.input}
                  value={cardBalance} onChangeText={(v: string) => setCardBalance(blockNeg(v))}
                  onBlur={() => { if (cardBalance !== '') setCardBalance(toDec2(cardBalance)); }}
                  keyboardType="decimal-pad"
                  placeholder="0.00" placeholderTextColor={colors.textSub} />
              </View>
              <View style={st.inputGroup}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ translateY: -1 }] }}><Rect x="2" y="5" width="20" height="14" rx="2"/><Circle cx="12" cy="12" r="2.5"/><Path d="M18.5 9l-1 0M18.5 15l-1 0M5.5 9l1 0M5.5 15l1 0"/></Svg><Text style={st.inputLabel}>{t('cashBalance')}</Text></View>
                <InputWithFocus inputStyle={st.input}
                  value={cashBalance} onChangeText={(v: string) => setCashBalance(blockNeg(v))}
                  onBlur={() => { if (cashBalance !== '') setCashBalance(toDec2(cashBalance)); }}
                  keyboardType="decimal-pad"
                  placeholder="0.00" placeholderTextColor={colors.textSub} />
              </View>
            </View>

            {/* 在途资金 */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub }}>{t('fundsInTransit')}</Text>
              <NumberTicker value={channelTotal} style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.primary }} />
            </View>
            <View style={st.channelGrid}>
              {/* Row 1: 堂食 + 美团 + 闪购 */}
              <View style={{ flexDirection: 'row', width: '100%', gap: 8 }}>
                <TouchableOpacity style={[st.channelChip, { flex: 1 }]} activeOpacity={1}>
                  <Text style={st.chipLabel}>{t('dineIn')}</Text>
                  <InputWithFocus inputStyle={st.chipInput}
                    value={dineIn} onChangeText={(v: string) => setDineIn(blockNeg(v))}
                    onBlur={() => { if (dineIn !== '') setDineIn(toDec2(dineIn)); }}
                    keyboardType="decimal-pad"
                    placeholder="0.00" placeholderTextColor={colors.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={[st.channelChip, { flex: 1 }]} activeOpacity={1}>
                  <Text style={st.chipLabel}>{t('meituan')}</Text>
                  <InputWithFocus inputStyle={st.chipInput}
                    value={meituan} onChangeText={(v: string) => setMeituan(blockNeg(v))}
                    onBlur={() => { if (meituan !== '') setMeituan(toDec2(meituan)); }}
                    keyboardType="decimal-pad"
                    placeholder="0.00" placeholderTextColor={colors.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={[st.channelChip, { flex: 1 }]} activeOpacity={1}>
                  <Text style={st.chipLabel}>{t('flashSale')}</Text>
                  <InputWithFocus inputStyle={st.chipInput}
                    value={flashSale} onChangeText={(v: string) => setFlashSale(blockNeg(v))}
                    onBlur={() => { if (flashSale !== '') setFlashSale(toDec2(flashSale)); }}
                    keyboardType="decimal-pad"
                    placeholder="0.00" placeholderTextColor={colors.textSub} />
                </TouchableOpacity>
              </View>
              {/* Row 2: 京东 + 团购 */}
              <View style={{ flexDirection: 'row', width: '100%', gap: 8 }}>
                <TouchableOpacity style={[st.channelChip, { flex: 1 }]} activeOpacity={1}>
                  <Text style={st.chipLabel}>{t('jd')}</Text>
                  <InputWithFocus inputStyle={st.chipInput}
                    value={jd} onChangeText={(v: string) => setJd(blockNeg(v))}
                    onBlur={() => { if (jd !== '') setJd(toDec2(jd)); }}
                    keyboardType="decimal-pad"
                    placeholder="0.00" placeholderTextColor={colors.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={[st.channelChip, { flex: 1 }]} activeOpacity={1}>
                  <Text style={st.chipLabel}>{t('tuan')}</Text>
                  <InputWithFocus inputStyle={st.chipInput}
                    value={tuan} onChangeText={(v: string) => setTuan(blockNeg(v))}
                    onBlur={() => { if (tuan !== '') setTuan(toDec2(tuan)); }}
                    keyboardType="decimal-pad"
                    placeholder="0.00" placeholderTextColor={colors.textSub} />
                </TouchableOpacity>
              </View>
            </View>

            {/* 按钮行：对账记录(左) + 添加(右) */}
            <View style={st.btnRow}>
              <TouchableOpacity style={st.reconRecordBtn} onPress={onReconHistory} activeOpacity={0.8}>
                <Text style={st.reconRecordBtnText}>{t('reconHistory')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.reconBtn, !hasReconChanges && { opacity: 0.4 }]}
                onPress={() => hasReconChanges && setShowToast(true)}
                activeOpacity={hasReconChanges ? 0.8 : 1}
                disabled={!hasReconChanges}
              >
                <Text style={st.reconBtnText}>{t('reconComplete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeInView>
        )}

        {/* ── 模块二：平台手续费 ── */}
        {activeTab === 1 && (
        <FadeInView style={st.moduleWrap}>
          {/* Revenue KPI cards */}
          <View style={st.card}>
            <View style={st.kpiRow}>
              <View style={st.kpiCard}>
                <Text style={st.kpiLabel}>{t('actualReceived')}</Text>
                <Text style={[st.kpiVal, { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight }]}>¥0.00</Text>
              </View>
              <View style={st.kpiCard}>
                <Text style={st.kpiLabel}>{t('receivable')}</Text>
                <Text style={[st.kpiVal, { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight }]}>¥0.00</Text>
              </View>
              <View style={st.kpiCard}>
                <Text style={st.kpiLabel}>{t('discountAmount')}</Text>
                <Text style={[st.kpiVal, { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight }]}>¥0.00</Text>
              </View>
            </View>
          </View>

          {/* Platform fees card */}
          <View style={[st.card, { marginTop: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Text style={{ fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: colors.textMain }}>{t('platformFee')}</Text>
                <TouchableOpacity
                  ref={pickerTriggerRef}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 2, position: 'relative', paddingTop: 2 }}
                  onPress={() => {
                    if (!showFeeMonthPicker) {
                      // Measure trigger position for dropdown placement
                      if (pickerTriggerRef.current && typeof (pickerTriggerRef.current as any).measure === 'function') {
                        (pickerTriggerRef.current as any).measure((_x: number, _y: number, _w: number, _h: number, px: number, py: number) => {
                          setPickerPos({ top: py + 30, left: px });
                        });
                      }
                      pickerAnim.setValue(0);
                      Animated.spring(pickerAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 24 }).start();
                      setShowFeeMonthPicker(true);
                    } else {
                      Animated.timing(pickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
                        setShowFeeMonthPicker(false);
                      });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: FONTS.microBold.size, color: colors.primary, fontWeight: FONTS.microBold.weight }}>
                    {feeMonth === 'all' ? t('feeAllMonths') : fmtMonth(feeMonth.year, feeMonth.month)}
                  </Text>
                  <Text style={{ fontSize: FONTS.micro.size, color: colors.primary }}>▼</Text>
                </TouchableOpacity>
              </View>
              {(feeMonth !== 'all' || allFees.length > 0) && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                onPress={() => {
                  if (feeMonth === 'all') {
                    setShowFeeHistory(true); setFeeHistoryFilter('all');
                  } else {
                    setFeeMc(''); setFeeMw(''); setFeeEw(''); setFeeMt('');
                    setFeeDateErr(0); loadFeeData(); setShowFeeSheet(true);
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
                { k: 'shangouWaimai', v: feeMonth === 'all' ? allFees.reduce((s: number, f: any) => s + (f.eleme_waimai || 0), 0) : (feeData?.eleme_waimai || 0), color: colors.info },
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
        </FadeInView>
        )}

        {/* ── 模块三：支出明细 ── */}
        {activeTab === 2 && (
        <FadeInView style={st.moduleWrap}>
          <View style={st.card}>
            {/* 录入台 */}
            <View style={st.expForm}>
              {/* 大金额输入 */}
              <View style={st.bigAmtWrap}>
                <Text style={st.bigAmtLabel}>{t('amountLabel')}</Text>
                <View style={st.bigAmtRow}>
                  <Text style={st.bigAmtSymbol}>¥</Text>
                  <TextInput style={st.bigAmtInput}
                    value={expAmount} onChangeText={(v: string) => setExpAmount(fmtDecInput(v))}
                    keyboardType="decimal-pad" placeholder="0.00"
                    placeholderTextColor={colors.textSub}
                    autoFocus={false} />
                </View>
                <View style={st.amtCursor} />
              </View>
              {/* 分类胶囊 — 2×2 grid (accommodates long English words) */}
              <Text style={st.catSectionTitle}>{t('expenseCategory')}</Text>
              <View style={st.catGridWide}>
                {(() => {
                  const icons: Record<string, React.ReactElement> = {
                    '日常': <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-2l-2-3H9L7 7H5a2 2 0 00-2 2z"/><Path d="M16 12a4 4 0 11-8 0"/></Svg>,
                    '房租': <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M3 21h18"/><Path d="M3 10l9-7 9 7"/><Path d="M5 12v7h4v-4h6v4h4v-7"/></Svg>,
                    '薪资': <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><Circle cx="12" cy="12" r="9"/><Path d="M14 8h-3.5a2 2 0 000 4h1a2 2 0 010 4H8"/><Path d="M12 6v2M12 16v2"/></Svg>,
                    '采购': <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 7l-3-4H7L4 7v12a2 2 0 002 2h12a2 2 0 002-2V7z"/><Path d="M4 7h16"/><Path d="M9 12h6"/><Path d="M12 9v6"/></Svg>,
                  };
                  const keys: Record<string, string> = { '日常': 'daily', '房租': 'rent', '薪资': 'salary', '采购': 'goods' };
                  const cats = ['日常', '房租', '薪资', '采购'] as const;
                  const mkChip = (cat: string) => {
                    const active = expCategory === cat;
                    return (
                      <TouchableOpacity key={cat} style={[st.catChip, active && st.catChipActive]}
                        onPress={() => setExpCategory(cat)} activeOpacity={0.7}>
                        <View style={[st.chipIconCircle, active && st.chipIconCircleActive]}>{icons[cat]}</View>
                        <Text style={[st.catChipText, active && st.catChipTextActive]} numberOfLines={1}>{t(keys[cat] as any)}</Text>
                      </TouchableOpacity>
                    );
                  };
                  return (
                    <>
                      <View style={st.catRow}>{cats.slice(0, 2).map(mkChip)}</View>
                      <View style={st.catRow}>{cats.slice(2, 4).map(mkChip)}</View>
                    </>
                  );
                })()}
              </View>
              {/* 支付方式 */}
              <Text style={st.catSectionTitle}>{t('paymentMethod')}</Text>
              <View style={st.payGrid}>
                {(() => {
                  const payIcons: Record<string, (color: string) => React.ReactNode> = {
                    '现金': (color) => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><Rect x="1" y="4" width="22" height="16" rx="2"/><Path d="M1 10h22"/><Circle cx="12" cy="12" r="3"/></Svg>,
                    '微信': (color) => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z"/></Svg>,
                    '支付宝': (color) => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><Path d="M9 12l2 2 4-4"/></Svg>,
                  };
                  const chipIconBg: Record<string, string> = { '微信': '#07C160', '支付宝': '#1677FF', '现金': '#333' };
                  const keyMap: Record<string, string> = { '现金': 'payCash', '微信': 'payWechat', '支付宝': 'payAlipay' };
                  return (['现金', '微信', '支付宝'] as const).map((m) => {
                    const active = payMethod === m;
                    const isWechat = m === '微信';
                    const isAlipay = m === '支付宝';
                    return (
                      <TouchableOpacity key={m}
                        style={[st.payChip, active && (isWechat ? st.payChipActiveWechat : isAlipay ? st.payChipActiveAlipay : st.payChipActive)]}
                        onPress={() => setPayMethod(m)} activeOpacity={0.7}>
                        <View style={[st.chipIconCircle, active && { backgroundColor: chipIconBg[m] }]}>
                          {payIcons[m](active ? colors.surface : colors.textSub)}
                        </View>
                        <Text style={[st.payChipText, active && st.payChipTextActive]}>{t(keyMap[m] as any)}</Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>
              {/* 支出说明 */}
              <Text style={st.catSectionTitle}>{t('expenseNote')}</Text>
              <InputWithFocus inputStyle={st.noteInput}
                value={expNote}
                onChangeText={setExpNote}
                placeholder={t('notePlaceholder')}
                placeholderTextColor={colors.textSub}
                multiline />
              {/* 凭证上传 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[st.catSectionTitle, { marginBottom: 0 }]}>{t('uploadImage')}</Text>
                <TouchableOpacity onPress={() => setShowImgTip(!showImgTip)} activeOpacity={0.7}
                  style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub }}>!</Text>
                </TouchableOpacity>
                {showImgTip && (
                  <View style={st.imgTipBubble}>
                    <Text style={st.imgTipText}>支持 jpg/png/webp，单张最大 10MB</Text>
                  </View>
                )}
              </View>
              <View style={st.imgRow}>
                {/* Add button */}
                <TouchableOpacity style={st.imgAddBtn}
                  onPress={async () => {
                    const imgs = await pickImages({ multiple: true }).catch(() => []);
                    if (imgs.length === 0) return;
                    setExpImages((prev: any[]) => [...prev, ...imgs]);
                  }}
                  activeOpacity={0.7}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={1.5} strokeLinecap="round">
                    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <Circle cx="12" cy="13" r="4" />
                  </Svg>
                  <Text style={st.imgAddText}>{t('addImage')}</Text>
                </TouchableOpacity>
                {/* Image previews */}
                {expImages.map((file: any, i: number) => (
                  <View key={`img-${i}`} style={st.imgPreview}>
                    <Image source={{ uri: getPreviewUrl(file) }} style={{ width: 92, height: 92, borderRadius: 12 }} />
                    <TouchableOpacity style={st.imgRemove}
                      onPress={() => removeImage(i)}
                      activeOpacity={0.7}>
                      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.surface} strokeWidth={2.5} strokeLinecap="round">
                        <Path d="M18 6L6 18M6 6l12 12" />
                      </Svg>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              {/* 日期选择 */}
              <View style={st.expDateRow}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={1.5}>
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
                    <Text style={st.dateText}>
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
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ translateY: 0 }] }}><Path d="M10 6l6 6-6 6"/></Svg>
                  </TouchableOpacity>
                  <DateErrorHint trigger={expDateErr} message={t('errDateFuture')} colors={colors} textAlign="left" />
                </View>
              </View>
              {/* 按钮行 */}
              <View style={st.btnRow}>
                <TouchableOpacity style={st.reconRecordBtn}
                  onPress={() => onExpenseHistory?.()} activeOpacity={0.8}>
                  <Text style={st.reconRecordBtnText}>{t('expenseHistory')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.expBtn, { flex: 1 }]}
                  onPress={() => { if (parseFloat(expAmount) > 0) setShowExpConfirm(true); }}
                  disabled={!expAmount || parseFloat(expAmount) <= 0 || loadingExp}
                  activeOpacity={0.8}
                >
                  <Text style={st.expBtnText}>
                    {loadingExp ? '...' : t('confirmRecord')}
                  </Text>
                  {(!expAmount || parseFloat(expAmount) <= 0 || loadingExp) && (
                    <View style={st.expBtnMask} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </FadeInView>
        )}
      </ScrollView>

      {/* 支出确认弹窗 */}
      {showExpConfirm && (
        <ModalOverlay onClose={() => setShowExpConfirm(false)}>
          <View style={st.modalCard} onStartShouldSetResponder={() => true}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{t('expConfirmTitle')}</Text>
              <TouchableOpacity onPress={() => setShowExpConfirm(false)}>
                <Text style={st.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              <Text style={{ fontSize: FONTS.sub.size, color: colors.textSub, textAlign: 'center' }}>
                {t('expConfirmMsg')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={st.modalCancelBtn} onPress={() => setShowExpConfirm(false)}>
                  <Text style={st.modalCancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.modalBtn} onPress={() => { setShowExpConfirm(false); handleAddExpense(); }}>
                  <Text style={st.modalBtnText}>{t('confirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ModalOverlay>
      )}

      {/* 添加提示弹窗 */}
      {showToast && (
        <ModalOverlay onClose={hideToast}>
          <View style={st.modalCard} onStartShouldSetResponder={() => true}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{t('friendlyReminder')}</Text>
              <TouchableOpacity onPress={hideToast}>
                <Text style={st.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              <Text style={{ fontSize: FONTS.sub.size, color: colors.textSub, textAlign: 'center' }}>
                {t('jokeRecon')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={st.modalCancelBtn} onPress={hideToast}>
                  <Text style={st.modalCancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.modalBtn} onPress={() => { hideToast(); submitRecon(); }}>
                  <Text style={st.modalBtnText}>{t('confirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ModalOverlay>
      )}
      {/* Platform fee entry bottom sheet */}
      {showFeeSheet && (
        <ModalOverlay onClose={() => setShowFeeSheet(false)}>
          <View style={st.feeSheet} onStartShouldSetResponder={() => true}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{t('addFeeEntry')}</Text>
              <TouchableOpacity onPress={() => setShowFeeSheet(false)}>
                <Text style={st.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
              {/* Date */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
                <Text style={{ fontSize: FONTS.sub.size, color: colors.textSub, fontWeight: FONTS.sub.weight, marginTop: 2 }}>{t('entryDate')}</Text>
                <View>
                  <TouchableOpacity onPress={() => setShowFeeDatePicker(true)} style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }} activeOpacity={0.7}>
                    <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub }}>
                      {(() => { return fmtLocalDate(feeEntryDate); })()}
                    </Text>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, transform: [{ translateY: -1 }] }}><Path d="M10 6l6 6-6 6"/></Svg>
                  </TouchableOpacity>
                  <DateErrorHint trigger={feeDateErr} message={t('errDateFuture')} colors={colors} />
                </View>
              </View>

              {/* Column headers */}
              <View style={{ flexDirection: 'row', marginBottom: 10, gap: 8, paddingHorizontal: 2 }}>
                <Text style={{ flex: 1, maxWidth: '30%', fontSize: FONTS.microBold.size, color: colors.textSub, fontWeight: FONTS.microBold.weight }}></Text>
                <Text style={{ width: 80, fontSize: FONTS.microBold.size, color: colors.textSub, fontWeight: FONTS.microBold.weight, textAlign: 'left' }}>{t('feePreview')}</Text>
                <Text style={{ width: 80, fontSize: FONTS.microBold.size, color: colors.textSub, fontWeight: FONTS.microBold.weight, textAlign: 'left' }}>{t('feeCurrent')}</Text>
                <Text style={{ width: 72, fontSize: FONTS.microBold.size, color: colors.textSub, fontWeight: FONTS.microBold.weight, textAlign: 'right' }}>{t('feeEntry')}</Text>
              </View>

              {/* Fee rows */}
              {([
                { k: 'meituanCashier', cur: feeData?.meituan_cashier || 0, val: feeMc, set: setFeeMc },
                { k: 'meituanWaimai', cur: feeData?.meituan_waimai || 0, val: feeMw, set: setFeeMw },
                { k: 'shangouWaimai', cur: feeData?.eleme_waimai || 0, val: feeEw, set: setFeeEw },
                { k: 'meituanTuan', cur: feeData?.meituan_tuan || 0, val: feeMt, set: setFeeMt },
              ] as const).map((row) => {
                const inputNum = toNum(row.val);
                return (
                  <View key={row.k} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                    <Text style={{ flex: 1, maxWidth: '30%', fontSize: FONTS.sub.size, color: colors.textSub, fontWeight: FONTS.sub.weight }} numberOfLines={1}>{t(row.k)}</Text>
                    <Text style={{ width: 80, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain, textAlign: 'left' }}>
                      ¥{(row.cur + inputNum).toFixed(2)}
                    </Text>
                    <Text style={{ width: 80, fontSize: FONTS.micro.size, color: colors.textSub, textAlign: 'left' }}>
                      ¥{row.cur.toFixed(2)}
                    </Text>
                    <TextInput
                      style={{ width: 72, height: 38, borderWidth: 1, borderColor: colors.secondary, borderRadius: 8, paddingHorizontal: 10, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub, textAlign: 'right', backgroundColor: colors.surface, outline: 'none' } as any}
                      value={row.val} onChangeText={(v: string) => row.set(fmtDecInput(v))}
                      keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSub}
                    />
                  </View>
                );
              })}

              {/* Confirm */}
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8, opacity: (savingFee || (toNum(feeMc) + toNum(feeMw) + toNum(feeEw) + toNum(feeMt) === 0)) ? 0.35 : 1 }}
                onPress={handleAddFee} disabled={savingFee || (toNum(feeMc) + toNum(feeMw) + toNum(feeEw) + toNum(feeMt) === 0)} activeOpacity={0.8}
              >
                <Text style={{ color: colors.surface, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight }}>{savingFee ? '...' : t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ModalOverlay>
      )}

      {/* Fee history bottom sheet — "全部" detail view */}
      {showFeeHistory && (
        <ModalOverlay onClose={() => { setShowFeeHistory(false); setFeeHistoryFilter('all'); }}>
          <View style={[st.feeSheet, { height: Dimensions.get('window').height * 0.75, width: '96%' }]} onStartShouldSetResponder={() => true}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{t('feeHistory')}</Text>
              <TouchableOpacity onPress={() => { setShowFeeHistory(false); setFeeHistoryFilter('all'); }}>
                <Text style={st.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {/* Month filter */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                ref={feeHistoryFilterTriggerRef}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, position: 'relative' }}
                onPress={() => {
                  if (!showFeeHistoryFilterPicker) {
                    if (feeHistoryFilterTriggerRef.current && typeof (feeHistoryFilterTriggerRef.current as any).measure === 'function') {
                      (feeHistoryFilterTriggerRef.current as any).measure((_x: number, _y: number, _w: number, _h: number, px: number, py: number) => {
                        setFeeHistoryPickerPos({ top: py + 30, left: px });
                      });
                    }
                    pickerAnim.setValue(0);
                    Animated.spring(pickerAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 24 }).start();
                    setShowFeeHistoryFilterPicker(true);
                  } else {
                    Animated.timing(pickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
                      setShowFeeHistoryFilterPicker(false);
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: FONTS.subBold.size, color: colors.primary, fontWeight: FONTS.subBold.weight }}>
                  {feeHistoryFilter === 'all' ? t('feeAllMonths') : fmtMonth(feeHistoryFilter.year, feeHistoryFilter.month)}
                </Text>
                <Text style={{ fontSize: FONTS.micro.size, color: colors.primary, marginLeft: 2 }}>▼</Text>

              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              {(feeHistoryFilter === 'all' ? allFees : allFees.filter((f: any) => f.year === feeHistoryFilter.year && f.month === feeHistoryFilter.month)).map((f: any, idx: number) => {
                const monthTotal = (f.meituan_cashier || 0) + (f.meituan_waimai || 0) + (f.eleme_waimai || 0) + (f.meituan_tuan || 0);
                const platforms = [
                  { label: t('meituanCashier'), value: f.meituan_cashier || 0, color: colors.info },
                  { label: t('meituanWaimai'), value: f.meituan_waimai || 0, color: colors.warning },
                  { label: t('shangouWaimai'), value: f.eleme_waimai || 0, color: colors.info },
                  { label: t('meituanTuan'), value: f.meituan_tuan || 0, color: colors.success },
                ];
                return (
                  <View key={f.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.secondary, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as any}>
                    {/* Header: date + total */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                      <Text style={{ fontSize: FONTS.subBold.size, color: colors.textSub, fontWeight: FONTS.subBold.weight }}>{fmtMonth(f.year, f.month)}</Text>
                      <Text style={{ fontSize: FONTS.body.size, color: colors.primary, fontWeight: FONTS.h2.weight }}>¥{monthTotal.toFixed(2)}</Text>
                    </View>
                    {/* Sub items: 2x2 grid of platform fees */}
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
              })}
            </ScrollView>
          </View>
        </ModalOverlay>
      )}
      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
      {/* Month picker dropdown — animated spring popover */}
      {showFeeMonthPicker && (
        <>
          {/* Animated backdrop */}
          <Animated.View style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.08)', zIndex: 9998, opacity: pickerAnim }}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => {
                Animated.timing(pickerAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => setShowFeeMonthPicker(false));
              }}
            />
          </Animated.View>
          <Animated.View style={{
            position: 'fixed' as any,
            top: pickerPos.top || '38%',
            left: pickerPos.left || 10,
            zIndex: 9999,
            backgroundColor: colors.surface,
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            paddingVertical: 6,
            width: 140,
            maxHeight: 240,
            overflow: 'scroll' as any,
            opacity: pickerAnim,
            transform: [{ scale: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1], extrapolate: 'clamp' }) }, { translateY: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0], extrapolate: 'clamp' }) }],
          }}>
            <TouchableOpacity
              style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: feeMonth === 'all' ? withAlpha(colors.danger, 0.1) : 'transparent', borderRadius: 8, marginHorizontal: 4 }}
              onPress={() => {
                setFeeMonth('all');
                Animated.timing(pickerAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => setShowFeeMonthPicker(false));
              }}
              activeOpacity={0.6}
            >
              <Text style={{ fontSize: FONTS.sub.size, fontWeight: feeMonth === 'all' ? '700' : '500', color: feeMonth === 'all' ? colors.primary : colors.textMain }}>{t('feeAllMonths')}</Text>
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: colors.secondary, marginHorizontal: 12, marginVertical: 4 }} />
            {[...allFees].filter((f: any) => f.year > 2024 || (f.year === 2024 && f.month >= 5)).sort((a: any, b: any) => (b.year - a.year) || (b.month - a.month)).map((f: any) => {
              const isSel = feeMonth !== 'all' && feeMonth.year === f.year && feeMonth.month === f.month;
              return (
                <TouchableOpacity
                  key={`${f.year}-${f.month}`}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: isSel ? withAlpha(colors.danger, 0.1) : 'transparent', borderRadius: 8, marginHorizontal: 4 }}
                  onPress={() => {
                    setFeeMonth({ year: f.year, month: f.month });
                    Animated.timing(pickerAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => setShowFeeMonthPicker(false));
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={{ fontSize: FONTS.sub.size, fontWeight: isSel ? '700' : '400', color: isSel ? colors.primary : colors.textMain }}>{fmtMonth(f.year, f.month)}</Text>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </>
      )}
      {/* Fee history filter dropdown — animated to match platform fee picker */}
      {showFeeHistoryFilterPicker && (
        <>
          <Animated.View style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.08)', zIndex: 9998, opacity: pickerAnim }}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => {
                Animated.timing(pickerAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => setShowFeeHistoryFilterPicker(false));
              }}
            />
          </Animated.View>
          <Animated.View style={{
            position: 'fixed' as any,
            top: feeHistoryPickerPos.top || '38%',
            left: feeHistoryPickerPos.left || 10,
            zIndex: 9999,
            backgroundColor: colors.surface,
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            paddingVertical: 6,
            width: 140,
            maxHeight: 240,
            overflow: 'scroll' as any,
            opacity: pickerAnim,
            transform: [{ scale: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1], extrapolate: 'clamp' }) }, { translateY: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0], extrapolate: 'clamp' }) }],
          }}>
            <TouchableOpacity
              style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: feeHistoryFilter === 'all' ? withAlpha(colors.danger, 0.1) : 'transparent', borderRadius: 8, marginHorizontal: 4 }}
              onPress={() => {
                setFeeHistoryFilter('all');
                Animated.timing(pickerAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => setShowFeeHistoryFilterPicker(false));
              }}
              activeOpacity={0.6}
            >
              <Text style={{ fontSize: FONTS.sub.size, fontWeight: feeHistoryFilter === 'all' ? '700' : '500', color: feeHistoryFilter === 'all' ? colors.primary : colors.textMain }}>{t('feeAllMonths')}</Text>
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: colors.secondary, marginHorizontal: 12, marginVertical: 4 }} />
            {[...allFees].filter((f: any) => f.year > 2024 || (f.year === 2024 && f.month >= 5)).sort((a: any, b: any) => (b.year - a.year) || (b.month - a.month)).map((f: any) => {
              const isSel = feeHistoryFilter !== 'all' && feeHistoryFilter.year === f.year && feeHistoryFilter.month === f.month;
              return (
                <TouchableOpacity
                  key={`hf-${f.year}-${f.month}`}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: isSel ? withAlpha(colors.danger, 0.1) : 'transparent', borderRadius: 8, marginHorizontal: 4 }}
                  onPress={() => {
                    setFeeHistoryFilter({ year: f.year, month: f.month });
                    Animated.timing(pickerAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => setShowFeeHistoryFilterPicker(false));
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={{ fontSize: FONTS.sub.size, fontWeight: isSel ? '700' : '400', color: isSel ? colors.primary : colors.textMain }}>{fmtMonth(f.year, f.month)}</Text>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </>
      )}

      <DatePickerModal
        visible={showRecDatePicker}
        value={recDate}
        onClose={() => setShowRecDatePicker(false)}
        onSelect={(d) => { setRecDate(d); setRecDateKey(k => k + 1); setRecDateErr(0); }}
        minDate={todayStr()}
        title={t('billDate')}
      />
      <DatePickerModal
        visible={showExpDatePicker}
        value={expDate}
        onClose={() => setShowExpDatePicker(false)}
        onSelect={(d) => { if (d <= todayStr()) { setExpDate(d); setExpDateErr(0); } }}
        minDate={undefined}
        title={t('billDate')}
      />
      <DatePickerModal
        visible={showFeeDatePicker}
        value={feeEntryDate}
        onClose={() => setShowFeeDatePicker(false)}
        onSelect={(d) => { setFeeEntryDate(d); setFeeDateErr(0); }}
        minDate={undefined}
        title={t('entryDate')}
      />
    </View>
  );
}

/* ══════════════════════════════ MODAL OVERLAY ══════════════════════════════ */

function ModalOverlay({ children, onClose }: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const anim = useRef(new Animated.Value(-300)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(anim, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);
  const close = () => {
    Animated.parallel([
      Animated.timing(anim, { toValue: -300, duration: 180, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };
  return (
    <Animated.View style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, justifyContent: 'center', alignItems: 'center', padding: 16, opacity: fade }}>
      <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={close} activeOpacity={1} />
      <Animated.View style={{ transform: [{ translateY: anim }], alignSelf: 'stretch' as any, alignItems: 'center', justifyContent: 'center' }}>{children}</Animated.View>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════ STYLES ═══════════════════════════════════ */
const getSt = (colors: ThemeColors) => StyleSheet.create({
  ...uploadReceiptStyles(colors),
  root: { flex: 1 },

  /* ── Tab Bar ── */
  tabBar: {
    paddingTop: 12, paddingBottom: 8,
    // @ts-ignore — 确保容器透明，让底层背景透出
    backgroundColor: 'transparent',
  },
  tabScroll: {
    paddingHorizontal: 18, gap: 14,
    // @ts-ignore — 确保 ScrollView 内容区透明
    backgroundColor: 'transparent',
  },
  tabCard: {
    // @ts-ignore — 响应式：屏宽 - 左边距18 - 右侧peek 43
    width: 'calc(100vw - 61px)', height: 120,
    // @ts-ignore — 极透磨砂玻璃：渐变色在 render 中动态设置
    backgroundImage: `linear-gradient(90deg, ${withAlpha(colors.primary, 0.22)} 0%, ${withAlpha(colors.info, 0.22)} 100%)`,
    borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 16, paddingVertical: 14,
    justifyContent: 'flex-start',
    // @ts-ignore — CSS scroll-snap
    scrollSnapAlign: 'start',
    // @ts-ignore
    scrollSnapStop: 'always',
    overflow: 'hidden' as const,
    position: 'relative' as const,
    // @ts-ignore — 仅玻璃内边框高光，无外阴影
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
  },
  tabCardActive: {
    // @ts-ignore — 激活：高光更亮（渐变色由 render 动态设置）
    borderColor: 'rgba(255,255,255,0.55)',
    // @ts-ignore — 仅玻璃内边框
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
  },
  tabInner: {
    flex: 1, alignItems: 'stretch',
  },
  tabTitle: {
    fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: 'rgba(255,255,255,0.95)',
    alignSelf: 'flex-start',
    // @ts-ignore
    textShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tabTitleActive: {
    color: colors.surface, fontWeight: FONTS.amount.weight,
    // @ts-ignore
    textShadow: '0 1px 4px rgba(0,0,0,0.15)',
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
    fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: 'rgba(255,255,255,0.70)',
    // @ts-ignore
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  cardFieldVal: {
    fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: 'rgba(255,255,255,0.95)',
    // @ts-ignore
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  totalExpLabel: {
    fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: 'rgba(255,255,255,0.70)',
    textAlign: 'center', marginBottom: 6,
  },
  totalExpVal: {
    fontSize: FONTS.h1.size, fontWeight: FONTS.amount.weight, color: 'rgba(255,255,255,0.95)',
  },
  tabStat: {
    fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, letterSpacing: -0.5,
    color: colors.surface,
    // @ts-ignore
    textShadow: '0 1px 4px rgba(0,0,0,0.15)',
  },

  /* ── Content ── */
  contentScroll: { flex: 1 },
  contentInner: {
    paddingHorizontal: 18, paddingBottom: 150, gap: 0,
  },
  moduleWrap: {
    width: '100%',
  },

  /* ── Content Card (glass) ── */
  card: {
    borderRadius: 14,
    paddingTop: 18, paddingHorizontal: 18, paddingBottom: 12,
    gap: 14,
    backgroundColor: colors.bg,
    borderWidth: 0.5, borderColor: colors.secondary,
    // @ts-ignore
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
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
  inputLabel: { fontSize: FONTS.micro.size, lineHeight: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.secondary,
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
    borderRadius: 10, borderWidth: 1, borderColor: colors.secondary,
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
    backgroundColor: colors.bg, borderRadius: 10,
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
    backgroundColor: colors.surface, borderRadius: 20, width: 320, maxWidth: '100%',
    overflow: 'hidden',
    // @ts-ignore
    ...modalCardAnimation,
    // @ts-ignore
    boxShadow: '0 8px 28px rgba(0,0,0,0.08)',
  },
  modalHeader: {
    backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
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
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 0,
    // @ts-ignore
    display: 'flex', flexDirection: 'column',
    width: '96%', maxWidth: 500,
    // @ts-ignore
    ...modalCardAnimation,
    // @ts-ignore
    boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
  },
});
