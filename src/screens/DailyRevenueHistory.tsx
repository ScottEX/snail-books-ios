import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import Toast from '../components/Toast';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { modalClose, historyHeader } from '../sharedStyles';

const PAGE_SIZE = 30;

const todayStr = () => new Date().toISOString().split('T')[0];
const isFuture = (d: string) => d > todayStr();

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
  return <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'right', marginTop: 2 }}>{message}</Text>;
}

export default function DailyRevenueHistory({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  // Uncontrolled date refs — React Native Web <input type="date"> crashes with controlled value={state}
  const dateFromRef = useRef<HTMLInputElement>(null);
  const dateToRef = useRef<HTMLInputElement>(null);

  // Filter state
  const [showFilter, setShowFilter] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return fmtISO(d);
  });
  const [dateTo, setDateTo] = useState(() => fmtISO(new Date()));
  useEffect(() => { if (dateFromRef.current) dateFromRef.current.value = dateFrom; }, [dateFrom]);
  useEffect(() => { if (dateToRef.current) dateToRef.current.value = dateTo; }, [dateTo]);
  const [appliedFrom, setAppliedFrom] = useState(dateFrom);
  const [appliedTo, setAppliedTo] = useState(dateTo);
  const [filterDateError, setFilterDateError] = useState(0);
  const [dateFromKey, setDateFromKey] = useState(0);
  const [dateToKey, setDateToKey] = useState(0);

  const { colors } = useTheme();

  // Reset future-date error when filter panel opens
  useEffect(() => { if (showFilter) setFilterDateError(0); }, [showFilter]);

  // Date range validity — persistent hint while invalid
  const rangeInvalid = useMemo(() =>
    !!(dateFrom && dateTo && dateFrom > dateTo),
    [dateFrom, dateTo]);

  // Build filter params
  const getFilterParams = useCallback((): Record<string, string> => {
    const f: Record<string, string> = {};
    if (appliedFrom) f.date_from = appliedFrom;
    if (appliedTo) f.date_to = appliedTo;
    return f;
  }, [appliedFrom, appliedTo]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getDailyRevenue(1, 5000);
      const all = (r.records || []) as any[];
      // Server-side filtering not implemented for daily_revenue, do client-side
      let filtered = all;
      if (appliedFrom) filtered = filtered.filter((rec: any) => rec.date >= appliedFrom);
      if (appliedTo) filtered = filtered.filter((rec: any) => rec.date <= appliedTo);
      setRecords(filtered);
    } catch { setToast(t('toastLoadFailed')); }
    setLoading(false);
  }, [appliedFrom, appliedTo]);

  // Reload when filter params change
  const filterKey = `${appliedFrom}|${appliedTo}`;
  useEffect(() => {
    setRecords([]);
    loadRecords();
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Date formatter — trilingual
  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-');
    const l = getLang();
    if (l.startsWith('en')) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${months[+m-1]} ${+day}, ${y}`;
    }
    return `${y}/${m}/${day}`;
  };

  const toDec2 = (x: any) => String(parseFloat(x || 0).toFixed(2));

  const st = useMemo(() => getSt(colors), [colors]);

  return (
    <View style={st.root}>
      {/* Header — absolute frosted glass, matches ExpenseHistoryScreen */}
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <View style={st.backBtn}>
            <Text style={st.backArrow}>{'\u2039'}</Text>
          </View>
        </TouchableOpacity>
        <Text style={st.title}>{t('revHistoryBtn')} ({records.length})</Text>
        <TouchableOpacity
          style={[st.filterBtn, showFilter && st.filterBtnActive]}
          onPress={() => {
            if (!showFilter) {
              filterAnim.setValue(0);
              Animated.spring(filterAnim, { toValue: 1, useNativeDriver: true, tension: 170, friction: 26 }).start();
            }
            setShowFilter(!showFilter);
          }}
          activeOpacity={0.7}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
            stroke={showFilter ? colors.surface : colors.textSub} strokeWidth={2} strokeLinecap="round">
            <Path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Filter panel — matches ReconHistoryScreen */}
      {showFilter && (<>
        <Animated.View style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9998, opacity: filterAnim }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => {
            Animated.timing(filterAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setShowFilter(false));
          }} />
        </Animated.View>
        <Animated.View style={{
          position: 'fixed' as any, top: 108, left: 12, right: 12, zIndex: 9999,
          opacity: filterAnim,
          transform: [
            { translateY: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { scale: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        }}>
        <View style={st.filterPanel}>
          <View style={st.filterContent}>
            <DateErrorHint trigger={filterDateError} message={t('errDateFuture')} colors={colors} />
            {rangeInvalid && <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'right', marginTop: 2 }}>{t('errDateRange')}</Text>}
            <View style={st.filterField}>
              <Text style={st.filterLabel}>{t('filterDate')}</Text>
              <View style={st.filterDateRange}>
                <View style={st.filterDateWrap}>
                  {dateFrom ? (
                    <Text style={st.filterDateText}>{fmtDate(dateFrom)}</Text>
                  ) : (
                    <Text style={st.filterDatePlaceholder}>{t('any')}</Text>
                  )}
                  <input type="date" ref={dateFromRef} defaultValue={dateFrom} max={todayStr()} key={dateFromKey}
                    onChange={(e: any) => { if (isFuture(e.target.value)) { dateFromRef.current!.value = dateFrom; setDateFromKey(k => k + 1); setFilterDateError(c => c + 1); } else { setDateFrom(e.target.value); } }}
                    style={st.filterDateHidden as any} />
                </View>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.secondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginHorizontal: 2, transform: [{ translateY: -1 }] }}><Path d="M9 18l6-6-6-6"/></Svg>
                <View style={st.filterDateWrap}>
                  {dateTo ? (
                    <Text style={st.filterDateText}>{fmtDate(dateTo)}</Text>
                  ) : (
                    <Text style={st.filterDatePlaceholder}>{t('any')}</Text>
                  )}
                  <input type="date" ref={dateToRef} defaultValue={dateTo} max={todayStr()} key={dateToKey}
                    onChange={(e: any) => { if (isFuture(e.target.value)) { dateToRef.current!.value = dateTo; setDateToKey(k => k + 1); setFilterDateError(c => c + 1); } else { setDateTo(e.target.value); } }}
                    style={st.filterDateHidden as any} />
                </View>
              </View>
            </View>
            <View style={st.filterActions}>
              <TouchableOpacity style={st.filterResetBtn} onPress={() => {
                const d = new Date(); d.setMonth(d.getMonth() - 1);
                setDateFrom(fmtISO(d)); setDateTo(fmtISO(new Date()));
                setAppliedFrom(fmtISO(d)); setAppliedTo(fmtISO(new Date()));
              }} activeOpacity={0.7}>
                <Text style={st.filterResetBtnText}>{t('reset')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.filterApplyBtn, rangeInvalid && st.filterApplyBtnDisabled]}
                disabled={rangeInvalid}
                onPress={() => {
                  setAppliedFrom(dateFrom);
                  setAppliedTo(dateTo);
                  setShowFilter(false);
                }} activeOpacity={0.8}>
                <Text style={[st.filterApplyBtnText, rangeInvalid && st.filterApplyBtnTextDisabled]}>{t('apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
              </Animated.View>
      </>)}

      {/* List — card-based layout */}
      <ScrollView style={st.list} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: showFilter ? 166 : 112, paddingHorizontal: 16, paddingBottom: 80 }}>
        {loading ? (
          <View style={st.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={st.loadingText}>{t('loading')}</Text>
          </View>
        ) : records.length === 0 ? (
          <View style={st.emptyWrap}>
            <View style={st.emptyIcon}><Text style={st.emptyEmoji}>{'\uD83D\uDCCB'}</Text></View>
            <Text style={st.emptyTitle}>{t('revEmpty')}</Text>
            <Text style={st.emptyHint}>{t('revEmptyHint')}</Text>
          </View>
        ) : (
          records.map((rec: any, i: number) => (
            <View key={i} style={st.card}>
              {/* Top row: date + status badge */}
              <View style={st.cardTop}>
                <Text style={st.cardDate}>{fmtDate(rec.date)}</Text>
                <View style={[st.statusBadge, (rec.status === '未录入' || !rec.recorded_by) ? st.statusBadgeEmpty : st.statusBadgeDone]}>
                  <View style={[st.statusDot, (rec.status === '未录入' || !rec.recorded_by) ? st.statusDotEmpty : st.statusDotDone]} />
                  <Text style={[st.statusText, (rec.status === '未录入' || !rec.recorded_by) ? st.statusTextEmpty : st.statusTextDone]}>
                    {rec.status === '未录入' || !rec.recorded_by ? t('revNotEntered') : t('revEntered')}
                  </Text>
                </View>
              </View>

              {/* Archived badge */}
              {rec.archived ? (
                <View style={st.archivedBadge}>
                  <Text style={st.archivedBadgeText}>{t('revMarkArchive')}</Text>
                </View>
              ) : null}

              {/* Amount row: three columns */}
              <View style={st.cardAmounts}>
                <View style={st.cardAmtCol}>
                  {rec.revenue > 0 ? (
                    <Text style={[st.cardAmtVal, { color: colors.textMain }]}>¥{toDec2(rec.revenue)}</Text>
                  ) : (
                    <Svg width={24} height={12} viewBox="0 0 24 12" fill="none" stroke={colors.secondary} strokeWidth={2} strokeLinecap="round">
                      <Path d="M4 6h16" />
                    </Svg>
                  )}
                  <Text style={st.cardAmtLabel}>{t('revRevenue')}</Text>
                </View>
                <View style={st.cardAmtCol}>
                  {rec.turnover > 0 ? (
                    <Text style={[st.cardAmtVal, { color: colors.textMain }]}>¥{toDec2(rec.turnover)}</Text>
                  ) : (
                    <Svg width={24} height={12} viewBox="0 0 24 12" fill="none" stroke={colors.secondary} strokeWidth={2} strokeLinecap="round">
                      <Path d="M4 6h16" />
                    </Svg>
                  )}
                  <Text style={st.cardAmtLabel}>{t('revTurnover')}</Text>
                </View>
                <View style={st.cardAmtCol}>
                  {rec.jd_revenue > 0 ? (
                    <Text style={[st.cardAmtVal, { color: colors.textMain }]}>¥{toDec2(rec.jd_revenue)}</Text>
                  ) : (
                    <Svg width={24} height={12} viewBox="0 0 24 12" fill="none" stroke={colors.secondary} strokeWidth={2} strokeLinecap="round">
                      <Path d="M4 6h16" />
                    </Svg>
                  )}
                  <Text style={st.cardAmtLabel}>{t('revJD')}</Text>
                </View>
              </View>

              {/* Footer: recorded by */}
              <View style={st.cardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={st.cardFooterText}>{t('recordedBy')}:</Text>
                  {rec.recorded_by ? (
                    <Text style={st.cardFooterText}>{rec.recorded_by}</Text>
                  ) : (
                    <Svg width={16} height={8} viewBox="0 0 16 8" fill="none" stroke={colors.secondary} strokeWidth={1.5} strokeLinecap="round">
                      <Path d="M2 4h12" />
                    </Svg>
                  )}
                </View>
              </View>
              {/* Note */}
              {rec.note ? (
                <View style={st.cardNote}>
                  <Text style={st.cardNoteText}>{rec.note}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      {/* Bottom Nav — tap any tab → back to main */}
      <View style={st.bottomNav}>
        {['➕', '📋', '📦', '📊', '👤'].map((icon, i) => (
          <TouchableOpacity key={i} style={st.navItem} onPress={onBack} activeOpacity={0.7}>
            <Text style={st.navIcon}>{icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

function fmtISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const getSt = (colors: ThemeColors) => StyleSheet.create({
  /* Root */
  root: { flex: 1 },
  ...historyHeader(colors),

  /* Filter panel — matches ReconHistoryScreen */
  filterPanel: {
    backgroundColor: colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.secondary,
    overflow: 'hidden',
  },
  filterContent: { padding: 12, gap: 8 },
  filterField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterLabel: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub, width: 64, flexShrink: 0 },
  filterDateRange: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterDateWrap: {
    flex: 1, height: 34, position: 'relative' as any,
    backgroundColor: colors.surface, borderRadius: 6,
    borderWidth: 1, borderColor: colors.secondary,
    justifyContent: 'center', paddingHorizontal: 8,
  },
  filterDateText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub },
  filterDatePlaceholder: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub },
  filterDateHidden: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.01, cursor: 'pointer', width: '100%', height: '100%',
  },
  filterActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  filterResetBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    backgroundColor: colors.secondary, borderRadius: 8,
  },
  filterResetBtnText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub },
  filterApplyBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    backgroundColor: colors.primary, borderRadius: 8,
  },
  filterApplyBtnDisabled: {
    backgroundColor: colors.secondary,
  },
  filterApplyBtnText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.surface },
  filterApplyBtnTextDisabled: {
    color: colors.textSub,
  },

  /* List */
  list: { flex: 1 },

  /* Card */
  card: {
    backgroundColor: colors.surface, borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1, borderColor: colors.secondary,
    // @ts-ignore
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    gap: 12,
  },
  /* Card top: date + status */
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
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

  /* Amount row */
  cardAmounts: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 8,
    backgroundColor: colors.surface, borderRadius: 8,
  },
  cardAmtCol: { alignItems: 'center', flex: 1, gap: 4 },
  cardAmtVal: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight },
  cardAmtLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },

  /* Footer */
  cardFooter: {
    borderTopWidth: 0.5, borderTopColor: colors.secondary,
    paddingTop: 8,
  },
  cardFooterText: { fontSize: FONTS.micro.size, color: colors.textSub },

  /* Archived badge */
  archivedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    backgroundColor: withAlpha(colors.danger, 0.1),
  },
  archivedBadgeText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.danger },

  /* Note display */
  cardNote: { borderTopWidth: 0.5, borderTopColor: colors.secondary, paddingTop: 8, marginTop: 4 },
  cardNoteText: { fontSize: FONTS.micro.size, color: colors.textSub, lineHeight: 16 },

  /* Empty state */
  emptyWrap: { marginTop: 80, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.secondary },
  emptyEmoji: { fontSize: FONTS.h1.size },
  emptyTitle: { fontSize: FONTS.body.size, fontWeight: '500', color: colors.textSub },
  emptyHint: { fontSize: FONTS.sub.size, color: colors.textSub, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },

  /* Loading */
  loading: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 40, gap: 8 },
  loadingText: { fontSize: FONTS.sub.size, color: colors.primary },

  /* Bottom Nav */
  bottomNav: {
    position: 'fixed' as any,
    bottom: 16, left: '50%',
    transform: 'translateX(-50%)' as any,
    flexDirection: 'row', gap: 6,
    backgroundColor: withAlpha(colors.bg, 0.60),
    borderRadius: 28, paddingVertical: 6, paddingHorizontal: 8,
    // @ts-ignore
    backdropFilter: 'saturate(200%) blur(30px)',
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.10)',
    zIndex: 100,
  },
  navItem: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  navIcon: { fontSize: FONTS.amount.size },
});
