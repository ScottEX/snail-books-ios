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
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { pickImages } from '../utils/imagePicker';
import { getCurrentUserId } from '../utils/storage';
import Toast from '../components/Toast';
import DatePickerModal from '../components/DatePickerModal';
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
import { modalCardAnimation, modalClose } from '../sharedStyles';

const BG_IMAGE = require('../../assets/img/bg.jpg');
const LOGO_IMAGE = require('../../assets/img/logo.jpg');

type Tab = 'list' | 'expense' | 'supply' | 'chart' | 'partner';

// ── Date helpers ──
const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayDateStr = () => fmtDate(new Date());
const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate()-1); return fmtDate(d); };
const db4Str = () => { const d = new Date(); d.setDate(d.getDate()-2); return fmtDate(d); };

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
  const insets = useSafeAreaInsets();

  // ── Tab state (persisted) ──
  const [tab, setTabState] = useState<Tab>(() => {
    try { return (localStorage.getItem('active_tab') as Tab) || 'expense'; } catch { return 'expense'; }
  });
  const setTab = (t: Tab) => { setTabState(t); try { localStorage.setItem('active_tab', t); } catch {} };

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
  useEffect(() => {
    const id = (usr || '').trim();
    if (!id) { setAvatarUrl(''); return; }
    const reqId = ++avatarReqId.current;
    const timer = setTimeout(async () => {
      try {
        const url = await api.getUserAvatarByLoginUri(id);
        if (reqId === avatarReqId.current && url) setAvatarUrl(url);
      } catch {}
    }, 300);
    return () => { clearTimeout(timer); };
  }, [usr]);

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
    const w: any = typeof window !== 'undefined' ? window : undefined;
    if (w && typeof w.addEventListener === 'function') {
      w.addEventListener('bg-changed', onBgChanged);
      return () => w.removeEventListener('bg-changed', onBgChanged);
    }
    return undefined;
  }, []);
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    try {
      const uid = getCurrentUserId();
      const key = uid ? `bg-opacity-${uid}` : 'bg-opacity';
      const s = localStorage.getItem(key);
      return s !== null ? parseFloat(s) : 0.5;
    } catch { return 0.5; }
  });
  const setBgOpacityPersist = (v: number) => {
    setBgOpacity(v);
    try { localStorage.setItem(opacityKey, String(v)); } catch {}
    api.saveBackgroundSettings({ opacity: v }).catch(() => {});
  };
  const handlePickBg = async () => {
    const imgs = await pickImages({ multiple: false }).catch(() => []);
    if (imgs.length === 0) return;
    setBgUploading(true);
    try {
      const r: any = await api.uploadBackground(imgs[0]);
      if (r?.url) {
        const resolved = resolveAssetUrl(r.url) || DEFAULT_BG;
        setBgImageUri(resolved);
        setBgVersion((v) => v + 1);
        try { localStorage.setItem('bg-image', resolved); } catch {}
        if (typeof window !== 'undefined' && typeof (window as any).dispatchEvent === 'function') {
          (window as any).dispatchEvent(new CustomEvent('bg-changed', { detail: { url: resolved } }));
        }
        setToast(t('bgUpdated') || '背景已更新');
      } else {
        setToast(t('toastSubmitFailed'));
      }
    } catch {
      setToast(t('toastSubmitFailed'));
    }
    setBgUploading(false);
  };
  const handleResetBg = async () => {
    try { await api.resetBackground(); } catch {}
    setBgImageUri(DEFAULT_BG);
    setBgVersion((v) => v + 1);
    try { localStorage.removeItem('bg-image'); } catch {}
    if (typeof window !== 'undefined' && typeof (window as any).dispatchEvent === 'function') {
      (window as any).dispatchEvent(new CustomEvent('bg-changed', { detail: { url: DEFAULT_BG } }));
    }
    setToast(t('resetDefault') || '已恢复默认');
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
  const [expenseRefreshKey, setExpenseRefreshKey] = useState(0);
  const [userRefreshKey, setUserRefreshKey] = useState(0);

  // ── Data state for chart / supply / partner ──
  const [chart, setChart] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [procurements, setProcurements] = useState<any[]>([]);
  const [businessSummary, setBusinessSummary] = useState<{ cash_on_hand?: number; cumulative_revenue?: number; cumulative_expense?: number }>({});
  const navScaleAnims = useRef([...Array(5)].map(() => new Animated.Value(1))).current;

  // ── Daily revenue state ──
  const [revDate, setRevDate] = useState(todayDateStr());
  const [revDateErr, setRevDateErr] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [revRevenue, setRevRevenue] = useState('');
  const [revTurnover, setRevTurnover] = useState('');
  const [revJD, setRevJD] = useState('');
  const [revNote, setRevNote] = useState('');
  const [revYear] = useState(new Date().getFullYear());
  const [revMonth] = useState(new Date().getMonth() + 1);
  const [revSaving, setRevSaving] = useState(false);
  const [editingRevId, setEditingRevId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [last7Records, setLast7Records] = useState<any[]>([]);
  const [yesterdayRev, setYesterdayRev] = useState<any>(null);
  const [weekRev, setWeekRev] = useState<any>(null);
  const [revMarkedClosed, setRevMarkedClosed] = useState(false);
  const [toast, setToast] = useState('');

  const td = todayDateStr();
  const pickDate = (d: string) => { if (d <= td) setRevDate(d); };

  // ── Data fetching (matches web) ──
  const loadLast7 = useCallback(async () => {
    try {
      const r: any = await api.getLast7Days();
      setLast7Records(r.records || []);
    } catch { setToast(t('toastLoadFailed')); }
  }, []);
  const loadYesterday = useCallback(async () => {
    try {
      const yd = yesterdayStr();
      const r: any = await api.getDailyRevenue(1, 1, undefined, undefined, yd);
      setYesterdayRev(r.records?.[0] || null);
    } catch {}
  }, []);
  const loadWeekTotals = useCallback(async () => {
    try {
      const r: any = await api.getDailyRevenue(1, 1, undefined, undefined, undefined, 30);
      setWeekRev(r.totals || null);
    } catch {}
  }, []);

  useEffect(() => { loadLast7(); loadYesterday(); loadWeekTotals(); }, [loadLast7, loadYesterday, loadWeekTotals]);

  // ── Lazy load on tab change (chart / supply) ──
  const loadChart = useCallback(async () => {
    try { const d: any = await api.getChart(); setChart(d || []); } catch { setToast(t('toastLoadFailed')); }
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
  useEffect(() => {
    if (tab === 'chart') { loadChart(); loadBusinessSummary(); }
    if (tab === 'supply') { loadProducts(); loadProcurements(); }
  }, [tab, loadChart, loadBusinessSummary, loadProducts, loadProcurements]);

  // Check admin status (for User Management nav). Non-blocking — failure just means non-admin.
  useEffect(() => {
    api.admin.check().then((r: any) => {
      if (r && (r.is_admin === true || r.admin === true)) setIsAdmin(true);
    }).catch(() => {});
  }, []);

  // ── Daily revenue submit ──
  const submitDailyRev = async () => {
    if (!revTurnover || parseFloat(revTurnover) <= 0) { setToast(t('revTurnover') + ' 不能为空'); return; }
    setRevSaving(true);
    try {
      const payload = {
        date: revDate,
        revenue: parseFloat(revRevenue) || 0,
        turnover: parseFloat(revTurnover) || 0,
        jd_revenue: parseFloat(revJD) || 0,
        note: revNote,
        archived: revMarkedClosed ? 1 : 0,
      };
      if (editingRevId) {
        await api.updateDailyRevenue(editingRevId, payload);
      } else {
        await api.createDailyRevenue(payload);
      }
      setToast(t('revSaveToday') || '已保存');
      // Reset form
      setRevRevenue(''); setRevTurnover(''); setRevJD(''); setRevNote('');
      setEditingRevId(null); setRevMarkedClosed(false);
      // Reload
      loadLast7(); loadYesterday(); loadWeekTotals();
    } catch (e: any) { setToast(t('toastSubmitFailed') || e?.message); }
    setRevSaving(false);
  };
  const cancelEdit = () => {
    setEditingRevId(null);
    setRevRevenue(''); setRevTurnover(''); setRevJD(''); setRevNote('');
    setRevMarkedClosed(false);
  };

  const styles = useMemo(() => getStyles(colors), [colors]);
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
        {(onBack) => <ExpenseHistoryScreen onBack={onBack} />}
      </SlideScreen>
      <SlideScreen visible={showDailyHistory} onClose={() => setShowDailyHistory(false)}>
        {(onBack) => <DailyRevenueHistory onBack={onBack} />}
      </SlideScreen>
      <SlideScreen visible={showReconHistory} onClose={() => setShowReconHistory(false)}>
        {(onBack) => <ReconHistoryScreen onBack={onBack} />}
      </SlideScreen>

      {/* Profile / Invoice / User Management slide-overs (full-page sub-screens) */}
      <SlideScreen visible={showProfile} onClose={() => setShowProfile(false)}>
        {(onBack) => (
          <ProfileScreen
            onBack={onBack}
            onLogout={onLogout}
            onManageUsers={() => { setShowProfile(false); setTimeout(() => setShowUserMgmt(true), 250); }}
          />
        )}
      </SlideScreen>
      <SlideScreen visible={!!showInvoice} onClose={() => setShowInvoice(null)}>
        {(onBack) => <InvoiceScreen onBack={onBack} filterBatchId={showInvoice?.filterBatchId ?? null} />}
      </SlideScreen>
      <SlideScreen visible={showUserMgmt} onClose={() => setShowUserMgmt(false)}>
        {(onBack) => <UserManagementScreen
          key={userRefreshKey}
          onBack={onBack}
          onSelectUser={(u) => { setShowUserMgmt(false); setTimeout(() => setShowUserDetail(u), 250); }}
        />}
      </SlideScreen>
      <SlideScreen visible={!!showUserDetail} onClose={() => setShowUserDetail(null)}>
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
        <View style={styles.header}>
          <BlurView
            intensity={70}
            tint="systemUltraThinMaterialLight"
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={styles.headerInner}>
            <View style={styles.headerLeft}>
              <Image
                source={avatarUrl ? { uri: avatarUrl } : LOGO_IMAGE}
                style={styles.headerAvatar}
              />
              <Text style={styles.headerUser}>{usr}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => openModal(() => setShowBgModal(true))}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.headerBtn}
              >
                <Text style={styles.headerLink}>{t('bgSettings')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openModal(() => setShowLogoutModal(true))}
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
        </View>

        {/* Page content — matches web's `tab === 'partner' ? ... : tab === 'supply' ? ... : else` */}
        {!showExpenseHistory && !showDailyHistory && !showReconHistory && !showProfile && !showUserMgmt && !showUserDetail && !showInvoice && !showProcurementDetail && !showExpenseDetail && !showPdfPreview && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>

          {tab === 'partner' ? (
            <PartnerScreen onBack={() => setTab('list')} />
          ) : tab === 'supply' ? (
            <ProcurementScreen />
          ) : tab === 'expense' ? (
            <ExpenseScreen onReconHistory={() => setShowReconHistory(true)} onExpenseHistory={() => setShowExpenseHistory(true)} />
          ) : tab === 'list' ? (
            <DailyRevenueView
              colors={colors}
              styles={styles}
              revDate={revDate} setRevDate={setRevDate} revDateErr={revDateErr} setRevDateErr={setRevDateErr}
              pickDate={pickDate} td={td} fmtDateLabel={fmtDateLabel}
              editingRevId={editingRevId} cancelEdit={cancelEdit}
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
              chart={chart}
            />
          ) : null}
        </ScrollView>
        )}

        {/* Bottom nav — floating glass pill, icons only, matches web */}
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
      </View>

      {/* BG settings modal */}
      {showBgModal && (
        <Animated.View style={[styles.modalOverlay, { opacity: modalFade }]}>
          <Animated.View style={[styles.modalCard, { transform: [{ translateY: modalAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('bgSettings')}</Text>
              <TouchableOpacity onPress={() => closeModal(() => setShowBgModal(false))}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              <Text style={{ fontSize: 13, color: colors.textSub, textAlign: 'center' }}>{t('bgHint')}</Text>

              {/* Opacity row — web has a slider; iOS renders as 0/25/50/75/100% tap chips */}
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: colors.textSub }}>{t('opacity')}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMain, fontWeight: '600' }}>{(bgOpacity * 100).toFixed(0)}%</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[0, 0.25, 0.5, 0.75, 1].map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.opacityChip, Math.abs(bgOpacity - v) < 0.01 && styles.opacityChipActive]}
                      onPress={() => setBgOpacityPersist(v)}
                    >
                      <Text style={[styles.opacityChipText, Math.abs(bgOpacity - v) < 0.01 && styles.opacityChipTextActive]}>{(v * 100).toFixed(0)}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Theme picker — matches web's theme selector (color dots + name + description) */}
              <View>
                <Text style={{ fontSize: 12, color: colors.textSub, marginBottom: 8, fontWeight: '600' }}>{t('themePicker')}</Text>
                {allThemes.map(theme => {
                  const isActive = theme.colors.primary === colors.primary;
                  return (
                    <TouchableOpacity
                      key={theme.id}
                      onPress={() => setTheme(theme.id)}
                      style={[
                        styles.themePickerItem,
                        isActive && { backgroundColor: withAlpha(colors.primary, 0.06), borderColor: colors.primary, borderWidth: 1.5 },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', gap: 4, marginRight: 12 }}>
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.primary }} />
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: colors.secondary }} />
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.accent }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: isActive ? '700' : '500', color: colors.textSub }}>{theme.nameZh}</Text>
                        <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 1 }}>{theme.description}</Text>
                      </View>
                      {isActive && <Text style={{ fontSize: 14, color: colors.primary }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={[styles.modalBtn, { borderWidth: 1, borderColor: colors.secondary }]} onPress={() => closeModal(() => setShowBgModal(false))}>
                  <Text style={{ color: colors.textSub, fontSize: 14, fontWeight: '600' }}>{t('cancel')}</Text>
                </TouchableOpacity>
                {bgImageUri ? (
                  <TouchableOpacity
                    style={[styles.modalBtn, { borderWidth: 1, borderColor: colors.secondary }]}
                    onPress={handleResetBg}
                    disabled={bgUploading}
                  >
                    <Text style={{ color: colors.textSub, fontSize: 14, fontWeight: '600' }}>{t('resetDefault')}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1 }, bgUploading && { opacity: 0.5 }]}
                  onPress={handlePickBg}
                  disabled={bgUploading}
                >
                  <Text style={{ color: colors.surface, fontSize: 14, fontWeight: '600' }}>
                    {bgUploading ? (t('uploading') || '上传中…') : (t('chooseImage') || '选择图片')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Logout modal */}
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
              <Text style={{ fontSize: 15, color: colors.textMain, textAlign: 'center' }}>{t('logoutConfirm')}</Text>
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <TouchableOpacity style={[styles.modalBtn, { flex: 1, borderWidth: 1, borderColor: colors.secondary }]} onPress={() => closeModal(() => setShowLogoutModal(false))}>
                  <Text style={{ color: colors.textSub, fontSize: 14, fontWeight: '600' }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: colors.primary }]} onPress={() => closeModal(() => { api.logout().finally(() => onLogout()); })}>
                  <Text style={{ color: colors.surface, fontSize: 14, fontWeight: '600' }}>{t('confirmLogout')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      <DatePickerModal
        visible={showDatePicker}
        value={revDate}
        onClose={() => setShowDatePicker(false)}
        onSelect={(d) => { if (d <= td) { setRevDate(d); setRevDateErr(0); } }}
        minDate={td}
        title={t('billDate') || '选择日期'}
      />
      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

/* ── Chart tab view (matches web's tab=chart content) ─────────────── */

interface ChartGlassProps {
  colors: ThemeColors;
  businessSummary: { cash_on_hand?: number; cumulative_revenue?: number; cumulative_expense?: number };
  chart: any[];
}

function ChartGlassView({ colors, businessSummary, chart }: ChartGlassProps) {
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

  return (
    <View style={{ paddingBottom: 100, paddingTop: 4 }}>
      <View style={card}>
        <Text style={{ fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: 'rgba(0,0,0,0.9)', marginBottom: 16 }}>
          {t('summary')}
        </Text>
        <View style={{ alignItems: 'flex-start', gap: 2, marginBottom: 16 }}>
          <Text style={labelStyle}>{t('cashOnHand')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={symStyle}>¥</Text>
            <Text style={valueStyle}>{(businessSummary.cash_on_hand || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={subCard}>
            <Text style={subLabelStyle}>{t('cumulativeRevenue')}</Text>
            <Text style={subValueStyle}>¥{(businessSummary.cumulative_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
          <View style={subCard}>
            <Text style={subLabelStyle}>{t('cumulativeExpense')}</Text>
            <Text style={subValueStyle}>¥{(businessSummary.cumulative_expense || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        </View>
      </View>

      <View style={[card, { padding: 0, overflow: 'hidden' }]}>
        <View style={{ padding: 16, paddingBottom: 8 }}>
          <Text style={{ fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: 'rgba(0,0,0,0.9)' }}>{t('dailyTrend')}</Text>
        </View>
        <ChartMini chart={chart} />
      </View>
    </View>
  );
}

function ChartMini({ chart }: { chart: any[] }) {
  // Simple line chart for the monthly chart data. Falls back to an
  // empty state when no data. Renders inline so the chart tab doesn't
  // need a separate component file.
  if (!chart || chart.length === 0) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text style={{ color: 'rgba(0,0,0,0.4)', fontSize: FONTS.sub.size }}>{t('noData')}</Text>
      </View>
    );
  }
  const W = 360, H = 160, P = 24;
  const data = chart.slice(-12); // last 12 months
  const maxV = Math.max(1, ...data.map(d => Math.max(Number(d.income || 0), Number(d.expense || 0))));
  const minV = Math.min(0, ...data.map(d => Math.min(Number(d.income || 0), Number(d.expense || 0))));
  const xFor = (i: number) => P + (i * (W - P * 2)) / Math.max(1, data.length - 1);
  const yFor = (v: number) => {
    const range = maxV - minV || 1;
    return H - P - ((v - minV) / range) * (H - P * 2);
  };
  const linePath = (key: 'income' | 'expense') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(Number(d[key] || 0)).toFixed(1)}`).join(' ');
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Path d={`M ${P} ${H - P} L ${W - P} ${H - P}`} stroke="rgba(0,0,0,0.10)" strokeWidth={1} />
      <Path d={linePath('income')} fill="none" stroke="#4C7A5D" strokeWidth={2} />
      <Path d={linePath('expense')} fill="none" stroke="#7D2329" strokeWidth={2} />
      {data.map((d, i) => (
        <Path key={`ri-${i}`} d={`M ${xFor(i) - 2.5} ${yFor(Number(d.income || 0))} a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0`} fill="#4C7A5D" />
      ))}
      {data.map((d, i) => (
        <Path key={`re-${i}`} d={`M ${xFor(i) - 2.5} ${yFor(Number(d.expense || 0))} a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0`} fill="#7D2329" />
      ))}
    </Svg>
  );
}

/* ── Daily Revenue view (matches web's tab=list content) ─────────── */

interface DailyRevProps {
  colors: ThemeColors;
  styles: ReturnType<typeof getStyles>;
  revDate: string; setRevDate: (v: string) => void; revDateErr: number; setRevDateErr: (v: number) => void;
  pickDate: (d: string) => void; td: string; fmtDateLabel: (s: string) => string;
  editingRevId: number | null; cancelEdit: () => void;
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
        {/* ── Daily revenue entry card ── */}
        <View style={styles.revCard}>
          <View style={styles.revHeaderRow}>
            <View style={styles.revTitleGroup}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.textMain} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 3v18h18M7 16l4-8 4 4 4-6" />
              </Svg>
              <Text style={styles.revTitle}>{t('dailyRevenue')}</Text>
            </View>
            {p.editingRevId && (
              <TouchableOpacity onPress={p.cancelEdit} style={styles.cancelEditBtn}>
                <Text style={styles.cancelEditText}>✕ 取消</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick date pills */}
          <View style={styles.datePillRow}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[
                { label: t('revQuickToday'), d: p.td },
                { label: t('revQuickYesterday'), d: yesterdayStr() },
                { label: t('revQuickDB4') || '前天', d: db4Str() },
              ].map(pill => (
                <TouchableOpacity
                  key={pill.d}
                  onPress={() => p.pickDate(pill.d)}
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
              value={p.revRevenue} onChangeText={p.setRevRevenue}
              yesterdayValue={p.yesterdayRev?.revenue} colors={colors} styles={styles}
            />
            <RevInputCard
              title={t('revTurnover')} sub={t('revTurnoverSub')} symbol="¥"
              value={p.revTurnover} onChangeText={p.setRevTurnover}
              yesterdayValue={p.yesterdayRev?.turnover} colors={colors} styles={styles}
            />
            <RevInputCard
              title={t('revJD')} sub={t('revJDSub')} symbol="¥"
              value={p.revJD} onChangeText={p.setRevJD}
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
              onPress={() => p.setRevMarkedClosed(!p.revMarkedClosed)}
              activeOpacity={0.7}
            >
              <Text style={[styles.revArchiveText, p.revMarkedClosed && styles.revArchiveTextDone]}>
                {p.revMarkedClosed ? t('revCancelArchive') : t('revMarkArchive')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.revSubmitBtn, { flex: 4 }, (!p.revTurnover || parseFloat(p.revTurnover) <= 0 || p.revSaving) && { opacity: 0.5 }]}
              onPress={p.submitDailyRev}
              disabled={!p.revTurnover || parseFloat(p.revTurnover) <= 0 || p.revSaving}
              activeOpacity={0.8}
            >
              {p.revSaving ? <ActivityIndicator color={colors.surface} /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.surface} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <Path d="M17 21v-8H7v8" />
                  </Svg>
                  <Text style={styles.revSubmitText}>
                    {p.editingRevId ? t('revEdit') :
                      p.revDate === todayDateStr() ? t('revSaveToday') :
                      p.revDate === yesterdayStr() ? t('revSaveYesterday') :
                      t('revSaveDayBefore')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Last 30 days summary */}
          <View style={styles.revWeekRow}>
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={styles.revWeekLabel}>{t('revWeekRevenue')}</Text>
              <Text style={styles.revWeekVal}>¥{p.weekRev?.revenue ? p.weekRev.revenue.toFixed(2) : '0.00'}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.revWeekLabel}>{t('revWeekTurnover')}</Text>
              <Text style={styles.revWeekVal}>¥{p.weekRev?.turnover ? p.weekRev.turnover.toFixed(2) : '0.00'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.revWeekLabel}>{t('revWeekJD')}</Text>
              <Text style={styles.revWeekVal}>¥{p.weekRev?.jd_revenue ? p.weekRev.jd_revenue.toFixed(2) : '0.00'}</Text>
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
                    {rec.date === todayDateStr() && (
                      <View style={styles.rev7TodayTag}>
                        <Text style={styles.rev7TodayTagText}>{t('today')}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.rev7CardBadge, (!rec.recorded_by) ? styles.rev7CardBadgeGap : styles.rev7CardBadgeOk]}>
                    <View style={[styles.rev7CardDot, { backgroundColor: !rec.recorded_by ? colors.danger : colors.success }]} />
                    <Text style={[styles.rev7CardStatus, { color: !rec.recorded_by ? colors.danger : colors.success }]}>
                      {!rec.recorded_by ? t('revNotEntered') : t('revEntered')}
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
        {yesterdayValue ? `¥${yesterdayValue.toFixed(2)}` : t('revYesterdayNA')}
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

const getStyles = (colors: ThemeColors) => StyleSheet.create({
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
    paddingHorizontal: 20, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 6 },
  headerUser: { fontSize: FONTS.micro.size, color: withAlpha(colors.surface, 0.9), fontWeight: FONTS.micro.weight },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  headerLink: { fontSize: 13, color: withAlpha(colors.surface, 0.9), fontWeight: '600' },
  logoutBtn: { fontSize: 13, color: colors.surface, fontWeight: '700' },
  langRow: { flexDirection: 'row', gap: 4 },
  langBtnTouch: { paddingVertical: 6, paddingHorizontal: 4 },
  langBtn: { fontSize: 13, color: withAlpha(colors.surface, 0.75), paddingHorizontal: 8, paddingVertical: 3, fontWeight: '600' },
  langActive: { color: colors.surface, backgroundColor: withAlpha(colors.surface, 0.22), fontWeight: '800', borderRadius: 5, overflow: 'hidden' },

  // Content
  content: { flex: 1 },
  contentInner: { paddingBottom: 110, maxWidth: 520, width: '100%', alignSelf: 'center' },

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

  // Modal
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, width: 340, maxWidth: '90%', overflow: 'hidden' as const, ...modalCardAnimation },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.secondary },
  modalTitle: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: colors.textMain },
  modalClose: { fontSize: 18, color: colors.textSub, padding: 4 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },

  // BG settings modal extras
  opacityChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.bg, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  opacityChipActive: { backgroundColor: withAlpha(colors.primary, 0.12), borderColor: colors.primary },
  opacityChipText: { fontSize: 11, color: colors.textSub, fontWeight: '600' },
  opacityChipTextActive: { color: colors.primary },
  themePickerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.secondary },

  // Daily revenue card
  revCard: { backgroundColor: withAlpha(colors.surface, 0.92), borderRadius: 14, padding: 16, marginHorizontal: 16, marginTop: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
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
  revInputCard: { flex: 1, backgroundColor: withAlpha(colors.bg, 0.6), borderRadius: 10, padding: 10 },
  revInputCardTitle: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },
  revInputCardSub: { fontSize: 11, color: withAlpha(colors.textSub, 0.7), marginTop: 2, marginBottom: 6 },
  revInputCardInputWrap: { flexDirection: 'row', alignItems: 'center' },
  revInputCardSymbol: { fontSize: FONTS.body.size, color: colors.textSub, marginRight: 2 },
  revInputCardInput: { flex: 1, fontSize: FONTS.body.size, color: colors.textMain, padding: 0 },
  revInputCardFooter: { fontSize: FONTS.micro.size, color: colors.textSub, marginTop: 4 },
  revNoteInput: { backgroundColor: withAlpha(colors.bg, 0.6), borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: FONTS.body.size, color: colors.textMain, marginBottom: 10 },
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
