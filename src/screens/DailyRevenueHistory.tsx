import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import { useServerDate } from '../hooks/useServerDate';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import Toast from '../components/Toast';
import DatePickerModal from '../components/DatePickerModal';
import HistoryHeader from '../components/HistoryHeader';
import DateErrorHint from '../components/DateErrorHint';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface Props { onBack: () => void }

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  const l = getLang();
  if (l.startsWith('en')) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[+m-1]} ${+day}, ${y}`;
  }
  return `${y}/${m}/${day}`;
};

export default function DailyRevenueHistory({ onBack }: Props) {
  const { colors } = useTheme();
  const sd = useServerDate();
  const swipeBack = useSwipeBack(onBack);
  const styles = useMemo(() => getStyles(colors), [colors]);

  // Filter state — aligned with ReconHistoryScreen pattern
  const [showFilter, setShowFilter] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;

  const openFilter = () => { setFilterVisible(true); setShowFilter(true); Animated.spring(filterAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 24 }).start(); };
  const closeFilter = () => { Animated.timing(filterAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => { setFilterVisible(false); setShowFilter(false); }); };

  const initFrom = sd.offset(-30);
  const initTo = sd.today;
  const [dateFrom, setDateFrom] = useState(initFrom);
  const [dateTo, setDateTo] = useState(initTo);
  const [appliedFrom, setAppliedFrom] = useState(initFrom);
  const [appliedTo, setAppliedTo] = useState(initTo);
  const [filterDateError, setFilterDateError] = useState(0);
  const [datePickTarget, setDatePickTarget] = useState<'from' | 'to' | null>(null);

  useEffect(() => { if (showFilter) setFilterDateError(0); }, [showFilter]);

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r: any = await api.getDailyRevenue(
        1, 365,
        undefined, undefined, undefined, undefined,
        appliedFrom || undefined,
        appliedTo || undefined,
      );
      setRecords(r?.records || []);
      setTotal(r?.total || 0);
      setTotalAll(r?.total_all || 0);
    } catch { setToast(t('toastLoadFailed')); }
    setLoading(false);
  }, [appliedFrom, appliedTo]);

  useEffect(() => { load(); }, [load]);

  const rangeInvalid = !!(dateFrom && dateTo && dateFrom > dateTo);

  const resetFilters = () => {
    const from = sd.offset(-30);
    const to = sd.today;
    setDateFrom(from); setDateTo(to);
    setAppliedFrom(from); setAppliedTo(to);
  };

  const todayISO = sd.today;

  return (
    <View style={styles.root} {...swipeBack}>
      <HistoryHeader
        onBack={onBack}
        title={`${t('revHistoryBtn')} (${total}/${totalAll})`}
        filterActive={showFilter}
        onToggleFilter={() => showFilter ? closeFilter() : openFilter()}
      />

      {/* Filter panel — dark glass, aligned with ReconHistoryScreen */}
      {filterVisible && (
        <View style={{ position: 'absolute' as any, top: 100, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={closeFilter} />
          <Animated.View style={{ position: 'absolute', top: 0, left: 12, right: 12, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', transform: [{ translateY: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0], extrapolate: 'clamp' }) }], opacity: filterAnim } as any}>
            <BlurView intensity={45} tint="dark" style={{ padding: 16, borderRadius: 16 }}>
            <DateErrorHint trigger={filterDateError} message={t('errDateFuture')} color={colors.danger} />
            {rangeInvalid && <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'right', marginTop: 2 }}>{t('errDateRange')}</Text>}
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>{t('revenueDate')}</Text>
              <View style={styles.filterDateRange}>
                <TouchableOpacity style={styles.filterDateChip} onPress={() => setDatePickTarget('from')} activeOpacity={0.7}>
                  <Text style={styles.filterDateText}>{dateFrom ? fmtDate(dateFrom) : t('any')}</Text>
                </TouchableOpacity>
                <Text style={{ color: '#FFFFFF' }}>→</Text>
                <TouchableOpacity style={styles.filterDateChip} onPress={() => setDatePickTarget('to')} activeOpacity={0.7}>
                  <Text style={styles.filterDateText}>{dateTo ? fmtDate(dateTo) : t('any')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.filterResetBtn} onPress={resetFilters} activeOpacity={0.7}>
                <Text style={styles.filterResetBtnText}>{t('reset')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterApplyBtn, rangeInvalid && styles.filterApplyBtnDisabled]}
                disabled={rangeInvalid}
                onPress={() => { setAppliedFrom(dateFrom); setAppliedTo(dateTo); closeFilter(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterApplyBtnText, rangeInvalid && styles.filterApplyBtnTextDisabled]}>
                  {t('apply')}
                </Text>
              </TouchableOpacity>
            </View>
            </BlurView>
          </Animated.View>
        </View>
      )}

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: showFilter ? 266 : 112 }}>
        {loading ? (
          <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View>
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={1.5} strokeLinecap="round">
              <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <Path d="M14 2v6h6" />
              <Path d="M7 15l4-4 2 2 4-5" />
            </Svg>
            <Text style={styles.emptyText}>{t('revEmpty')}</Text>
          </View>
        ) : (
          records.map((rec: any, i: number) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardDate}>{fmtDate(rec.date)}</Text>
                <View style={[styles.statusBadge, (rec.status === '未录入' || !rec.recorded_by) ? styles.statusBadgeEmpty : styles.statusBadgeDone]}>
                  <View style={[styles.statusDot, (rec.status === '未录入' || !rec.recorded_by) ? styles.statusDotEmpty : styles.statusDotDone]} />
                  <Text style={[styles.statusText, (rec.status === '未录入' || !rec.recorded_by) ? styles.statusTextEmpty : styles.statusTextDone]}>
                    {rec.status === '未录入' || !rec.recorded_by ? t('revNotEntered') : t('revEntered')}
                  </Text>
                </View>
              </View>

              {rec.archived ? (
                <View style={styles.archivedBadge}>
                  <Text style={styles.archivedText}>{t('revMarkArchive')}</Text>
                </View>
              ) : null}

              <View style={styles.cardGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardAmtLabel}>{t('revRevenue')}</Text>
                  <Text style={[styles.cardAmtVal, { color: rec.revenue > 0 ? colors.textMain : colors.textSub }]}>¥{(rec.revenue || 0).toFixed(2)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardAmtLabel}>{t('revTurnover')}</Text>
                  <Text style={[styles.cardAmtVal, { color: rec.turnover > 0 ? colors.textMain : colors.textSub }]}>¥{(rec.turnover || 0).toFixed(2)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardAmtLabel}>{t('revJD')}</Text>
                  <Text style={[styles.cardAmtVal, { color: rec.jd_revenue > 0 ? colors.textMain : colors.textSub }]}>¥{(rec.jd_revenue || 0).toFixed(2)}</Text>
                </View>
              </View>

              {rec.note ? <Text style={styles.note}>{rec.note}</Text> : null}
              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('recordedBy')}: {rec.recorded_by || '—'}</Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Date Picker — single instance, aligned with ReconHistoryScreen */}
      <DatePickerModal
        visible={datePickTarget !== null}
        value={datePickTarget === 'from' ? dateFrom : dateTo}
        onClose={() => setDatePickTarget(null)}
        onSelect={(d: string) => {
          if (d > todayISO) { setFilterDateError(c => c + 1); return; }
          if (datePickTarget === 'from') setDateFrom(d);
          else setDateTo(d);
          setDatePickTarget(null);
        }}
        title={datePickTarget === 'from' ? t('startDate') : t('endDate')}
      />

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  list: { flex: 1, paddingHorizontal: 12 },
  empty: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyText: { color: colors.textSub, fontSize: 14 },

  card: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.secondary, gap: 10,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: colors.textMain },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 5,
  },
  statusBadgeEmpty: { backgroundColor: withAlpha(colors.danger, 0.1) },
  statusBadgeDone: { backgroundColor: withAlpha(colors.success, 0.1) },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotEmpty: { backgroundColor: colors.danger },
  statusDotDone: { backgroundColor: colors.success },
  statusText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight },
  statusTextEmpty: { color: colors.danger },
  statusTextDone: { color: colors.success },

  archivedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    backgroundColor: withAlpha(colors.danger, 0.1),
  },
  archivedText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.danger },

  cardGrid: {
    flexDirection: 'row', gap: 8,
    paddingVertical: 10, paddingHorizontal: 8,
    backgroundColor: colors.bg, borderRadius: 8,
  },
  cardAmtLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, marginBottom: 2 },
  cardAmtVal: { fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight },

  note: { fontSize: 12, color: colors.textSub, fontStyle: 'italic' },
  footer: { borderTopWidth: 0.5, borderTopColor: colors.secondary, paddingTop: 8 },
  footerText: { fontSize: FONTS.micro.size, color: colors.textSub },

  // Filter — dark glass, aligned with ReconHistoryScreen
  filterField: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  filterLabel: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: '#FFFFFF', width: 64, flexShrink: 0 },
  filterDateRange: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterDateChip: { flex: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', paddingHorizontal: 8 },
  filterDateText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: '#FFFFFF' },
  filterActions: { flexDirection: 'row', gap: 8, paddingTop: 6 },
  filterResetBtn: { flex: 1, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.secondary },
  filterResetBtnText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub },
  filterApplyBtn: { flex: 1, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },
  filterApplyBtnText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.surface },
  filterApplyBtnDisabled: { backgroundColor: colors.secondary },
  filterApplyBtnTextDisabled: { color: colors.surface },
} as any);
