import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t, setLang, getLang, langs } from '../i18n';
import { api } from '../api/client';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import Toast from '../components/Toast';
import PartnerScreen from './PartnerScreen';
import ProcurementScreen from './ProcurementScreen';
import ExpenseScreen from './ExpenseScreen';
import ReconHistoryScreen from './ReconHistoryScreen';
import ExpenseHistoryScreen from './ExpenseHistoryScreen';
import DailyRevenueHistory from './DailyRevenueHistory';
import SlideScreen from '../components/SlideScreen';

function DateErrorHint({ trigger, message, colors }: { trigger: number; message: string; colors: any }) {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    if (trigger > 0) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(t);
    } else {
      setShow(false);
    }
  }, [trigger]);
  if (!show) return null;
  return <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'left', marginTop: 2 }}>{message}</Text>;
}
import { modalCardAnimation, modalClose } from '../sharedStyles';

type Tab = 'list' | 'expense' | 'supply' | 'chart' | 'partner';

export default function HomeScreen({ onLogout }: { onLogout: () => void }) {
  const { colors, setTheme, allThemes } = useTheme();
  const [tab, setTabState] = useState<Tab>(() => {
    try { return (localStorage.getItem('active_tab') as Tab) || 'expense'; }
    catch { return 'expense'; }
  });
  const setTab = (t: Tab) => {
    setTabState(t);
    try { localStorage.setItem('active_tab', t); } catch {}
  };
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [chart, setChart] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [procurements, setProcurements] = useState<any[]>([]);
  const [lang, setLangState] = useState(getLang());

  // Add form
  const [txType, setTxType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [note, setNote] = useState('');
  const [showBgModal, setShowBgModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // ── Modal slide-from-top animation ──
  const modalAnim = useRef(new Animated.Value(0)).current;
  const modalFade = useRef(new Animated.Value(0)).current;
  const openModal = (show: () => void) => { show(); modalAnim.setValue(-300); modalFade.setValue(0); Animated.parallel([Animated.spring(modalAnim,{toValue:0,useNativeDriver:true,bounciness:4,speed:14}),Animated.timing(modalFade,{toValue:1,duration:200,useNativeDriver:true})]).start(); };
  const closeModal = (hide: () => void) => { Animated.parallel([Animated.timing(modalAnim,{toValue:-300,duration:180,useNativeDriver:true}),Animated.timing(modalFade,{toValue:0,duration:180,useNativeDriver:true})]).start(()=>hide()); };
  const [showReconHistory, setShowReconHistory] = useState(false);
  const [showExpenseHistory, setShowExpenseHistory] = useState(false);
  const [showDailyHistory, setShowDailyHistory] = useState(false);
  const [last7Records, setLast7Records] = useState<any[]>([]);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [toast, setToast] = useState('');
  const navScaleAnims = useRef([...Array(5)].map(() => new Animated.Value(1))).current;
  const [bgVersion, setBgVersion] = useState(0);
  const [bgImage, setBgImage] = useState(() => {
    try {
      const saved = localStorage.getItem('bg-image');
      return saved || '/img/bg.jpg';
    } catch { return '/img/bg.jpg'; }
  });
  const [bgOpacity, setBgOpacity] = useState(() => {
    try {
      const saved = localStorage.getItem('bg-opacity');
      return saved !== null ? parseFloat(saved) : 0.5;
    } catch { return 0.5; }
  });
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Daily revenue states
  const todayDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const yesterdayDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const dayBeforeDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const [dailyRevs, setDailyRevs] = useState<any[]>([]);
  const [revDate, setRevDate] = useState(todayDateStr());
  const [revDateErr, setRevDateErr] = useState(0);
  const [revDateKey, setRevDateKey] = useState(0);
  const isFuture = (d: string) => d > todayDateStr();
  const [revRevenue, setRevRevenue] = useState('');
  const [revTurnover, setRevTurnover] = useState('');
  const [revJD, setRevJD] = useState('');
  const [revNote, setRevNote] = useState('');
  const [revPage, setRevPage] = useState(1);
  const [revPages, setRevPages] = useState(1);
  const [revYear, setRevYear] = useState(new Date().getFullYear());
  const [revMonth, setRevMonth] = useState(new Date().getMonth() + 1);
  const [revLoading, setRevLoading] = useState(false);
  const [revSaving, setRevSaving] = useState(false);
  const [showRevMonthPicker, setShowRevMonthPicker] = useState(false);
  const [editingRevId, setEditingRevId] = useState<number | null>(null);
  const revPickerRef = useRef<any>(null);
  const revPickerAnim = useRef(new Animated.Value(0)).current;
  const revDateInputRef = useRef<HTMLInputElement>(null);
  const [revPickerPos, setRevPickerPos] = useState({ top: 0, left: 0 });
  const [yesterdayRev, setYesterdayRev] = useState<any>(null);
  const [weekRev, setWeekRev] = useState<any>(null);
  const [revMarkedClosed, setRevMarkedClosed] = useState(false);

  // Quick date helpers
  const td = todayDateStr();
  const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate()-1); return fmtDate(d); };
  const db4Str = () => { const d = new Date(); d.setDate(d.getDate()-2); return fmtDate(d); };
  const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const pickDate = (d: string) => { if (d <= td) setRevDate(d); };

  // Sync uncontrolled date input when revDate changes externally (quick-date pills)
  useEffect(() => {
    if (revDateInputRef.current) revDateInputRef.current.value = revDate;
    setRevDateErr(0);
  }, [revDate]);

  const INCOME_CATS = ['🍜 堂食','🛵 美团外卖','🛵 饿了吗外卖','🎫 美团团购','📦 京东','🔧 其他收入'];
  const EXPENSE_CATS = ['📦 原材料进货','🏠 房租','⚡ 水电煤气','👨‍🍳 人工工资','🔧 设备/工具','🏗️ 装修','📋 培训/证件','🧹 卫生/清洁','🧻 餐具/纸巾','📦 包装/打包','📢 广告/推广','💊 杂项/烟酒','📝 其他'];
  const cats = { income: INCOME_CATS, expense: EXPENSE_CATS };

  // Daily revenue helpers
  const loadDailyRevs = useCallback(async (p = 1, yr?: number, mo?: number) => {
    setRevLoading(true);
    try {
      const r = await api.getDailyRevenue(p, 30, yr, mo);
      setDailyRevs(r.records || []);
      setRevPages(r.pages || 1);
      setRevPage(r.page || 1);
    } catch { setToast(t('toastLoadFailed')); }
    setRevLoading(false);
  }, []);

  useEffect(() => { loadDailyRevs(1, revYear, revMonth); }, [revYear, revMonth]);

  // Load yesterday's revenue for card footers
  useEffect(() => {
    let cancelled = false;
    const yd = yesterdayStr();
    api.getDailyRevenue(1, 1, undefined, undefined, yd).then((r: any) => {
      if (!cancelled) setYesterdayRev(r.records?.[0] || null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load last 30 days aggregated
  useEffect(() => {
    let cancelled = false;
    api.getDailyRevenue(1, 1, undefined, undefined, undefined, 30).then((r: any) => {
      if (!cancelled) setWeekRev(r.totals || null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load last 7 days table
  useEffect(() => {
    let cancelled = false;
    api.getLast7Days().then((r: any) => {
      if (!cancelled) setLast7Records(r.records || []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const submitDailyRev = async () => {
    if (!revTurnover || parseFloat(revTurnover) <= 0) { setToast(t('revTurnover') + ' 不能为空'); return; }
    setRevSaving(true);
    try {
      if (editingRevId) {
        await api.updateDailyRevenue(editingRevId, {
          revenue: parseFloat(revRevenue) || 0,
          turnover: parseFloat(revTurnover) || 0,
          jd_revenue: parseFloat(revJD) || 0,
          note: revNote,
          archived: revMarkedClosed ? 1 : 0,
        });
      } else {
        const r = await api.createDailyRevenue({
          date: revDate,
          revenue: parseFloat(revRevenue) || 0,
          turnover: parseFloat(revTurnover) || 0,
          jd_revenue: parseFloat(revJD) || 0,
          note: revNote,
          archived: revMarkedClosed ? 1 : 0,
        });
        if (r.status === 'error') { setToast(r.message); setRevSaving(false); return; }
      }
      setRevRevenue(''); setRevTurnover(''); setRevJD(''); setRevNote('');
      setEditingRevId(null); setRevDate(todayDateStr());
      setRevMarkedClosed(false);
      loadDailyRevs(1, revYear, revMonth);
      api.getLast7Days().then((r: any) => setLast7Records(r.records || [])).catch(() => {});
    } catch { setToast(t('toastSubmitFailed')); }
    setRevSaving(false);
  };

  const startEdit = (rev: any) => {
    setEditingRevId(rev.id);
    setRevDate(rev.date);
    setRevRevenue(String(rev.revenue || ''));
    setRevTurnover(String(rev.turnover || ''));
    setRevJD(String(rev.jd_revenue || ''));
    setRevNote(rev.note || '');
  };

  const cancelEdit = () => {
    setEditingRevId(null);
    setRevDate(todayDateStr());
    setRevRevenue(''); setRevTurnover(''); setRevJD(''); setRevNote('');
  };

  const deleteDailyRev = async (id: number) => {
    try { await api.deleteDailyRevenue(id); loadDailyRevs(1, revYear, revMonth); }
    catch { setToast(t('toastSubmitFailed')); }
  };

  const fmtDecInput = (s: string) => { s = s.replace(/[^0-9.]/g, ''); return s.startsWith('.') ? '0' + s : s; };
  const toDec2 = (x: any) => String(parseFloat(x || 0).toFixed(2));

  const MONTHS_SHORT = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  const loadData = useCallback(async () => {
    try {
      const s = await api.getSummary();
      setSummary(s);
      const tx = await api.getTransactions(1, 20);
      setTransactions(tx.transactions || []);
      setPages(tx.pages || 1);
      setPage(1);
    } catch { setToast(t('toastLoadFailed')); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load background image — user-specific
  useEffect(() => {
    api.getBackground().then((r: any) => {
      if (r?.url) {
        setBgImage(r.url);
        try { localStorage.setItem('bg-image', r.url); } catch {}
      } else {
        // No custom background — use default
        setBgImage('/img/bg.jpg');
        try { localStorage.removeItem('bg-image'); } catch {}
      }
      // Load opacity from server (overrides localStorage default)
      if (r?.opacity !== null && r?.opacity !== undefined) {
        setBgOpacity(r.opacity);
        try { localStorage.setItem('bg-opacity', String(r.opacity)); } catch {}
      } else {
        // Migration: push localStorage opacity to server if not saved yet
        try {
          const local = localStorage.getItem('bg-opacity');
          if (local !== null) {
            const v = parseFloat(local);
            api.saveBackgroundSettings({ opacity: v }).catch(() => {});
          }
        } catch {}
      }
    }).catch(() => {});
  }, []);

  const loadChart = async () => {
    try { const d = await api.getChart(); setChart(d || []); } catch { setToast(t('toastLoadFailed')); }
  };

  const loadProducts = async () => {
    try { const p = await api.getProducts(); setProducts(p || []); } catch { setToast(t('toastLoadFailed')); }
  };

  const loadProcurements = async () => {
    try { const p = await api.getProcurements(); setProcurements(p || []); } catch { setToast(t('toastLoadFailed')); }
  };

  useEffect(() => {
    if (tab === 'chart') loadChart();
    if (tab === 'supply') { loadProducts(); loadProcurements(); }
  }, [tab]);

  // ── Inject glass-slider CSS ──
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'glass-slider-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .glass-slider {
        -webkit-appearance: none; appearance: none;
        width: 100%; height: 32px; background: transparent; cursor: pointer;
        position: relative; z-index: 2;
      }
      .glass-slider:focus { outline: none; }
      .glass-slider::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 22px; height: 22px; border-radius: 50%;
        background: rgba(255,255,255,0.72);
        backdrop-filter: blur(12px) saturate(180%);
        -webkit-backdrop-filter: blur(12px) saturate(180%);
        border: 1px solid rgba(255,255,255,0.55);
        box-shadow: 0 2px 10px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .glass-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 3px 14px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.04);
      }
      .glass-slider::-webkit-slider-thumb:active {
        transform: scale(1.05);
        background: rgba(255,255,255,0.85);
      }
      .glass-slider::-moz-range-thumb {
        width: 22px; height: 22px; border-radius: 50%;
        background: rgba(255,255,255,0.72);
        backdrop-filter: blur(12px) saturate(180%);
        border: 1px solid rgba(255,255,255,0.55);
        box-shadow: 0 2px 10px rgba(0,0,0,0.10);
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const handleAddTx = async () => {
    if (!amount || !category || !account) return;
    try {
      await api.createTransaction({ type: txType, amount: parseFloat(amount), category, account, note });
      setAmount(''); setCategory(''); setAccount(''); setNote('');
      loadData();
    } catch {
      setToast(t('toastSubmitFailed'));
    }
  };

  const handlePage = async (p: number) => {
    try {
      const tx = await api.getTransactions(p, 20);
      setTransactions(tx.transactions || []);
      setPage(p);
    } catch {
      setToast(t('toastLoadFailed'));
    }
  };

  const handleDeleteTx = async (id: number) => {
    try {
      await api.deleteTransaction(id);
      loadData();
    } catch {
      setToast(t('toastSubmitFailed'));
    }
  };

  const formatDate = (d: string) => (d || '').slice(5, 16);

  const todayStr = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });

  const handleBgUpload = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const r = await api.uploadBackground(file);
      if (r?.url) {
        setBgImage(r.url);
        try { localStorage.setItem('bg-image', r.url); } catch {}
      }
      setBgVersion(v => v + 1);
    } catch (err) { /* ignore */ }
    setUploadingBg(false);
    closeModal(() => setShowBgModal(false));
  };
  const handleBgReset = async () => {
    setUploadingBg(true);
    try {
      await api.resetBackground();
      setBgImage('/img/bg.jpg');
      try { localStorage.removeItem('bg-image'); } catch {}
      setBgVersion(v => v + 1);
    } catch (err) { /* ignore */ }
    setUploadingBg(false);
    closeModal(() => setShowBgModal(false));
  };

  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={[styles.bgLayer, { backgroundImage: `url(${bgImage}?v=${bgVersion})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: bgOpacity } as any]} />

      {/* History screen overlay — renders on top of background, main content hidden */}
      <SlideScreen visible={showExpenseHistory} onClose={() => setShowExpenseHistory(false)}>
        {(onBack) => <ExpenseHistoryScreen onBack={onBack} />}
      </SlideScreen>
      <SlideScreen visible={showDailyHistory} onClose={() => setShowDailyHistory(false)}>
        {(onBack) => <DailyRevenueHistory onBack={onBack} />}
      </SlideScreen>
      <SlideScreen visible={showReconHistory} onClose={() => setShowReconHistory(false)}>
        {(onBack) => <ReconHistoryScreen onBack={onBack} />}
      </SlideScreen>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => openModal(() => setShowBgModal(true))} style={{ marginRight: 8 }}>
              <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight }}>{t('bgSettings')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openModal(() => setShowLogoutModal(true))}>
              <Text style={styles.logoutBtn}>{t('logout')}</Text>
            </TouchableOpacity>
            <View style={styles.langRow}>
              {langs.map(([l, label]) => (
                <TouchableOpacity key={l} onPress={() => { setLang(l, loadData); setLangState(l); }}>
                  <Text style={[styles.langBtn, lang === l && styles.langActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Page content — hidden when history screen is active */}
      {!showExpenseHistory && !showDailyHistory && !showReconHistory && (
      <View style={styles.page}>
        {tab === 'partner' ? (
          <PartnerScreen onBack={() => setTab('list')} />
        ) : tab === 'supply' ? (
          <ProcurementScreen />
        ) : (
          <>
            {/* Underlying tab content */}
            {tab === 'expense' ? (
              <ExpenseScreen onReconHistory={() => setShowReconHistory(true)} onExpenseHistory={() => setShowExpenseHistory(true)} />
            ) : (
              <>
                {/* Tab Content */}
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {tab === 'list' && (
                <View style={{ paddingBottom: 120, paddingTop: 14 }}>
                  {/* ── 每日营收录入卡片 ── */}
                  <View style={styles.revCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.textMain} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M3 3v18h18M7 16l4-8 4 4 4-6" />
                        </Svg>
                        <Text style={styles.revTitle}>{t('dailyRevenue')}</Text>
                      </View>
                      {editingRevId && (
                        <TouchableOpacity onPress={cancelEdit} activeOpacity={0.7}
                          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.bg }}>
                          <Text style={{ fontSize: FONTS.microBold.size, color: colors.textSub, fontWeight: FONTS.microBold.weight }}>✕ 取消</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Quick date pills + date picker */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[{ label: t('revQuickToday'), d: td },
                          { label: t('revQuickYesterday'), d: yesterdayStr() },
                          { label: t('revQuickDB4'), d: db4Str() },
                        ].map(pill => (
                          <TouchableOpacity key={pill.d} onPress={() => pickDate(pill.d)} activeOpacity={0.7}
                            style={{
                              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22,
                              backgroundColor: revDate === pill.d ? colors.primary : colors.bg,
                            }}>
                            <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: revDate === pill.d ? colors.surface : colors.textSub }}>
                              {pill.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={{ position: 'relative' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub }}>
                            {revDate.replace(/-/g, '/')}
                          </Text>
                          <Text style={{ fontSize: FONTS.sub.size, color: colors.textSub }}>📅</Text>
                        </View>
                        <DateErrorHint trigger={revDateErr} message={t('errDateFuture')} colors={colors} />
                      </View>
                    </View>

                    {/* Three input cards */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                      <View style={styles.revInputCard}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}>
                          <Path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                        </Svg>
                        <Text style={styles.revInputCardTitle}>{t('revRevenue')}</Text>
                        <Text style={styles.revInputCardSub}>{t('revRevenueSub')}</Text>
                        <View style={styles.revInputCardInputWrap}>
                          <Text style={styles.revInputCardSymbol}>¥</Text>
                          <TextInput style={styles.revInputCardInput}
                            value={revRevenue} onChangeText={(v) => setRevRevenue(fmtDecInput(v))}
                            keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSub} />
                        </View>
                        <Text style={styles.revInputCardFooter}>
                          {t('revYesterdayLabel')} {yesterdayRev ? `¥${toDec2(yesterdayRev.revenue)}` : t('revYesterdayNA')}
                        </Text>
                      </View>
                      <View style={styles.revInputCard}>
                        <Text style={{ fontSize: FONTS.sub.size, marginBottom: 6 }}>🛒</Text>
                        <Text style={styles.revInputCardTitle}>{t('revTurnover')}</Text>
                        <Text style={styles.revInputCardSub}>{t('revTurnoverSub')}</Text>
                        <View style={styles.revInputCardInputWrap}>
                          <Text style={styles.revInputCardSymbol}>¥</Text>
                          <TextInput style={styles.revInputCardInput}
                            value={revTurnover} onChangeText={(v) => setRevTurnover(fmtDecInput(v))}
                            keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSub} />
                        </View>
                        <Text style={styles.revInputCardFooter}>
                          {t('revYesterdayLabel')} {yesterdayRev ? `¥${toDec2(yesterdayRev.turnover)}` : t('revYesterdayNA')}
                        </Text>
                      </View>
                      <View style={styles.revInputCard}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}>
                          <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
                        </Svg>
                        <Text style={styles.revInputCardTitle}>{t('revJD')}</Text>
                        <Text style={styles.revInputCardSub}>{t('revJDSub')}</Text>
                        <View style={styles.revInputCardInputWrap}>
                          <Text style={styles.revInputCardSymbol}>¥</Text>
                          <TextInput style={styles.revInputCardInput}
                            value={revJD} onChangeText={(v) => setRevJD(fmtDecInput(v))}
                            keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSub} />
                        </View>
                        <Text style={styles.revInputCardFooter}>
                          {t('revYesterdayLabel')} {yesterdayRev && yesterdayRev.jd_revenue > 0 ? `¥${toDec2(yesterdayRev.jd_revenue)}` : t('revYesterdayNA')}
                        </Text>
                      </View>
                    </View>

                    {/* Note */}
                    <TextInput style={styles.revNoteInput}
                      value={revNote} onChangeText={setRevNote}
                      placeholder={t('revNoteHint')} placeholderTextColor={colors.textSub} />

                    {/* Two action buttons */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.revArchiveBtn, { flex: 2 }, revMarkedClosed && styles.revArchiveBtnDone]}
                        onPress={() => setRevMarkedClosed(!revMarkedClosed)}
                        activeOpacity={0.7}>
                        <Text style={[styles.revArchiveText, revMarkedClosed && styles.revArchiveTextDone]}>
                          {revMarkedClosed ? t('revCancelArchive') : t('revMarkArchive')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.revSubmitBtn, { flex: 4 }, (!revTurnover || parseFloat(revTurnover) <= 0 || revSaving) && { opacity: 0.5 }]}
                        onPress={submitDailyRev} disabled={!revTurnover || parseFloat(revTurnover) <= 0 || revSaving}
                        activeOpacity={0.8}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {revSaving ? (
                            <Text style={styles.revSubmitText}>...</Text>
                          ) : (
                            <>
                              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.surface} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <Path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8" />
                              </Svg>
                              <Text style={styles.revSubmitText}>{editingRevId ? t('revEdit') : revDate === todayDateStr() ? t('revSaveToday') : revDate === yesterdayDateStr() ? t('revSaveYesterday') : revDate === dayBeforeDateStr() ? t('revSaveDayBefore') : `储存${revDate.slice(5).replace('-', '')}数据`}</Text>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Last 7 days summary */}
                    <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                      <View style={{ alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, marginBottom: 2 }}>{t('revWeekRevenue')}</Text>
                        <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain }}>¥{weekRev ? toDec2(weekRev.revenue) : '0.00'}</Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, marginBottom: 2 }}>{t('revWeekTurnover')}</Text>
                        <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain }}>¥{weekRev ? toDec2(weekRev.turnover) : '0.00'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, marginBottom: 2 }}>{t('revWeekJD')}</Text>
                        <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain }}>¥{weekRev ? toDec2(weekRev.jd_revenue) : '0.00'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* ── 近7天记录 ── */}
                  <View style={{ marginTop: 20 }}>
                    <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMain} strokeWidth={2} strokeLinecap="round">
                          <Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h6" />
                        </Svg>
                        <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub }}>{t('revHistory')}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => { setShowDailyHistory(true); }}
                        activeOpacity={0.7}
                        style={{ marginLeft: 'auto' }}
                      >
                        <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.primary }}>{t('revHistoryBtn')} →</Text>
                      </TouchableOpacity>
                    </View>

                    {last7Records.length === 0 ? (
                      <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                        <Text style={{ fontSize: FONTS.sub.size, color: colors.textSub }}>...</Text>
                      </View>
                    ) : (
                      last7Records.map((rec: any, i: number) => (
                        <View key={i} style={styles.rev7CardItem}>
                          {/* Top row: date + today tag + status badge */}
                          <View style={styles.rev7CardTop}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.rev7CardDate}>{rec.date}</Text>
                              {rec.date === todayDateStr() && (
                                <View style={styles.rev7TodayTag}>
                                  <Text style={styles.rev7TodayTagText}>{t('today')}</Text>
                                </View>
                              )}
                            </View>
                            <View style={[styles.rev7CardBadge, (rec.status === '未录入' || !rec.recorded_by) ? styles.rev7CardBadgeGap : styles.rev7CardBadgeOk]}>
                              <View style={[styles.rev7CardDot, (rec.status === '未录入' || !rec.recorded_by) ? { backgroundColor: colors.danger } : { backgroundColor: colors.success }]} />
                              <Text style={[styles.rev7CardStatus, (rec.status === '未录入' || !rec.recorded_by) ? { color: colors.danger } : { color: colors.success }]}>
                                {rec.status === '未录入' || !rec.recorded_by ? t('revNotEntered') : t('revEntered')}
                              </Text>
                            </View>
                          </View>

                          {/* Archived badge */}
                          {rec.archived ? (
                            <View style={styles.rev7ArchivedBadge}>
                              <Text style={styles.rev7ArchivedBadgeText}>{t('revMarkArchive')}</Text>
                            </View>
                          ) : null}

                          {/* Amount row: three columns */}
                          <View style={styles.rev7CardAmounts}>
                            <View style={styles.rev7CardAmtCol}>
                              {rec.revenue > 0 ? (
                                <Text style={[styles.rev7CardAmtVal, { color: colors.textMain }]}>¥{toDec2(rec.revenue)}</Text>
                              ) : (
                                <Svg width={24} height={12} viewBox="0 0 24 12" fill="none" stroke={colors.secondary} strokeWidth={2} strokeLinecap="round">
                                  <Path d="M4 6h16" />
                                </Svg>
                              )}
                              <Text style={styles.rev7CardAmtLabel}>{t('revRevenue')}</Text>
                            </View>
                            <View style={styles.rev7CardAmtCol}>
                              {rec.turnover > 0 ? (
                                <Text style={[styles.rev7CardAmtVal, { color: colors.textMain }]}>¥{toDec2(rec.turnover)}</Text>
                              ) : (
                                <Svg width={24} height={12} viewBox="0 0 24 12" fill="none" stroke={colors.secondary} strokeWidth={2} strokeLinecap="round">
                                  <Path d="M4 6h16" />
                                </Svg>
                              )}
                              <Text style={styles.rev7CardAmtLabel}>{t('revTurnover')}</Text>
                            </View>
                            <View style={styles.rev7CardAmtCol}>
                              {rec.jd_revenue > 0 ? (
                                <Text style={[styles.rev7CardAmtVal, { color: colors.textMain }]}>¥{toDec2(rec.jd_revenue)}</Text>
                              ) : (
                                <Svg width={24} height={12} viewBox="0 0 24 12" fill="none" stroke={colors.secondary} strokeWidth={2} strokeLinecap="round">
                                  <Path d="M4 6h16" />
                                </Svg>
                              )}
                              <Text style={styles.rev7CardAmtLabel}>{t('revJD')}</Text>
                            </View>
                          </View>

                          {/* Footer: recorded by */}
                          <View style={styles.rev7CardFooter}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={styles.rev7CardFooterText}>{t('recordedBy')}:</Text>
                              {rec.recorded_by ? (
                                <Text style={styles.rev7CardFooterText}>{rec.recorded_by}</Text>
                              ) : (
                                <Svg width={16} height={8} viewBox="0 0 16 8" fill="none" stroke={colors.secondary} strokeWidth={1.5} strokeLinecap="round">
                                  <Path d="M2 4h12" />
                                </Svg>
                              )}
                            </View>
                          </View>
                          {/* Note */}
                          {rec.note ? (
                            <View style={styles.rev7CardNote}>
                              <Text style={styles.rev7CardNoteText}>{rec.note}</Text>
                            </View>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {tab === 'chart' && (
                <View />
              )}
            </ScrollView>
          </>
        )}

        </>
      )}
    </View>
      )}  {/* end page-content conditional */}

      {/* Background settings modal */}
      {showBgModal && (
        <Animated.View style={[styles.modalOverlay, { opacity: modalFade }]}>
          <Animated.View style={[styles.modalCard, { transform: [{ translateY: modalAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('bgSettings')}</Text>
              <TouchableOpacity onPress={() => closeModal(() => setShowBgModal(false))}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBodyBg}>
              <Text style={styles.modalHint}>{t('bgHint')}</Text>

              {/* ── Theme Picker ── */}
              <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, marginBottom: 10 }}>{t('themePicker') || '主题'}</Text>
                {allThemes.map((theme) => {
                  const isActive = theme.colors.primary === colors.primary;
                  const previewBg = theme.colors.bg;
                  return (
                    <TouchableOpacity
                      key={theme.id}
                      onPress={() => setTheme(theme.id)}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        padding: 12, borderRadius: 12, marginBottom: 8,
                        backgroundColor: isActive ? withAlpha(colors.primary, 0.06) : colors.surface,
                        borderWidth: 1.5,
                        borderColor: isActive ? colors.primary : colors.secondary,
                      }}
                    >
                      {/* Color preview dots */}
                      <View style={{ flexDirection: 'row', gap: 4, marginRight: 12 }}>
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.primary }} />
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: colors.secondary }} />
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.accent }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FONTS.micro.size, fontWeight: isActive ? '700' : '500', color: colors.textSub }}>
                          {theme.nameZh}
                        </Text>
                        <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, marginTop: 1 }}>
                          {theme.description}
                        </Text>
                      </View>
                      {isActive && (
                        <Text style={{ fontSize: FONTS.sub.size, color: colors.primary }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Opacity slider */}
              <View style={{ marginTop: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight }}>{t('opacity')}</Text>
                  <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.primary }}>{Math.round(bgOpacity * 100)}%</Text>
                </View>
                <View style={{ position: 'relative', height: 32, justifyContent: 'center' }}>
                  {/* track background */}
                  <View style={{
                    position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2,
                    backgroundColor: colors.secondary,
                  }} />
                  {/* active track fill */}
                  <View style={{
                    position: 'absolute', left: 0, height: 4, borderRadius: 2,
                    width: `${bgOpacity * 100}%`,
                    backgroundColor: colors.primary,
                  }} />
                  {/* TODO: replace with @react-native-community/slider */}
                </View>
                {/* tick labels */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                  <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub }}>0</Text>
                  <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub }}>50</Text>
                  <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub }}>100</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.bgBtn, styles.bgBtnOutline]}
                  disabled={uploadingBg}
                  onPress={() => fileRef.current?.click()}
                >
                  <Text style={styles.bgBtnOutlineText}>{uploadingBg ? t('uploading') : t('chooseImage')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bgBtn, styles.bgBtnDanger]}
                  disabled={uploadingBg}
                  onPress={handleBgReset}
                >
                  <Text style={styles.bgBtnDangerText}>{t('resetDefault')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <Animated.View style={[styles.modalOverlay, { opacity: modalFade }]}>
          <Animated.View style={[styles.modalCard, { transform: [{ translateY: modalAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('logout')}</Text>
              <TouchableOpacity onPress={() => closeModal(() => setShowLogoutModal(false))}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 24, alignItems: 'center', gap: 18 }}>
              <Text style={{ fontSize: FONTS.body.size, color: colors.textMain, textAlign: 'center' }}>
                {t('logoutConfirm') || '确定要退出登录吗？'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.secondary }}
                  onPress={() => closeModal(() => setShowLogoutModal(false))}
                >
                  <Text style={{ fontSize: FONTS.sub.size, color: colors.textSub, fontWeight: FONTS.sub.weight }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.primary }}
                  onPress={async () => { await api.logout(); try { localStorage.removeItem('active_tab'); } catch {} onLogout(); }}
                >
                  <Text style={{ fontSize: FONTS.subBold.size, color: colors.surface, fontWeight: FONTS.subBold.weight }}>{t('confirmLogout') || '确定退出'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {([
          { id: 'expense', icon: NavIconAdd },
          { id: 'list', icon: NavIconList },
          { id: 'supply', icon: NavIconSupply },
          { id: 'chart', icon: NavIconChart },
          { id: 'partner', icon: NavIconPartner },
        ] as const).map(({ id, icon: Icon }, i) => (
          <TouchableOpacity
            key={id}
            style={[styles.navItem, (id === 'partner' ? tab === 'partner' : tab === id) && styles.navItemActive]}
            onPress={() => {
              Animated.sequence([
                Animated.spring(navScaleAnims[i], { toValue: 0.85, useNativeDriver: false, speed: 30, bounciness: 6 }),
                Animated.spring(navScaleAnims[i], { toValue: 1, useNativeDriver: false, speed: 20, bounciness: 14 }),
              ]).start();
              setTab(id as Tab);
              setShowReconHistory(false);
              setShowExpenseHistory(false);
              setShowDailyHistory(false);
            }}
          >
            <Animated.View style={{ transform: [{ scale: navScaleAnims[i] }] }}>
              <Icon active={id === 'partner' ? tab === 'partner' : tab === id} colors={colors} />
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>
      {/* TODO: replace with expo-image-picker */
      }
      <View style={{ display: 'none' }} ref={fileRef as any} />
      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

/* ===== NAV SVG ICONS ===== */

function NavIconList({ active, colors }: { active: boolean; colors: ThemeColors }) {
  const c = active ? colors.textMain : colors.textSub;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round">
      <Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <Path d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      <Path d="M9 12h6M9 16h6" />
    </Svg>
  );
}

function NavIconAdd({ active, colors }: { active: boolean; colors: ThemeColors }) {
  const c = active ? colors.textMain : colors.textSub;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function NavIconSupply({ active, colors }: { active: boolean; colors: ThemeColors }) {
  const c = active ? colors.textMain : colors.textSub;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <Path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </Svg>
  );
}

function NavIconChart({ active, colors }: { active: boolean; colors: ThemeColors }) {
  const c = active ? colors.textMain : colors.textSub;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 3v18h18" />
      <Path d="M7 16l4-8 4 4 4-6" />
    </Svg>
  );
}

function NavIconPartner({ active, colors }: { active: boolean; colors: ThemeColors }) {
  const c = active ? colors.textMain : colors.textSub;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <Path d="M12 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </Svg>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  bgLayer: {
    position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
  },
  // Header — frosted glass, same as sub-screen headers
  header: {
    position: 'relative' as const, zIndex: 101,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: withAlpha(colors.bg, 0.55),
    // @ts-ignore - web-only
    backdropFilter: 'saturate(200%) blur(30px)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerInner: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: colors.textMain },
  // 8600: color:#8C8583 font-size:13px
  date: { color: colors.textSub, fontSize: FONTS.sub.size },
  logoutBtn: { fontSize: FONTS.micro.size, color: colors.danger, fontWeight: FONTS.micro.weight },
  langRow: { flexDirection: 'row', gap: 4 },
  langBtn: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  langActive: { color: colors.primary, backgroundColor: withAlpha(colors.danger, 0.1), fontWeight: FONTS.microBold.weight },
  // Page — 8600: padding:0 16px 110px, max-width:520px, margin:0 auto
  page: { flex: 1, paddingHorizontal: 16, paddingBottom: 12, maxWidth: 520, alignSelf: 'center', width: '100%' },
  // Stats — 8600: grid-cols-4
  statsRow: { flexDirection: 'row', marginBottom: 20 },
  statItem: { flex: 1 },
  // 8600: stat-label font-size:11px color:#8C8583 font-weight:500
  statLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, marginBottom: 4 },
  // 8600: stat-num font-size:28px font-weight:700
  statNum: { fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, lineHeight: 28 },
  // 8600: text-xs color:#EAE5E0
  statSub: { fontSize: FONTS.micro.size, color: colors.textSub, marginTop: 2 },
  // Tab bar — 8600: display:flex border-bottom
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.secondary, marginBottom: 16 },
  // 8600: tab padding:10px font-size:12px color:#8C8583
  tabItem: { paddingVertical: 10, paddingHorizontal: 0, marginRight: 0, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabActive: { borderBottomColor: colors.textMain },
  tabItemText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub },
  tabActiveText: { color: colors.textMain },
  // Content
  content: { flex: 1 },
  // Transaction row — 8600: tx-row
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bg },
  txDot: { width: 7, height: 7, borderRadius: 4 },
  txCat: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight },
  txNote: { fontSize: FONTS.micro.size, color: colors.textSub },
  txAmt: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },
  txDate: { fontSize: FONTS.micro.size, color: colors.textSub, width: 70 },
  txDel: { fontSize: FONTS.sub.size, color: colors.textSub, padding: 4 },
  // Pagination
  pageRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  pageBtn: { fontSize: FONTS.micro.size, color: colors.textSub, paddingHorizontal: 10, paddingVertical: 4 },
  pageBtnActive: { color: colors.textMain, fontWeight: FONTS.microBold.weight },
  // Add form — 8600 style
  addForm: { paddingTop: 4 },
  typeToggle: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.secondary, backgroundColor: colors.surface, alignItems: 'center' },
  typeBtnInc: { borderColor: colors.success, backgroundColor: withAlpha(colors.success, 0.1) },
  typeBtnExp: { borderColor: colors.danger, backgroundColor: withAlpha(colors.danger, 0.1) },
  typeBtnText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub },
  typeBtnIncText: { color: colors.success },
  typeBtnExpText: { color: colors.danger },
  addInput: { width: '100%', paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.secondary, borderRadius: 8, fontSize: FONTS.sub.size, backgroundColor: colors.surface, color: colors.textSub, marginBottom: 8, fontFamily: undefined },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  catBtn: { fontSize: FONTS.micro.size, color: colors.textSub, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.secondary },
  catBtnActive: { color: colors.primary, borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.03) },
  saveBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.textMain, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: 8 },
  saveBtnText: { color: colors.surface, fontSize: FONTS.amount.size },
  // Supply
  sectionTitle: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub, paddingVertical: 10 },
  supplyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.secondary },
  supplyName: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, flex: 1 },
  supplyPrice: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub },
  // Chart
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  barLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, width: 36, textAlign: 'right' },
  barWrap: { flex: 1, height: 16, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', flexDirection: 'row' },
  barIncome: { backgroundColor: colors.success, height: '100%' },
  barExpense: { backgroundColor: colors.danger, opacity: 0.7, height: '100%' },
  barVal: { fontSize: FONTS.micro.size, color: colors.textSub, width: 90 },
  // Bottom Nav — glass pill, icons only, 80% transparent
  bottomNav: {
    position: 'fixed' as any,
    bottom: 16,
    left: '50%',
    // @ts-ignore - web-only translateX
    transform: 'translateX(-50%)',
    width: '80%',
    maxWidth: 420,
    backgroundColor: withAlpha(colors.surface, 0.30),
    // @ts-ignore - web-only
    backdropFilter: 'saturate(180%) blur(24px)',
    borderRadius: 28,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    // @ts-ignore - web-only boxShadow
    boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(255,255,255,0.3) inset',
    borderWidth: 0.5,
    borderColor: withAlpha(colors.surface, 0.25),
    zIndex: 100,
  },
  navItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    height: 44, borderRadius: 22, marginHorizontal: 2,
  },
  navItemActive: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  navLabel: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub, letterSpacing: 0.3 },
  navLabelActive: { color: colors.textMain },
  // Background settings modal
  modalOverlay: {
    position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 200, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    backgroundColor: colors.surface, borderRadius: 16, width: 340, maxWidth: '90%',
    overflow: 'hidden' as const,
    // @ts-ignore
    ...modalCardAnimation,
  },
  modalHeader: {
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalTitle: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.surface },
  modalClose: { ...modalClose, },
  modalBodyBg: { padding: 24 },
  modalHint: { fontSize: FONTS.micro.size, color: colors.textSub, textAlign: 'center' },
  bgBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  bgBtnOutline: { borderWidth: 1, borderColor: colors.primary },
  bgBtnOutlineText: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },
  bgBtnDanger: { borderWidth: 1, borderColor: withAlpha(colors.primary, 0.2), backgroundColor: withAlpha(colors.primary, 0.06) },
  bgBtnDangerText: { fontSize: FONTS.micro.size, color: colors.primary, fontWeight: FONTS.micro.weight },

  /* ── Daily Revenue (每日营收) ── */
  revCard: {
    backgroundColor: colors.bg, borderRadius: 14,
    borderWidth: 0.5, borderColor: colors.secondary,
    padding: 18,
    // @ts-ignore
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  },
  revTitle: { fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: colors.textMain },
  // Three input cards
  revInputCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 10,
    padding: 10, borderWidth: 0.5, borderColor: colors.secondary,
  },
  revInputCardTitle: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub, marginBottom: 2 },
  revInputCardSub: { fontSize: FONTS.micro.size, color: colors.textSub, marginBottom: 8 },
  revInputCardInputWrap: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 },
  revInputCardSymbol: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub, marginRight: 2, marginBottom: 1 },
  revInputCardInput: { flex: 1, fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: colors.textMain, padding: 0, outline: 'none' },
  revInputCardFooter: { fontSize: FONTS.micro.size, color: colors.textSub },
  revNoteInput: {
    fontSize: FONTS.sub.size, color: colors.textSub, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.secondary,
    marginBottom: 14, outline: 'none',
  },
  revSubmitBtn: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
   },
  revSubmitText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.surface },
  revArchiveBtn: {
    backgroundColor: colors.secondary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', flex: 1,
  },
  revArchiveBtnDone: { backgroundColor: withAlpha(colors.primary, 0.1) },
  revArchiveText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub },
  revArchiveTextDone: { color: colors.primary },
  // 7-day card items — same card style as history page
  rev7CardItem: {
    backgroundColor: colors.surface, borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1, borderColor: colors.secondary,
    // @ts-ignore
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    gap: 12,
  },
  rev7CardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  rev7CardDate: { fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: colors.textMain },
  rev7TodayTag: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    backgroundColor: withAlpha(colors.success, 0.1),
  },
  rev7TodayTagText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.success },
  rev7CardBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 5,
  },
  rev7CardBadgeGap: { backgroundColor: withAlpha(colors.danger, 0.1) },
  rev7CardBadgeOk: { backgroundColor: withAlpha(colors.success, 0.1) },
  rev7CardDot: { width: 6, height: 6, borderRadius: 3 },
  rev7CardStatus: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight },
  rev7CardAmounts: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 8,
    backgroundColor: colors.surface, borderRadius: 8,
  },
  rev7CardAmtCol: { alignItems: 'center', flex: 1, gap: 4 },
  rev7CardAmtVal: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight },
  rev7CardAmtLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },
  rev7CardFooter: {
    borderTopWidth: 0.5, borderTopColor: colors.secondary,
    paddingTop: 8,
  },
  rev7CardFooterText: { fontSize: FONTS.micro.size, color: colors.textSub },

  /* Archived badge */
  rev7ArchivedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    backgroundColor: withAlpha(colors.danger, 0.1),
  },
  rev7ArchivedBadgeText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.danger },

  /* Note display */
  rev7CardNote: { borderTopWidth: 0.5, borderTopColor: colors.secondary, paddingTop: 8, marginTop: 4 },
  rev7CardNoteText: { fontSize: FONTS.micro.size, color: colors.textSub, lineHeight: 16 },
} as any);