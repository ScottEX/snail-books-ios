import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput,
  Animated, ImageBackground, Image, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { t, getLang, langs, useLang } from '../i18n';
import { api, resolveAssetUrl } from '../api/client';
import { useTheme, withAlpha, ThemeColors, DEFAULT_THEME_ID } from '../theme';
import { FONTS } from '../theme';
import { getCurrentUserId } from '../utils/storage';
import { useServerDate } from '../hooks/useServerDate';
import { fmtDecInput, toDec2 } from '../utils/numbers';
import Toast from '../components/Toast';
import DatePickerModal from '../components/DatePickerModal';
import ModalOverlay from '../components/ModalOverlay';
import ThemePickerModal from '../components/ThemePickerModal';
import SlideScreen from '../components/SlideScreen';
import PartnerScreen from './PartnerScreen';
import ProcurementScreen from './ProcurementScreen';
import ExpenseScreen from './ExpenseScreen';
import ReconHistoryScreen from './ReconHistoryScreen';
import ExpenseHistoryScreen from './ExpenseHistoryScreen';
import DailyRevenueHistory from './DailyRevenueHistory';
import ProfileScreen from './ProfileScreen';
import UserManagementScreen from './UserManagementScreen';
import UserDetailScreen from './UserDetailScreen';
import InvoiceScreen from './InvoiceScreen';
import ProcurementDetailScreen from './ProcurementDetailScreen';
import ExpenseDetailScreen from './ExpenseDetailScreen';
import PdfPreviewPage from './PdfPreviewPage';
import ChartsPanel from './ChartsPanel';
import { modalCardAnimation, modalClose } from '../sharedStyles';
import { toDec2Comma } from '../utils/numbers';
import { fmtAmtFull } from '../utils/format';
import NumberTicker from '../components/NumberTicker';

const BG_IMAGE = require('../../assets/img/bg.jpg');
const LOGO_IMAGE = require('../../assets/img/logo.jpg');

type Tab = 'list' | 'expense' | 'supply' | 'chart' | 'partner';

// ── Sub-component: red error hint under date input ──
function DateErrorHint({ trigger, message, colors }: { trigger: number; message: string; colors: ThemeColors }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger > 0) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(t);
    } else { setShow(false); }
  }, [trigger]);
  if (!show) return null;
  return <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'left', marginTop: 2 }}>{message}</Text>;
}

export default function HomeScreen({ onLogout }: { onLogout: () => void }) {
  const { colors, setTheme, allThemes } = useTheme();
  const mo = getMo(colors);
  // Web's headerColor: when the bg image is fully opaque, the text
  // sits on the image alone → white. When the bg has any transparency
  // (≤ 0.99), the bgOverlay is partial and the image darkens, so
  // text flips to black for legibility.
  // Computed BEFORE the bgOpacity state declaration so the styles
  // closure can read it.
  const insets = useSafeAreaInsets();
  const sd = useServerDate();

  // ── Tab state (persisted) ──
  const [tab, setTabState] = useState<Tab>(() => {
    try { return (localStorage.getItem('active_tab') as Tab) || 'expense'; } catch { return 'expense'; }
  });
  const [partnerRefreshKey, setPartnerRefreshKey] = useState(0);
  const setTab = (t: Tab) => {
    setTabState(t);
    try { localStorage.setItem('active_tab', t); } catch {}
    if (t === 'partner') setPartnerRefreshKey(k => k + 1);
  };

  // ── User / lang ──
  // Use useLang() so the lang state and t() output stay in sync within a
  // single React render — the legacy setLang + setLangState pair updates
  // globalThis.curLang synchronously but doesn't trigger a React re-render
  // on its own, causing a brief flash of mismatched state.
  const { lang, setLang } = useLang();
  const usr = useMemo(() => { try { return localStorage.getItem('user') || '用户'; } catch { return '用户'; } }, []);
  // Per-user avatar for the header. Mirrors web's headerLeft avatar.
  // Mirrors LoginScreen's debounced fetch so the API isn't hit on every
  // keystroke / re-render. Uses credentials: 'omit' so a missing user
  // doesn't trigger session_expired.
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const avatarReqId = useRef(0);
  const loadAvatar = useCallback(() => {
    const uid = getCurrentUserId();
    if (!uid) { setAvatarUrl(''); return; }
    const reqId = ++avatarReqId.current;
    setTimeout(async () => {
      try {
        const url = await api.getUserAvatar(uid);
        if (reqId === avatarReqId.current && url) setAvatarUrl(url);
      } catch {}
    }, 300);
  }, []);
  useEffect(() => { loadAvatar(); }, [loadAvatar]);

  // ── Background image (mirrors web's two-layer approach) ──
  // The default bg.jpg is ALWAYS rendered in the base layer so the
  // page never flashes empty if the per-user fetch is slow or fails.
  // The custom user bg is rendered on top (fading in once loaded) and
  // replaced via bgVersion to bust any image cache on upload/reset.
  // Opacity is per-user (`bg-opacity-{userId}`) so two users sharing
  // the same device don't trample each other's preference.
  const DEFAULT_BG = BG_IMAGE; // web uses '/img/bg.jpg?v=2'; iOS uses the bundled asset
  const [bgImageUri, setBgImageUri] = useState<string>(DEFAULT_BG);
  const [bgVersion, setBgVersion] = useState(0);
  const [bgUploading, setBgUploading] = useState(false);
  const opacityKey = useMemo(() => {
    const uid = getCurrentUserId();
    return uid ? `bg-opacity-${uid}` : 'bg-opacity';
  }, []);
  useEffect(() => {
    // Fetch the persisted custom background URL from the backend.
    // Falls back to localStorage cache (instant) → default asset.
    try {
      const cached = localStorage.getItem('bg-image');
      if (cached) {
        const resolved = resolveAssetUrl(cached);
        if (resolved) setBgImageUri(resolved);
      }
    } catch {}
    api.getBackground()
      .then((r: any) => {
        if (r?.url) {
          // Server returns paths like '/uploads/abc.jpg' which RN
          // can't load as-is. resolveAssetUrl prepends the API base.
          const resolved = resolveAssetUrl(r.url) || DEFAULT_BG;
          setBgImageUri(resolved);
          try { localStorage.setItem('bg-image', resolved); } catch {}
        } else {
          setBgImageUri(DEFAULT_BG);
          try { localStorage.removeItem('bg-image'); } catch {}
        }
        // Server opacity wins (per-user)
        if (r?.opacity !== null && r?.opacity !== undefined) {
          setBgOpacity(r.opacity);
          try { localStorage.setItem(opacityKey, String(r.opacity)); } catch {}
        }
      })
      .catch(() => { /* keep cached/default */ });
  }, [opacityKey]);
  // Cross-screen bg sync (web uses a window event; iOS uses the same
  // global event-bus pattern via the api module).
  // NOTE: RN's `window` shim exists but doesn't implement
  // addEventListener, so we have to feature-test it explicitly —
  // just `typeof window !== 'undefined'` isn't enough.
  useEffect(() => {
    const onBgChanged = (e: any) => {
      const url = e?.detail?.url;
      if (typeof url === 'string') {
        const resolved = resolveAssetUrl(url) || DEFAULT_BG;
        setBgImageUri(resolved);
        setBgVersion((v) => v + 1);
      }
    };
    const onThemeReset = () => setShowBgModal(false);
    // Also poll localStorage flag (fallback when window events don't fire in RN)
    let pollTimer: any = null;
    try {
      const lastReset = localStorage.getItem('__theme_reset_ts');
      if (lastReset && (Date.now() - parseInt(lastReset, 10) < 30000)) {
        setShowBgModal(false);
        localStorage.removeItem('__theme_reset_ts');
      }
    } catch {}
    const w: any = typeof window !== 'undefined' ? window : undefined;
    if (w && typeof w.addEventListener === 'function') {
      w.addEventListener('bg-changed', onBgChanged);
      w.addEventListener('theme-reset', onThemeReset);
    }
    // Always poll localStorage flags as fallback (window events are unreliable in RN)
    let lastTs = 0;
    let lastBgTs = 0;
    pollTimer = setInterval(() => {
      try {
        const ts = localStorage.getItem('__theme_reset_ts');
        if (ts) {
          const t = parseInt(ts, 10);
          if (t !== lastTs && (Date.now() - t < 30000)) {
            lastTs = t;
            setShowBgModal(false);
            setBgImageUri(DEFAULT_BG);
            setBgVersion((v) => v + 1);
            setBgOpacity(1);
            try {
              const uid = getCurrentUserId();
              localStorage.setItem(uid ? `bg-opacity-${uid}` : 'bg-opacity', '1');
              api.saveBackgroundSettings({ opacity: 1 }).catch(() => {});
              localStorage.removeItem('__theme_reset_ts');
            } catch {}
          }
        }
        // Poll for background image changes from other screens (ProfileScreen)
        const bgTs = localStorage.getItem('__bg_changed_ts');
        if (bgTs) {
          const bt = parseInt(bgTs, 10);
          if (bt !== lastBgTs && (Date.now() - bt < 30000)) {
            lastBgTs = bt;
            const cached = localStorage.getItem('bg-image');
            if (cached) {
              const resolved = resolveAssetUrl(cached) || DEFAULT_BG;
              setBgImageUri(resolved);
              setBgVersion((v) => v + 1);
            }
            localStorage.removeItem('__bg_changed_ts');
          }
        }
      } catch {}
    }, 2000);
    return () => {
      if (w && typeof w.removeEventListener === 'function') {
        w.removeEventListener('bg-changed', onBgChanged);
        w.removeEventListener('theme-reset', onThemeReset);
      }
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    try {
      const uid = getCurrentUserId();
      const key = uid ? `bg-opacity-${uid}` : 'bg-opacity';
      const s = localStorage.getItem(key);
      return s !== null ? parseFloat(s) : 1;
    } catch { return 1; }
  });
  // Web's headerColor: when the bg image is fully opaque the text
  // sits on the image alone → white. When the bg has any transparency
  // (≤ 0.99), the bgOverlay is partial and the image darkens, so
  // text flips to black for legibility.
  const headerColor = bgOpacity === 1 ? '#FFFFFF' : '#000000';
  const setBgOpacityPersist = (v: number) => {
    setBgOpacity(v);
    try { localStorage.setItem(opacityKey, String(v)); } catch {}
    api.saveBackgroundSettings({ opacity: v }).catch(() => {});
  };

  // ── Modal state ──
  const [showBgModal, setShowBgModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const modalAnim = useRef(new Animated.Value(0)).current;
  const modalFade = useRef(new Animated.Value(0)).current;
  const openModal = (show: () => void) => { show(); modalAnim.setValue(-300); modalFade.setValue(0); Animated.parallel([Animated.spring(modalAnim,{toValue:0,useNativeDriver:true,bounciness:4,speed:14}),Animated.timing(modalFade,{toValue:1,duration:200,useNativeDriver:true})]).start(); };
  const closeModal = (hide: () => void) => { Animated.parallel([Animated.timing(modalAnim,{toValue:-300,duration:180,useNativeDriver:true}),Animated.timing(modalFade,{toValue:0,duration:180,useNativeDriver:true})]).start(()=>hide()); };

  // ── Sub-screen slide state ──
  const [showReconHistory, setShowReconHistory] = useState(false);
  const [showExpenseHistory, setShowExpenseHistory] = useState(false);
  const [showDailyHistory, setShowDailyHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [showUserDetail, setShowUserDetail] = useState<any | null>(null);
  const [showInvoice, setShowInvoice] = useState<{ filterBatchId?: number | null } | null>(null);
  const [showProcurementDetail, setShowProcurementDetail] = useState<any | null>(null);
  const [showExpenseDetail, setShowExpenseDetail] = useState<any | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState<{ id: number; number: number } | null>(null);
  const isHome = useMemo(() =>
    !showExpenseHistory && !showDailyHistory && !showReconHistory && !showProfile &&
    !showUserMgmt && !showUserDetail && !showInvoice && !showProcurementDetail &&
    !showExpenseDetail && !showPdfPreview,
    [showExpenseHistory, showDailyHistory, showReconHistory, showProfile,
     showUserMgmt, showUserDetail, showInvoice, showProcurementDetail,
     showExpenseDetail, showPdfPreview]
  );
  const [expenseRefreshKey, setExpenseRefreshKey] = useState(0);
  const [userRefreshKey, setUserRefreshKey] = useState(0);
  const [reviewedUserId, setReviewedUserId] = useState<number | null>(null);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  // ── Data state for chart / supply / partner ──
  const [chartMonthly, setChartMonthly] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [procurements, setProcurements] = useState<any[]>([]);
  const [businessSummary, setBusinessSummary] = useState<{
    cash_on_hand?: number;
    cumulative_revenue?: number;
    cumulative_expense?: number;
    actual_received?: number;
    receivable?: number;
    discount?: number;
    today_expense_amount?: number;
    month_expense_amount?: number;
    yesterday_income?: number;
    yesterday_expense?: number;
    yesterday_profit?: number;
  }>({});
  const navScaleAnims = useRef([...Array(5)].map(() => new Animated.Value(1))).current;

  // ── Daily revenue state ──
  const [revDate, setRevDate] = useState('');
  useEffect(() => { if (sd.ready && revDate === '') setRevDate(sd.today); }, [sd.ready, sd.today, revDate]);
  const [revDateErr, setRevDateErr] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [revRevenue, setRevRevenue] = useState('');
  const [revTurnover, setRevTurnover] = useState('');
  const [revJD, setRevJD] = useState('');
  const [revNote, setRevNote] = useState('');
  const revYear = sd.year;
  const revMonth = sd.month;
  const [revSaving, setRevSaving] = useState(false);
  const [editingRevId, setEditingRevId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [last7Records, setLast7Records] = useState<any[]>([]);
  const [yesterdayRev, setYesterdayRev] = useState<any>(null);
  const [weekRev, setWeekRev] = useState<any>(null);
  const [revMarkedClosed, setRevMarkedClosed] = useState(false);
  const [toast, setToast] = useState('');

  const td = sd.today;
  const loadRevForDate = (d: string) => {
    if (d > td) return;
    setRevDate(d);
    api.getDailyRevenue(1, 1, undefined, undefined, d)
      .then((r: any) => {
        const rec = r?.records?.[0];
        if (rec) {
          setEditingRevId(rec.id);
          setRevRevenue(String(rec.revenue || ''));
          setRevTurnover(String(rec.turnover || ''));
          setRevJD(String(rec.jd_revenue || ''));
          setRevNote(rec.note || '');
          setRevMarkedClosed(!!rec.archived);
        } else {
          setEditingRevId(null);
          setRevRevenue('');
          setRevTurnover('');
          setRevJD('');
          setRevNote('');
          setRevMarkedClosed(false);
        }
      })
      .catch(() => {});
  };

  // ── Data fetching (matches web) ──
  const loadLast7 = useCallback(async () => {
    try {
      const r: any = await api.getLast7Days();
      setLast7Records(r.records || []);
    } catch { setToast(t('toastLoadFailed')); }
  }, []);
  const loadYesterday = useCallback(async () => {
    try {
      const yd = sd.yesterday;
      const r: any = await api.getDailyRevenue(1, 1, undefined, undefined, yd);
      setYesterdayRev(r.records?.[0] || null);
    } catch {}
  }, [sd.yesterday]);
  const loadWeekTotals = useCallback(async () => {
    try {
      const r: any = await api.getDailyRevenue(1, 1, undefined, undefined, undefined, 30);
      setWeekRev(r.totals || null);
    } catch {}
  }, []);

  // ── Lazy load on tab change (chart / supply) ──
  const loadChartMonthly = useCallback(async () => {
    try { const d: any = await api.getChartMonthly(); setChartMonthly(d); } catch { setToast(t('toastLoadFailed')); }
  }, []);
  const loadBusinessSummary = useCallback(async () => {
    try {
      const r: any = await api.getBusinessSummary();
      setBusinessSummary(r || {});
    } catch { /* non-fatal: chart tab still works without summary */ }
  }, []);
  const loadProducts = useCallback(async () => {
    try { const p: any = await api.getProducts(); setProducts(p || []); } catch { setToast(t('toastLoadFailed')); }
  }, []);
  const loadProcurements = useCallback(async () => {
    try { const p: any = await api.getProcurements(); setProcurements(p || []); } catch { setToast(t('toastLoadFailed')); }
  }, []);

  useEffect(() => { loadLast7(); loadYesterday(); loadWeekTotals(); loadBusinessSummary(); }, [loadLast7, loadYesterday, loadWeekTotals, loadBusinessSummary]);

  useEffect(() => {
    if (tab === 'list') { loadLast7(); loadYesterday(); loadWeekTotals(); }
  }, [tab, loadLast7, loadYesterday, loadWeekTotals]);

  useEffect(() => {
    if (tab === 'chart') { loadChartMonthly(); loadBusinessSummary(); }
    if (tab === 'supply') { loadProducts(); loadProcurements(); }
  }, [tab, loadChartMonthly, loadBusinessSummary, loadProducts, loadProcurements]);

  // Check admin status (for User Management nav). Non-blocking — failure just means non-admin.
  useEffect(() => {
    api.admin.check().then((r: any) => {
      if (r && (r.is_admin === true || r.admin === true)) setIsAdmin(true);
    }).catch(() => {});
  }, []);

  // ── Daily revenue submit ──
  const submitDailyRev = async () => {
    const isClosed = revMarkedClosed;
    if (!isClosed && (!revTurnover || parseFloat(revTurnover) <= 0)) {
      setToast(t('revTurnover') + ' 不能为空');
      return;
    }
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
        if (r?.status === 'error') {
          setToast(r.message);
          setRevSaving(false);
          return;
        }
      }
      setRevRevenue('');
      setRevTurnover('');
      setRevJD('');
      setRevNote('');
      setEditingRevId(null);
      setRevDate(sd.today);
      setRevMarkedClosed(false);
      await loadLast7();
      loadYesterday();
      loadWeekTotals();
    } catch (e: any) { setToast(t('toastSubmitFailed') || e?.message); }
    setRevSaving(false);
  };
  const styles = useMemo(() => getStyles(colors, headerColor), [colors, headerColor]);
  const switchLang = (l: string) => {
    setLang(l);
    // Refetch any API-sourced labels that were captured at load time
    // (recorded_by, etc.) so they pick up the new language.
    loadLast7();
    loadYesterday();
    loadWeekTotals();
  };

  // ── Date label formatter (localized) ──
  const fmtDateLabel = (s: string) => {
    const l = getLang();
    const [y, m, d] = s.split('-');
    if (l === 'zh-TW') return `${y}年${m}月${d}日`;
    return `${y}年${m}月${d}日`;
  };

  return (
    <View style={styles.bg}>
      {/* Two-layer background (mirrors web). Base layer = bundled
          bg.jpg, always at bgOpacity. Top layer = the user's custom
          bg (or base if none set), fading in once available. bgVersion
          is appended as a cache-buster so an upload / reset forces
          a fresh fetch. */}
      <ImageBackground
        source={BG_IMAGE}
        style={[styles.bgLayer, { opacity: bgOpacity }]}
        resizeMode="cover"
      />
      <ImageBackground
        source={bgImageUri !== DEFAULT_BG ? { uri: `${bgImageUri}?v=${bgVersion}` } : BG_IMAGE}
        style={[styles.bgLayer, { opacity: bgImageUri !== DEFAULT_BG ? bgOpacity : 0 }]}
        resizeMode="cover"
      />
      <View style={[styles.bgOverlay, { opacity: bgOpacity }]} />

      {/* History slide-overs */}
      <SlideScreen visible={showExpenseHistory} onClose={() => setShowExpenseHistory(false)}>
        {(onBack) => <ExpenseHistoryScreen onBack={onBack} onExpDetail={(e: any) => setShowExpenseDetail(e)} onInvoice={(batchId) => setShowInvoice({ filterBatchId: batchId })} />}
      </SlideScreen>
      <SlideScreen visible={showDailyHistory} onClose={() => setShowDailyHistory(false)}>
        {(onBack) => <DailyRevenueHistory onBack={onBack} />}
      </SlideScreen>
      <SlideScreen visible={showReconHistory} onClose={() => setShowReconHistory(false)}>
        {(onBack) => <ReconHistoryScreen onBack={onBack} />}
      </SlideScreen>

      {/* Profile / Invoice / User Management slide-overs (full-page sub-screens) */}
      <SlideScreen visible={showProfile} onClose={() => setShowProfile(false)} stackIndex={0}>
        {(onBack) => (
          <ProfileScreen
            onBack={onBack}
            onLogout={onLogout}
            onAvatarChange={loadAvatar}
            onManageUsers={() => { setTimeout(() => setShowUserMgmt(true), 250); }}
            refreshKey={profileRefreshKey}
          />
        )}
      </SlideScreen>
      <SlideScreen visible={!!showInvoice} onClose={() => setShowInvoice(null)}>
        {(onBack) => <InvoiceScreen onBack={onBack} filterBatchId={showInvoice?.filterBatchId ?? null} />}
      </SlideScreen>
      <SlideScreen visible={showUserMgmt} onClose={() => setShowUserMgmt(false)} stackIndex={1}>
        {(onBack) => <UserManagementScreen
          key={userRefreshKey}
          onBack={onBack}
          reviewedUserId={reviewedUserId}
          onSelectUser={async (u) => {
            if (!u.reviewed) {
              try { await api.admin.markReviewed(u.id); } catch {}
              setReviewedUserId(u.id);
            }
            setTimeout(() => setShowUserDetail(u), 250);
          }}
        />}
      </SlideScreen>
      <SlideScreen visible={!!showUserDetail} onClose={() => { setShowUserDetail(null); setReviewedUserId(null); setProfileRefreshKey(k => k + 1); }} stackIndex={2}>
        {(onBack) => showUserDetail ? (
          <UserDetailScreen
            user={showUserDetail}
            onBack={onBack}
            onChanged={() => { setUserRefreshKey(k => k + 1); }}
          />
        ) : null}
      </SlideScreen>
      <SlideScreen visible={!!showProcurementDetail} onClose={() => setShowProcurementDetail(null)}>
        {(onBack) => showProcurementDetail ? (
          <ProcurementDetailScreen
            batch={showProcurementDetail}
            onBack={onBack}
            onEdit={(b) => { setShowProcurementDetail(null); }}
            onDelete={(b) => { setShowProcurementDetail(null); }}
            onOpenInvoice={(batchId) => { setShowProcurementDetail(null); setTimeout(() => setShowInvoice({ filterBatchId: batchId }), 250); }}
          />
        ) : null}
      </SlideScreen>
      <SlideScreen visible={!!showExpenseDetail} onClose={() => setShowExpenseDetail(null)}>
        {(onBack) => showExpenseDetail ? (
          <ExpenseDetailScreen
            expense={showExpenseDetail}
            onBack={onBack}
            onSaved={() => { setExpenseRefreshKey(k => k + 1); }}
            onDeleted={() => { setShowExpenseDetail(null); setExpenseRefreshKey(k => k + 1); }}
          />
        ) : null}
      </SlideScreen>
      <SlideScreen visible={!!showPdfPreview} onClose={() => setShowPdfPreview(null)}>
        {(onBack) => showPdfPreview ? (
          <PdfPreviewPage
            batchId={showPdfPreview.id}
            invoiceNumber={showPdfPreview.number}
            onBack={onBack}
          />
        ) : null}
      </SlideScreen>

      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header — fixed frosted-glass bar matching web (zIndex 200,
            backdropFilter:blur(30px) achieved here via expo-blur). Sits
            ABOVE the scrollable content so the avatar/user row stays
            visible while the panels scroll under it. */}
        {isHome && <View style={styles.header}>
          <BlurView
            intensity={70}
            tint="systemUltraThinMaterialLight"
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={styles.headerInner}>
            <TouchableOpacity
              style={styles.headerLeft}
              onPress={() => openModal(() => setShowProfile(true))}
              activeOpacity={0.6}
            >
              <Image
                source={avatarUrl ? { uri: avatarUrl } : LOGO_IMAGE}
                style={styles.headerAvatar}
              />
              <Text style={styles.headerUser}>{usr}</Text>
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => openModal(() => setShowBgModal(true))}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.headerBtn}
              >
                <Text style={styles.headerLink}>{t('bgSettings')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowLogoutModal(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.headerBtn}
              >
                <Text style={styles.logoutBtn}>{t('logout')}</Text>
              </TouchableOpacity>
              <View style={styles.langRow}>
                {langs.map(([l, label]) => (
                  <TouchableOpacity
                    key={l}
                    onPress={() => switchLang(l)}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    style={styles.langBtnTouch}
                  >
                    <Text style={[styles.langBtn, lang === l && styles.langActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>}

        {/* Page content — ExpenseScreen has its own scroll, render outside wrapper */}
        {isHome && tab === 'expense' ? (
          <ExpenseScreen
            businessSummary={businessSummary}
            onReconHistory={() => setShowReconHistory(true)}
            onExpenseHistory={() => setShowExpenseHistory(true)}
            onExpenseAdded={loadBusinessSummary}
          />
        ) : isHome && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false} bounces={false}>

          {tab === 'partner' ? (
            <PartnerScreen onBack={() => setTab('list')} onProfile={() => openModal(() => setShowProfile(true))} refreshKey={partnerRefreshKey} />
          ) : tab === 'supply' ? (
            <ProcurementScreen />
          ) : tab === 'list' ? (
            <DailyRevenueView
              colors={colors}
              styles={styles}
              revDate={revDate} setRevDate={setRevDate} revDateErr={revDateErr} setRevDateErr={setRevDateErr}
              loadRevForDate={loadRevForDate} td={td} sdYesterday={sd.yesterday} sdDb4={sd.offset(-2)} fmtDateLabel={fmtDateLabel}
              showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
              revRevenue={revRevenue} setRevRevenue={setRevRevenue}
              revTurnover={revTurnover} setRevTurnover={setRevTurnover}
              revJD={revJD} setRevJD={setRevJD}
              revNote={revNote} setRevNote={setRevNote}
              revMarkedClosed={revMarkedClosed} setRevMarkedClosed={setRevMarkedClosed}
              revSaving={revSaving} submitDailyRev={submitDailyRev}
              yesterdayRev={yesterdayRev} weekRev={weekRev} last7Records={last7Records}
              onShowDailyHistory={() => setShowDailyHistory(true)}
            />
          ) : tab === 'chart' ? (
            <ChartGlassView
              colors={colors}
              businessSummary={businessSummary}
              chartMonthly={chartMonthly}
            />
          ) : null}
        </ScrollView>
        )}

        {isHome && (
        <View pointerEvents="box-none" style={styles.bottomNavWrap}>
          <View style={styles.bottomNav}>
            {/* Real blur via expo-blur. Sits behind the icons, clipped
                to the rounded pill shape by overflow:hidden on the
                bottomNav container. */}
            <BlurView
              intensity={75}
              tint="systemUltraThinMaterialLight"
              style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
              pointerEvents="none"
            />
            {/* Inset top highlight — mimics web's
                boxShadow: inset 0 0.5px 0 rgba(255,255,255,0.12). RN
                has no inset shadow so we fake it with a thin white
                line at the top edge. */}
            <View style={styles.bottomNavInsetTop} pointerEvents="none" />
            {NAV_ITEMS.map(({ id, labelKey, icon }, i) => {
              const active = tab === id;
              // Active icon colour matches web's NavIcon* helpers —
              // colors.navActiveColor (per-theme soft tint) for active,
              // not colors.textMain which was too high-contrast.
              const c = active ? colors.navActiveColor : colors.textSub;
              return (
                <TouchableOpacity
                  key={id}
                  style={styles.navItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (id !== tab) {
                      Animated.sequence([
                        Animated.spring(navScaleAnims[i], { toValue: 0.85, useNativeDriver: true, speed: 30, bounciness: 6 }),
                        Animated.spring(navScaleAnims[i], { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }),
                      ]).start();
                      setTab(id);
                    }
                  }}
                >
                  <Animated.View style={[styles.navIconWrap, active && styles.navIconWrapActive, { transform: [{ scale: navScaleAnims[i] }] }]}>
                    {icon(c)}
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        )}
      </View>

      {/* BG settings modal — uses shared ThemePickerModal (matches web) */}
      <ThemePickerModal
        visible={showBgModal}
        onClose={() => setShowBgModal(false)}
        showCoverTools
        coverOpacity={bgOpacity}
        onCoverOpacityChange={setBgOpacityPersist}
        onCoverImagePicked={async (file: any) => {
          setBgUploading(true);
          try {
            const r: any = await api.uploadBackground(file);
            if (r?.url) {
              const resolved = resolveAssetUrl(r.url) || DEFAULT_BG;
              setBgImageUri(resolved);
              setBgVersion((v) => v + 1);
              try { localStorage.setItem('bg-image', resolved); } catch {}
              try { localStorage.setItem('__bg_changed_ts', String(Date.now())); } catch {}
              if (typeof window !== 'undefined' && typeof (window as any).dispatchEvent === 'function') {
                (window as any).dispatchEvent(new CustomEvent('bg-changed', { detail: { url: resolved } }));
              }
            } else {
              setToast(t('toastSubmitFailed'));
            }
          } catch {
            setToast(t('toastSubmitFailed'));
          }
          setBgUploading(false);
        }}
        onResetCover={() => setShowBgModal(false)}
        coverUploading={bgUploading}
      />

      {/* Logout modal */}
      <ModalOverlay visible={showLogoutModal} onClose={() => setShowLogoutModal(false)}>
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{t('logout')}</Text>
              <TouchableOpacity onPress={() => setShowLogoutModal(false)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={mo.body}>
              <Text style={{ color: colors.textMain, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
                {t('logoutConfirm')}
              </Text>
              <View style={mo.btnRow}>
                <TouchableOpacity style={mo.cancelBtn} onPress={() => setShowLogoutModal(false)}>
                  <Text style={mo.cancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={mo.confirmBtn} onPress={() => { setShowLogoutModal(false); api.logout().finally(() => onLogout()); }}>
                  <Text style={mo.confirmText}>{t('confirmLogout')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
      </ModalOverlay>

      <DatePickerModal
        visible={showDatePicker}
        value={revDate}
        onClose={() => setShowDatePicker(false)}
        onSelect={(d) => { if (d <= td) { setRevDate(d); setRevDateErr(0); } }}
        title={t('billDate') || '选择日期'}
      />
      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

/* ── Chart tab view (matches web's tab=chart content) ─────────────── */

interface ChartGlassProps {
  colors: ThemeColors;
  businessSummary: {
    cash_on_hand?: number;
    cumulative_revenue?: number;
    cumulative_expense?: number;
    actual_received?: number;
    receivable?: number;
    discount?: number;
    today_expense_amount?: number;
    month_expense_amount?: number;
    yesterday_income?: number;
    yesterday_expense?: number;
    yesterday_profit?: number;
  };
  chartMonthly: any;
}

/** 6 张收支卡片：昨日/本月 收入/支出/利润 2x3 grid */
function ExpenseSummaryCardsInline({
  yesterdayExpense, monthExpense, yesterdayIncome, monthIncome, colors,
}: {
  yesterdayExpense: number; monthExpense: number;
  yesterdayIncome: number; monthIncome: number;
  colors: ThemeColors;
}) {
  const yesterdayProfit = yesterdayIncome - yesterdayExpense;
  const monthProfit = monthIncome - monthExpense;

  const cards = [
    { label: t('yesterdayIncome'), value: yesterdayIncome, clr: colors.success, isProfit: false },
    { label: t('yesterdayExpense'), value: yesterdayExpense, clr: colors.danger, isProfit: false },
    { label: t('monthIncome'), value: monthIncome, clr: colors.success, isProfit: false },
    { label: t('monthExpense'), value: monthExpense, clr: colors.danger, isProfit: false },
    { label: t('yesterdayProfit'), value: yesterdayProfit, clr: yesterdayProfit >= 0 ? colors.success : colors.danger, isProfit: true },
    { label: t('monthProfit'), value: monthProfit, clr: monthProfit >= 0 ? colors.success : colors.danger, isProfit: true },
  ];

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {cards.map((c, i) => (
          <View
            key={i}
            style={{
              width: '48%' as any, flexGrow: 1, flexBasis: '46%' as any,
              backgroundColor: 'rgba(255,255,255,0.88)',
              borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18,
              borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.45)',
              borderLeftColor: c.clr, borderLeftWidth: 3,
            }}
          >
            <Text style={{ fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: 'rgba(0,0,0,0.55)', marginBottom: 4 }}>
              {c.label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              {c.isProfit ? (
                <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.clr }}>
                  {c.value >= 0 ? '+' : '-'}{fmtAmtFull(Math.abs(c.value))}
                </Text>
              ) : (
                <NumberTicker value={c.value} style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: 'rgba(0,0,0,0.9)' }} formatFn={fmtAmtFull} />
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ChartGlassView({ colors, businessSummary, chartMonthly }: ChartGlassProps) {
  // Use the iOS white glass card (matches web's iOS-specific branch)
  const glassBg = 'rgba(255,255,255,0.78)';
  const glassBgStrong = 'rgba(255,255,255,0.88)';
  const glassBorder = 'rgba(255,255,255,0.45)';
  const card: any = {
    backgroundColor: glassBg, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: glassBorder, marginBottom: 12,
  };
  const labelStyle = { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: 'rgba(0,0,0,0.55)' };
  const symStyle = { fontSize: 16, fontWeight: '600' as const, color: 'rgba(0,0,0,0.7)', marginRight: 2 };
  const valueStyle = { fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: 'rgba(0,0,0,0.9)' };
  const subCard: any = {
    flex: 1, backgroundColor: glassBgStrong, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: glassBorder,
  };
  const subLabelStyle = { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: 'rgba(0,0,0,0.55)' };
  const subValueStyle = { fontSize: 16, fontWeight: '700' as const, color: 'rgba(0,0,0,0.9)', marginTop: 4 };

  const toNum = (v: any) => parseFloat(String(v ?? 0)) || 0;
  const yesterdayIncome = toNum(businessSummary.yesterday_income);
  const yesterdayExpense = toNum(businessSummary.yesterday_expense);
  const monthExpense = toNum(businessSummary.month_expense_amount);
  // Month income: use daily_revenues or fallback from businessSummary
  const monthIncomeVal = toNum(businessSummary.yesterday_income) * 30; // rough estimate if not available

  return (
    <View style={{ paddingBottom: 100, paddingTop: 4 }}>
      {/* ── Glass card: 在手资金 ── */}
      <View style={card}>
        <Text style={{ fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: 'rgba(0,0,0,0.9)', marginBottom: 16 }}>
          {t('summary')}
        </Text>
        <View style={{ alignItems: 'flex-start', gap: 2, marginBottom: 16 }}>
          <Text style={labelStyle}>{t('cashOnHand')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={symStyle}>¥</Text>
            <Text style={valueStyle}>{toDec2Comma(businessSummary.cash_on_hand || 0)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={subCard}>
            <Text style={subLabelStyle}>{t('cumulativeRevenue')}</Text>
            <Text style={subValueStyle}>{'¥' + toDec2Comma(businessSummary.cumulative_revenue || 0)}</Text>
          </View>
          <View style={subCard}>
            <Text style={subLabelStyle}>{t('cumulativeExpense')}</Text>
            <Text style={subValueStyle}>{'¥' + toDec2Comma(businessSummary.cumulative_expense || 0)}</Text>
          </View>
        </View>
      </View>

      {/* ── KPI 三行：实收 / 应收 / 优惠减免 ── */}
      <View style={[card, { paddingVertical: 18, paddingHorizontal: 18, gap: 14 }]}>
        {[
          { label: t('actualReceived'), val: toNum(businessSummary.actual_received) },
          { label: t('receivable'), val: toNum(businessSummary.receivable) },
          { label: t('discountAmount'), val: toNum(businessSummary.discount) },
        ].map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: FONTS.sub.size, color: 'rgba(0,0,0,0.55)', fontWeight: FONTS.sub.weight }}>{item.label}</Text>
            <Text style={{ fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: 'rgba(0,0,0,0.9)' }}>
              {'¥' + toDec2Comma(item.val)}
            </Text>
          </View>
        ))}
      </View>

      {/* ── 6 张收支卡片 ── */}
      <ExpenseSummaryCardsInline
        yesterdayExpense={yesterdayExpense}
        monthExpense={monthExpense}
        yesterdayIncome={yesterdayIncome}
        monthIncome={monthIncomeVal}
        colors={colors}
      />

      {/* ── 图表：月度趋势 + 分类占比 + 每日收支 ── */}
      {chartMonthly ? (
        <ChartsPanel
          months={chartMonthly.months || []}
          income={chartMonthly.income || []}
          expense={chartMonthly.expense || []}
          profit={chartMonthly.profit || []}
          categories={chartMonthly.categories || {}}
          dailyDates={chartMonthly.daily_dates || []}
          dailyIncome={chartMonthly.daily_income || []}
          dailyExpense={chartMonthly.daily_expense || []}
          dailyProfitDates={chartMonthly.daily_dates || []}
          dailyProfitValues={chartMonthly.daily_profit || []}
        />
      ) : (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(0,0,0,0.4)', fontSize: FONTS.sub.size }}>{t('noData')}</Text>
        </View>
      )}
    </View>
  );
}

/* ── Daily Revenue view (matches web's tab=list content) ─────────── */

interface DailyRevProps {
  colors: ThemeColors;
  styles: ReturnType<typeof getStyles>;
  revDate: string; setRevDate: (v: string) => void; revDateErr: number; setRevDateErr: (v: number) => void;
  loadRevForDate: (d: string) => void; td: string; sdYesterday: string; sdDb4: string; fmtDateLabel: (s: string) => string;
  showDatePicker: boolean; setShowDatePicker: (v: boolean) => void;
  revRevenue: string; setRevRevenue: (v: string) => void;
  revTurnover: string; setRevTurnover: (v: string) => void;
  revJD: string; setRevJD: (v: string) => void;
  revNote: string; setRevNote: (v: string) => void;
  revMarkedClosed: boolean; setRevMarkedClosed: (v: boolean) => void;
  revSaving: boolean; submitDailyRev: () => void;
  yesterdayRev: any; weekRev: any; last7Records: any[];
  onShowDailyHistory: () => void;
}

function DailyRevenueView(p: DailyRevProps) {
  const { colors, styles } = p;
  return (
    <View>
      <View style={{ paddingTop: 14 }}>
        {/* ── Daily revenue entry card (liquid glass — web parity) ── */}
        <View style={styles.revCard}>
          <BlurView
            intensity={85}
            tint="systemUltraThinMaterialLight"
            style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
            pointerEvents="none"
          />
          <View style={styles.revHeaderRow}>
            <View style={styles.revTitleGroup}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.textMain} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 3v18h18M7 16l4-8 4 4 4-6" />
              </Svg>
              <Text style={styles.revTitle}>{t('dailyRevenue')}</Text>
            </View>
          </View>

          {/* Quick date pills */}
          <View style={styles.datePillRow}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[
                { label: t('revQuickToday'), d: p.td },
                { label: t('revQuickYesterday'), d: p.sdYesterday },
                { label: t('revQuickDB4') || '前天', d: p.sdDb4 },
              ].map(pill => (
                <TouchableOpacity
                  key={pill.d}
                  onPress={() => p.loadRevForDate(pill.d)}
                  style={[styles.datePill, p.revDate === pill.d && styles.datePillActive]}
                >
                  <Text style={[styles.datePillText, p.revDate === pill.d && styles.datePillTextActive]}>
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => p.setShowDatePicker(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={styles.dateLabel}>{p.fmtDateLabel(p.revDate)}</Text>
              <Text style={{ fontSize: 14 }}>📅</Text>
            </TouchableOpacity>
            <DateErrorHint trigger={p.revDateErr} message={t('errDateFuture')} colors={colors} />
          </View>

          {/* Three input cards: 营业额收入 / 营业额 / 京东营收 */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <RevInputCard
              title={t('revRevenue')} sub={t('revRevenueSub')} symbol="¥"
              value={p.revRevenue} onChangeText={(v) => p.setRevRevenue(fmtDecInput(v))}
              yesterdayValue={p.yesterdayRev?.revenue} colors={colors} styles={styles}
            />
            <RevInputCard
              title={t('revTurnover')} sub={t('revTurnoverSub')} symbol="¥"
              value={p.revTurnover} onChangeText={(v) => p.setRevTurnover(fmtDecInput(v))}
              yesterdayValue={p.yesterdayRev?.turnover} colors={colors} styles={styles}
            />
            <RevInputCard
              title={t('revJD')} sub={t('revJDSub')} symbol="¥"
              value={p.revJD} onChangeText={(v) => p.setRevJD(fmtDecInput(v))}
              yesterdayValue={p.yesterdayRev?.jd_revenue} colors={colors} styles={styles}
            />
          </View>

          {/* Note */}
          <TextInput
            style={styles.revNoteInput}
            value={p.revNote} onChangeText={p.setRevNote}
            placeholder={t('revNoteHint')} placeholderTextColor={colors.textSub}
          />

          {/* Two action buttons: archive + submit */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.revArchiveBtn, { flex: 2 }, p.revMarkedClosed && styles.revArchiveBtnDone]}
              onPress={() => {
                const next = !p.revMarkedClosed;
                p.setRevMarkedClosed(next);
                if (next && !p.revNote.trim()) {
                  p.setRevNote(t('revClosedReason'));
                } else if (!next && p.revNote.trim() === t('revClosedReason')) {
                  p.setRevNote('');
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.revArchiveText, p.revMarkedClosed && styles.revArchiveTextDone]}>
                {p.revMarkedClosed ? t('revCancelArchive') : t('revMarkArchive')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.revSubmitBtn, { flex: 4 }, (!p.revMarkedClosed && (!p.revTurnover || parseFloat(p.revTurnover) <= 0) || p.revSaving) && { opacity: 0.5 }]}
              onPress={p.submitDailyRev}
              disabled={(!p.revMarkedClosed && (!p.revTurnover || parseFloat(p.revTurnover) <= 0)) || p.revSaving}
              activeOpacity={0.8}
            >
              {p.revSaving ? <ActivityIndicator color={colors.surface} /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.surface} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <Path d="M17 21v-8H7v8" />
                  </Svg>
                  <Text style={styles.revSubmitText}>
                    {p.revDate === p.td ? t('revSaveToday') :
                      p.revDate === p.sdYesterday ? t('revSaveYesterday') :
                      p.revDate === p.sdDb4 ? t('revSaveDayBefore') :
                      t('revSaveDate').replace('{date}', p.revDate.slice(5).replace('-', ''))}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Last 30 days summary */}
          <View style={styles.revWeekRow}>
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={styles.revWeekLabel}>{t('revWeekRevenue')}</Text>
              <Text style={styles.revWeekVal}>¥{toDec2(p.weekRev?.revenue)}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.revWeekLabel}>{t('revWeekTurnover')}</Text>
              <Text style={styles.revWeekVal}>¥{toDec2(p.weekRev?.turnover)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.revWeekLabel}>{t('revWeekJD')}</Text>
              <Text style={styles.revWeekVal}>¥{toDec2(p.weekRev?.jd_revenue)}</Text>
            </View>
          </View>
        </View>

        {/* ── Last 7 days records ── */}
        <View style={{ marginTop: 20 }}>
          <View style={styles.revHistoryHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMain} strokeWidth={2} strokeLinecap="round">
                <Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <Path d="M9 12h6M9 16h6" />
              </Svg>
              <Text style={styles.revHistoryTitle}>{t('revHistory')}</Text>
            </View>
            <TouchableOpacity onPress={p.onShowDailyHistory} style={{ marginLeft: 'auto' }} activeOpacity={0.7}>
              <Text style={styles.revHistoryBtn}>{t('revHistoryBtn')} →</Text>
            </TouchableOpacity>
          </View>

          {p.last7Records.length === 0 ? (
            <View style={styles.rev7Empty}>
              <Text style={{ color: colors.textSub, fontSize: 14 }}>...</Text>
            </View>
          ) : (
            p.last7Records.map((rec: any, i: number) => (
              <View key={i} style={styles.rev7Card}>
                <View style={styles.rev7CardTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.rev7CardDate}>{rec.date}</Text>
                    {rec.date === p.td && (
                      <View style={styles.rev7TodayTag}>
                        <Text style={styles.rev7TodayTagText}>{t('today')}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.rev7CardBadge, (rec.status === '未录入' || !rec.recorded_by) ? styles.rev7CardBadgeGap : styles.rev7CardBadgeOk]}>
                    <View style={[styles.rev7CardDot, { backgroundColor: (rec.status === '未录入' || !rec.recorded_by) ? colors.danger : colors.success }]} />
                    <Text style={[styles.rev7CardStatus, { color: (rec.status === '未录入' || !rec.recorded_by) ? colors.danger : colors.success }]}>
                      {rec.status === '未录入' || !rec.recorded_by ? t('revNotEntered') : t('revEntered')}
                    </Text>
                  </View>
                </View>
                {rec.archived ? (
                  <View style={styles.rev7ArchivedBadge}>
                    <Text style={styles.rev7ArchivedBadgeText}>{t('revMarkArchive')}</Text>
                  </View>
                ) : null}
                <View style={styles.rev7CardAmounts}>
                  <View style={styles.rev7CardAmtCol}>
                    {rec.revenue > 0 ? <Text style={styles.rev7CardAmtVal}>¥{rec.revenue.toFixed(2)}</Text> : <Dash color={colors.secondary} />}
                    <Text style={styles.rev7CardAmtLabel}>{t('revRevenue')}</Text>
                  </View>
                  <View style={styles.rev7CardAmtCol}>
                    {rec.turnover > 0 ? <Text style={styles.rev7CardAmtVal}>¥{rec.turnover.toFixed(2)}</Text> : <Dash color={colors.secondary} />}
                    <Text style={styles.rev7CardAmtLabel}>{t('revTurnover')}</Text>
                  </View>
                  <View style={styles.rev7CardAmtCol}>
                    {rec.jd_revenue > 0 ? <Text style={styles.rev7CardAmtVal}>¥{rec.jd_revenue.toFixed(2)}</Text> : <Dash color={colors.secondary} />}
                    <Text style={styles.rev7CardAmtLabel}>{t('revJD')}</Text>
                  </View>
                </View>
                <View style={styles.rev7CardFooter}>
                  <Text style={styles.rev7CardFooterText}>{t('recordedBy')}: {rec.recorded_by || '—'}</Text>
                </View>
                {rec.note ? <View style={styles.rev7CardNote}><Text style={styles.rev7CardNoteText}>{rec.note}</Text></View> : null}
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

function RevInputCard({ title, sub, symbol, value, onChangeText, yesterdayValue, colors, styles }: {
  title: string; sub: string; symbol: string; value: string; onChangeText: (v: string) => void;
  yesterdayValue: number | undefined; colors: ThemeColors; styles: ReturnType<typeof getStyles>;
}) {
  return (
    <View style={styles.revInputCard}>
      <Text style={styles.revInputCardTitle}>{title}</Text>
      <Text style={styles.revInputCardSub}>{sub}</Text>
      <View style={styles.revInputCardInputWrap}>
        <Text style={styles.revInputCardSymbol}>{symbol}</Text>
        <TextInput
          style={styles.revInputCardInput}
          value={value} onChangeText={onChangeText}
          keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSub}
        />
      </View>
      <Text style={styles.revInputCardFooter}>
        {t('revYesterdayLabel')}{' '}
        {yesterdayValue ? `¥${toDec2(yesterdayValue)}` : t('revYesterdayNA')}
      </Text>
    </View>
  );
}

function Dash({ color }: { color: string }) {
  return (
    <Svg width={24} height={12} viewBox="0 0 24 12" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M4 6h16" />
    </Svg>
  );
}

/* ── Bottom nav config ────────────────────────────────────────────── */

interface NavItem { id: Tab; labelKey: string; icon: (c: string) => React.ReactNode }
const NAV_ITEMS: NavItem[] = [
  { id: 'expense', labelKey: 'tabRecord',  icon: (c) => <IconAdd c={c} /> },
  { id: 'list',    labelKey: 'tabBill',    icon: (c) => <IconList c={c} /> },
  { id: 'supply',  labelKey: 'tabSupply',  icon: (c) => <IconSupply c={c} /> },
  { id: 'chart',   labelKey: 'tabTrends',  icon: (c) => <IconChart c={c} /> },
  { id: 'partner', labelKey: 'navPartner', icon: (c) => <IconPartner c={c} /> },
];

function IconAdd({ c }: { c: string }) {
  // Wallet — port of web's NavIconExpense (web/src/screens/HomeScreen.tsx
  // NavIconExpense). The previous Plus-sign icon didn't match web.
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 12V8H6a2 2 0 010-4h12v4" />
      <Path d="M4 6v12a2 2 0 002 2h14v-4" />
      <Path d="M18 12a2 2 0 100 4h4v-4h-4z" />
    </Svg>
  );
}
function IconList({ c }: { c: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <Path d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      <Path d="M9 12h6M9 16h6" />
    </Svg>
  );
}
function IconSupply({ c }: { c: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <Path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </Svg>
  );
}
function IconChart({ c }: { c: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 3v18h18" />
      <Path d="M7 16l4-8 4 4 4-6" />
    </Svg>
  );
}
function IconPartner({ c }: { c: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </Svg>
  );
}

/* ── Styles ────────────────────────────────────────────────────────── */

const getStyles = (colors: ThemeColors, headerColor: string) => StyleSheet.create({
  bg: { flex: 1 },
  bgLayer: { ...StyleSheet.absoluteFillObject },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  root: { flex: 1 },

  // Header — frosted-glass bar at top of root, mirrors web's zIndex:200
  // header with backdropFilter blur(30px) (we use expo-blur since RN has
  // no backdrop-filter). Sits in the normal flow (after the root's
  // insets.top padding) so the notch isn't covered.
  header: {
    zIndex: 200, overflow: 'hidden',
    paddingLeft: 16, paddingRight: 16, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Header typography — exact port of web/src/screens/HomeScreen.tsx L914-931
  // (web/src/theme.tsx FONTS.micro = 12px / weight 500). Web computes
  // `headerColor` from `bgOpacity === 1 ? '#FFFFFF' : '#000000'` so
  // text flips white when the bg is fully opaque, otherwise black.
  headerAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 6 },
  headerUser: { fontSize: FONTS.micro.size, color: headerColor, fontWeight: FONTS.micro.weight },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: { /* matches web — no extra padding, label is the tap target */ },
  headerLink: { fontSize: FONTS.micro.size, color: headerColor, fontWeight: FONTS.micro.weight },
  logoutBtn: { fontSize: FONTS.micro.size, color: colors.danger, fontWeight: FONTS.micro.weight },
  // Lang switcher — tighter spacing (gap 4→2, paddingH 7→4, paddingV
  // 2→1) per user feedback. Unselected inherits headerColor so it
  // matches the rest of the header text (white over opaque bg, black
  // otherwise). Active stays colors.primary per web.
  langRow: { flexDirection: 'row', gap: 2 },
  langBtnTouch: { /* no extra padding */ },
  langBtn: { fontSize: FONTS.micro.size, color: headerColor, fontWeight: FONTS.micro.weight, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  langActive: { color: colors.primary, backgroundColor: withAlpha(colors.danger, 0.1), fontWeight: FONTS.microBold.weight },

  // Content
  content: { flex: 1 },
  contentInner: { flexGrow: 1, overflow: 'hidden', maxWidth: 520, width: '100%', alignSelf: 'center' },

  // Bottom nav — floating glass pill (mirrors web's center-positioned
// saturate(220%) blur(30px) capsule).
  bottomNavWrap: {
    position: 'absolute' as const, left: 0, right: 0, bottom: 0,
    alignItems: 'center', paddingBottom: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    width: '80%', maxWidth: 420,
    backgroundColor: withAlpha(colors.surface, 0.20),
    borderRadius: 28, overflow: 'hidden',
    paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 0.5, borderColor: withAlpha(colors.surface, 0.25),
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    zIndex: 100,
  },
  bottomNavInsetTop: {
    position: 'absolute', left: 12, right: 12, top: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  navIconWrapActive: { backgroundColor: withAlpha(colors.textMain, 0.1) },

  // BG settings modal extras
  opacityChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.bg, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  opacityChipActive: { backgroundColor: withAlpha(colors.primary, 0.12), borderColor: colors.primary },
  opacityChipText: { fontSize: 11, color: colors.textSub, fontWeight: '600' },
  opacityChipTextActive: { color: colors.primary },
  themePickerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.secondary },

  // Daily revenue card — web parity (DailyRevenuePanel.tsx L366-376):
  // backdrop-filter: saturate(180%) blur(20px) achieved here via expo-blur
  // (intensity 85, tint systemUltraThinMaterialLight, layered absolutely
  // behind the content with overflow:hidden for the rounded clip).
  // Alpha 0.92 → 0.65 to actually let the blur show through; padding
  // 16 → 18; add borderWidth 0.5 + subtle borderColor.
  revCard: {
    backgroundColor: withAlpha(colors.surface, 0.65),
    borderRadius: 14, padding: 18, overflow: 'hidden',
    marginHorizontal: 16, marginTop: 14,
    borderWidth: 0.5, borderColor: withAlpha(colors.textMain, 0.08),
  },
  revHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  revTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revTitle: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: colors.textMain },
  cancelEditBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.bg },
  cancelEditText: { fontSize: FONTS.microBold.size, color: colors.textSub, fontWeight: FONTS.microBold.weight },
  datePillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  datePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, backgroundColor: colors.bg },
  datePillActive: { backgroundColor: colors.primary },
  datePillText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub },
  datePillTextActive: { color: colors.surface },
  dateLabel: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub },
  revInputCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: colors.secondary },
  revInputCardTitle: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub, marginBottom: 2 },
  revInputCardSub: { fontSize: FONTS.micro.size, color: colors.textSub, marginBottom: 8 },
  revInputCardInputWrap: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 },
  revInputCardSymbol: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub, marginRight: 2, marginBottom: 1 },
  revInputCardInput: { flex: 1, fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: colors.textMain, padding: 0 },
  revInputCardFooter: { fontSize: FONTS.micro.size, color: colors.textSub },
  revNoteInput: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: FONTS.body.size, color: colors.textMain, marginBottom: 14, borderWidth: 1, borderColor: colors.secondary },
  revArchiveBtn: { backgroundColor: withAlpha(colors.textMain, 0.08), borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  revArchiveBtnDone: { backgroundColor: withAlpha(colors.success, 0.18) },
  revArchiveText: { fontSize: FONTS.sub.size, color: colors.textSub, fontWeight: FONTS.sub.weight },
  revArchiveTextDone: { color: colors.success },
  revSubmitBtn: { backgroundColor: withAlpha(colors.primary, 0.92), borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  revSubmitText: { fontSize: FONTS.sub.size, color: colors.surface, fontWeight: FONTS.subBold.weight, letterSpacing: 0.5 },
  revWeekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 },
  revWeekLabel: { fontSize: FONTS.micro.size, color: colors.textSub, marginBottom: 4 },
  revWeekVal: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain },

  // Last 7 days
  revHistoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginHorizontal: 16 },
  revHistoryTitle: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub },
  revHistoryBtn: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.primary },
  rev7Empty: { paddingVertical: 30, alignItems: 'center' },
  rev7Card: { backgroundColor: withAlpha(colors.surface, 0.85), borderRadius: 12, padding: 14, marginBottom: 10, marginHorizontal: 16, borderWidth: 1, borderColor: withAlpha(colors.textSub, 0.08) },
  rev7CardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rev7CardDate: { fontSize: FONTS.sub.size, color: colors.textMain, fontWeight: FONTS.sub.weight },
  rev7TodayTag: { backgroundColor: withAlpha(colors.primary, 0.12), borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  rev7TodayTagText: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  rev7CardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  rev7CardBadgeGap: { backgroundColor: withAlpha(colors.danger, 0.1) },
  rev7CardBadgeOk: { backgroundColor: withAlpha(colors.success, 0.12) },
  rev7CardDot: { width: 6, height: 6, borderRadius: 3 },
  rev7CardStatus: { fontSize: 11, fontWeight: '600' },
  rev7ArchivedBadge: { alignSelf: 'flex-start', backgroundColor: withAlpha(colors.textSub, 0.15), borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6 },
  rev7ArchivedBadgeText: { fontSize: 10, color: colors.textSub, fontWeight: '600' },
  rev7CardAmounts: { flexDirection: 'row', marginTop: 6, marginBottom: 8, gap: 6 },
  rev7CardAmtCol: { flex: 1, alignItems: 'center' },
  rev7CardAmtVal: { fontSize: FONTS.body.size, fontWeight: FONTS.subBold.weight, color: colors.textMain, marginBottom: 2 },
  rev7CardAmtLabel: { fontSize: 10, color: colors.textSub },
  rev7CardFooter: { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: withAlpha(colors.textSub, 0.08) },
  rev7CardFooterText: { fontSize: 11, color: colors.textSub },
  rev7CardNote: { marginTop: 6, backgroundColor: withAlpha(colors.textSub, 0.06), borderRadius: 6, padding: 8 },
  rev7CardNoteText: { fontSize: 12, color: colors.textSub },
});

const getMo = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: withAlpha(colors.textMain, 0.4),
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    width: 340, maxWidth: '90%', overflow: 'hidden' as any,
    ...modalCardAnimation,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.surface },
  close: { ...modalClose },
  body: { padding: 24, gap: 18 } as any,
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 0 },
  cancelBtn: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    borderColor: (colors as any).secondary || '#e0e0e0',
    paddingVertical: 12, alignItems: 'center',
  },
  cancelText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub },
  confirmBtn: {
    flex: 1, backgroundColor: colors.primary, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  confirmText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.surface },
});
