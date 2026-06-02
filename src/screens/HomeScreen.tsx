import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput,
  Animated, ImageBackground, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { t, setLang, getLang, langs } from '../i18n';
import { api } from '../api/client';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import Toast from '../components/Toast';
import SlideScreen from '../components/SlideScreen';
import PartnerScreen from './PartnerScreen';
import ProcurementScreen from './ProcurementScreen';
import ExpenseScreen from './ExpenseScreen';
import ReconHistoryScreen from './ReconHistoryScreen';
import ExpenseHistoryScreen from './ExpenseHistoryScreen';
import DailyRevenueHistory from './DailyRevenueHistory';
import { modalCardAnimation, modalClose } from '../sharedStyles';

const BG_IMAGE = require('../../assets/img/bg.jpg');

type Tab = 'list' | 'expense' | 'supply' | 'chart' | 'partner';

// ── Date helpers ──
const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayDateStr = () => fmtDate(new Date());
const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate()-1); return fmtDate(d); };
const db4Str = () => { const d = new Date(); d.setDate(d.getDate()-2); return fmtDate(d); };
const isFuture = (d: string) => d > todayDateStr();

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
  const [lang, setLangState] = useState(getLang());
  const usr = useMemo(() => { try { return localStorage.getItem('user') || '用户'; } catch { return '用户'; } }, []);

  // ── Background image ──
  const [bgImage] = useState(() => { try { return localStorage.getItem('bg-image') || 'bg.jpg'; } catch { return 'bg.jpg'; } });
  const [bgOpacity, setBgOpacity] = useState(() => { try { const s = localStorage.getItem('bg-opacity'); return s !== null ? parseFloat(s) : 0.5; } catch { return 0.5; } });
  const setBgOpacityPersist = (v: number) => {
    setBgOpacity(v);
    try { localStorage.setItem('bg-opacity', String(v)); } catch {}
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

  // ── Data state for chart / supply / partner ──
  const [chart, setChart] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [procurements, setProcurements] = useState<any[]>([]);
  const navScaleAnims = useRef([...Array(5)].map(() => new Animated.Value(1))).current;

  // ── Daily revenue state ──
  const [revDate, setRevDate] = useState(todayDateStr());
  const [revDateErr, setRevDateErr] = useState(0);
  const [revRevenue, setRevRevenue] = useState('');
  const [revTurnover, setRevTurnover] = useState('');
  const [revJD, setRevJD] = useState('');
  const [revNote, setRevNote] = useState('');
  const [revYear] = useState(new Date().getFullYear());
  const [revMonth] = useState(new Date().getMonth() + 1);
  const [revSaving, setRevSaving] = useState(false);
  const [editingRevId, setEditingRevId] = useState<number | null>(null);
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
  const loadProducts = useCallback(async () => {
    try { const p: any = await api.getProducts(); setProducts(p || []); } catch { setToast(t('toastLoadFailed')); }
  }, []);
  const loadProcurements = useCallback(async () => {
    try { const p: any = await api.getProcurements(); setProcurements(p || []); } catch { setToast(t('toastLoadFailed')); }
  }, []);
  useEffect(() => {
    if (tab === 'chart') loadChart();
    if (tab === 'supply') { loadProducts(); loadProcurements(); }
  }, [tab, loadChart, loadProducts, loadProcurements]);

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
  const switchLang = (l: string) => { setLang(l); setLangState(l); };

  // ── Date label formatter (localized) ──
  const fmtDateLabel = (s: string) => {
    const l = getLang();
    const [y, m, d] = s.split('-');
    if (l === 'zh-TW') return `${y}年${m}月${d}日`;
    return `${y}年${m}月${d}日`;
  };

  return (
    <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
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

      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header — matches web's headerInner */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <Circle cx="12" cy="7" r="4" />
            </Svg>
            <Text style={styles.headerUser}>{usr}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => openModal(() => setShowBgModal(true))} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ marginRight: 8 }}>
              <Text style={styles.headerLink}>{t('bgSettings')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openModal(() => setShowLogoutModal(true))} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.logoutBtn}>{t('logout')}</Text>
            </TouchableOpacity>
            <View style={styles.langRow}>
              {langs.map(([l, label]) => (
                <TouchableOpacity key={l} onPress={() => switchLang(l)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <Text style={[styles.langBtn, lang === l && styles.langActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Page content — matches web's `tab === 'partner' ? ... : tab === 'supply' ? ... : else` */}
        {!showExpenseHistory && !showDailyHistory && !showReconHistory && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>

          {tab === 'partner' ? (
            <PartnerScreen onBack={() => setTab('list')} />
          ) : tab === 'supply' ? (
            <ProcurementScreen />
          ) : tab === 'expense' ? (
            <ExpenseScreen onReconHistory={() => setShowReconHistory(true)} onExpenseHistory={() => setShowExpenseHistory(true)} />
          ) : (
            <DailyRevenueView
              colors={colors}
              styles={styles}
              revDate={revDate} setRevDate={setRevDate} revDateErr={revDateErr} setRevDateErr={setRevDateErr}
              pickDate={pickDate} td={td} fmtDateLabel={fmtDateLabel}
              editingRevId={editingRevId} cancelEdit={cancelEdit}
              revRevenue={revRevenue} setRevRevenue={setRevRevenue}
              revTurnover={revTurnover} setRevTurnover={setRevTurnover}
              revJD={revJD} setRevJD={setRevJD}
              revNote={revNote} setRevNote={setRevNote}
              revMarkedClosed={revMarkedClosed} setRevMarkedClosed={setRevMarkedClosed}
              revSaving={revSaving} submitDailyRev={submitDailyRev}
              yesterdayRev={yesterdayRev} weekRev={weekRev} last7Records={last7Records}
              onShowDailyHistory={() => setShowDailyHistory(true)}
            />
          )}
        </ScrollView>
        )}

        {/* Bottom nav */}
        <View style={styles.bottomNav}>
          {NAV_ITEMS.map(({ id, labelKey, icon }, i) => {
            const active = tab === id;
            const c = active ? colors.textMain : colors.textSub;
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
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{t(labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
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
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.modalBtn, { borderWidth: 1, borderColor: colors.secondary }]} onPress={() => closeModal(() => setShowBgModal(false))}>
                  <Text style={{ color: colors.textSub, fontSize: 14, fontWeight: '600' }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={() => closeModal(() => setShowBgModal(false))}>
                  <Text style={{ color: colors.surface, fontSize: 14, fontWeight: '600' }}>{t('chooseImage') || t('resetDefault')}</Text>
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
                <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: colors.primary }]} onPress={() => closeModal(() => { localStorage.removeItem('user'); onLogout(); })}>
                  <Text style={{ color: colors.surface, fontSize: 14, fontWeight: '600' }}>{t('confirmLogout')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </ImageBackground>
  );
}

/* ── Daily Revenue view (matches web's tab=list/chart content) ─────── */

interface DailyRevProps {
  colors: ThemeColors;
  styles: ReturnType<typeof getStyles>;
  revDate: string; setRevDate: (v: string) => void; revDateErr: number; setRevDateErr: (v: number) => void;
  pickDate: (d: string) => void; td: string; fmtDateLabel: (s: string) => string;
  editingRevId: number | null; cancelEdit: () => void;
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
              onPress={() => p.setRevDate(p.td)}
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
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
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
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerUser: { fontSize: FONTS.micro.size, color: withAlpha(colors.surface, 0.9), fontWeight: FONTS.micro.weight },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLink: { fontSize: FONTS.micro.size, color: withAlpha(colors.surface, 0.85), fontWeight: FONTS.micro.weight },
  logoutBtn: { fontSize: FONTS.micro.size, color: colors.surface, fontWeight: FONTS.micro.weight },
  langRow: { flexDirection: 'row', gap: 4 },
  langBtn: { fontSize: FONTS.micro.size, color: withAlpha(colors.surface, 0.7), paddingHorizontal: 6, paddingVertical: 2, fontWeight: FONTS.micro.weight },
  langActive: { color: colors.surface, backgroundColor: withAlpha(colors.surface, 0.18), fontWeight: FONTS.microBold.weight, borderRadius: 4 },

  // Content
  content: { flex: 1 },
  contentInner: { paddingBottom: 24, maxWidth: 520, width: '100%', alignSelf: 'center' },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: withAlpha(colors.surface, 0.92),
    borderTopWidth: 1, borderTopColor: withAlpha(colors.textSub, 0.1),
    paddingTop: 8, paddingBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 6,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  navIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  navIconWrapActive: { backgroundColor: withAlpha(colors.textMain, 0.08) },
  navLabel: { fontSize: 11, color: colors.textSub, fontWeight: '500', marginTop: 2 },
  navLabelActive: { color: colors.textMain, fontWeight: '700' },

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
