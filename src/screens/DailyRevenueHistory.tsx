import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import { toDec2 } from '../utils/numbers';
import { useServerDate } from '../hooks/useServerDate';
import { usePaginatedList } from '../hooks/usePaginatedList';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import DatePickerModal from '../components/DatePickerModal';
import HistoryHeader from '../components/HistoryHeader';
import FilterPanel from '../components/FilterPanel';
import DateErrorHint from '../components/DateErrorHint';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface Props { onBack: () => void }

/** Strict calendar months between two ISO dates */
function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  let m = (ty - fy) * 12 + (tm - fm);
  if (td < fd) m -= 1;
  return m;
}

function RevenueEmptyIcon({ color }: { color: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Path d="M14 2v6h6" />
      <Path d="M7 15l4-4 2 2 4-5" />
      <Path d="M17 8h.01" />
    </Svg>
  );
}

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

  const [showFilter, setShowFilter] = useState(false);
  const initFrom = sd.offset(-30);
  const initTo = sd.today;
  const [dateFrom, setDateFrom] = useState(initFrom);
  const [dateTo, setDateTo] = useState(initTo);
  const [appliedFrom, setAppliedFrom] = useState(initFrom);
  const [appliedTo, setAppliedTo] = useState(initTo);
  const [filterDateError, setFilterDateError] = useState(0);
  const [datePickTarget, setDatePickTarget] = useState<'from' | 'to' | null>(null);

  useEffect(() => { if (showFilter) setFilterDateError(0); }, [showFilter]);

  const rangeInvalid = useMemo(() =>
    !!(dateFrom && dateTo && dateFrom > dateTo),
    [dateFrom, dateTo]);
  const rangeTooLong = useMemo(() =>
    !!(dateFrom && dateTo && !rangeInvalid && monthsBetween(dateFrom, dateTo) > 24),
    [dateFrom, dateTo, rangeInvalid]);

  const fetchPage = useCallback(async (pg: number, perPage: number) => {
    const r: any = await api.getDailyRevenue(
      pg, perPage,
      undefined, undefined, undefined, undefined,
      appliedFrom || undefined,
      appliedTo || undefined,
    );
    return { records: r?.records || [], total: r?.total || 0, total_all: r?.total_all, pages: r?.pages || 1 };
  }, [appliedFrom, appliedTo]);

  const { records, total, totalAll, hasMore, loading, loadingMore, refresh, loadMore } = usePaginatedList({ fetcher: fetchPage });

  const filterKey = `${appliedFrom}|${appliedTo}`;
  useEffect(() => { refresh(); }, [filterKey]);

  const handleScroll = ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) {
      if (hasMore && !loadingMore) loadMore();
    }
  };

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
        onToggleFilter={() => setShowFilter(!showFilter)}
      />

      <FilterPanel visible={showFilter} onClose={() => setShowFilter(false)}>
        <DateErrorHint trigger={filterDateError} message={t('errDateFuture')} color={colors.danger} />
        {rangeInvalid && <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'right' }}>{t('errDateRange')}</Text>}
        {rangeTooLong && <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'right' }}>{t('errDateRangeTooLong')}</Text>}
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>{t('revenueDate')}</Text>
          <View style={styles.filterDateRange}>
            <TouchableOpacity style={styles.filterDateWrap} onPress={() => setDatePickTarget('from')} activeOpacity={0.7}>
              <Text style={dateFrom ? styles.filterDateText : styles.filterDatePlaceholder}>
                {dateFrom ? fmtDate(dateFrom) : t('any')}
              </Text>
            </TouchableOpacity>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.secondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 18l6-6-6-6"/>
            </Svg>
            <TouchableOpacity style={styles.filterDateWrap} onPress={() => setDatePickTarget('to')} activeOpacity={0.7}>
              <Text style={dateTo ? styles.filterDateText : styles.filterDatePlaceholder}>
                {dateTo ? fmtDate(dateTo) : t('any')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.filterResetBtn} onPress={resetFilters} activeOpacity={0.7}>
            <Text style={styles.filterResetBtnText}>{t('reset')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterApplyBtn, (rangeInvalid || rangeTooLong) && styles.filterApplyBtnDisabled]}
            disabled={rangeInvalid || rangeTooLong}
            onPress={() => { setAppliedFrom(dateFrom); setAppliedTo(dateTo); setShowFilter(false); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterApplyBtnText, (rangeInvalid || rangeTooLong) && styles.filterApplyBtnTextDisabled]}>{t('apply')}</Text>
          </TouchableOpacity>
        </View>
      </FilterPanel>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}
        onScroll={handleScroll} scrollEventThrottle={50}
        contentContainerStyle={{ paddingTop: showFilter ? 224 : 112, paddingHorizontal: 16, paddingBottom: 20 }}>
        {loading ? (
          <LoadingSpinner />
        ) : records.length === 0 ? (
          <EmptyState
            icon={<RevenueEmptyIcon color={colors.textSub} />}
            title={t('revEmpty')}
            hint={t('revEmptyHint')}
          />
        ) : (
          <>
            {records.map((rec: any, i: number) => (
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
                    <Text style={styles.archivedBadgeText}>{t('revMarkArchive')}</Text>
                  </View>
                ) : null}

                <View style={styles.cardAmounts}>
                  <View style={styles.cardAmtCol}>
                    <Text style={[styles.cardAmtVal, { color: rec.revenue > 0 ? colors.textMain : colors.textSub }]}>¥{toDec2(rec.revenue)}</Text>
                    <Text style={styles.cardAmtLabel}>{t('revRevenue')}</Text>
                  </View>
                  <View style={styles.cardAmtCol}>
                    <Text style={[styles.cardAmtVal, { color: rec.turnover > 0 ? colors.textMain : colors.textSub }]}>¥{toDec2(rec.turnover)}</Text>
                    <Text style={styles.cardAmtLabel}>{t('revTurnover')}</Text>
                  </View>
                  <View style={styles.cardAmtCol}>
                    <Text style={[styles.cardAmtVal, { color: rec.jd_revenue > 0 ? colors.textMain : colors.textSub }]}>¥{toDec2(rec.jd_revenue)}</Text>
                    <Text style={styles.cardAmtLabel}>{t('revJD')}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.cardFooterText}>{t('recordedBy')}:</Text>
                    {rec.recorded_by ? (
                      <Text style={styles.cardFooterText}>{rec.recorded_by}</Text>
                    ) : (
                      <Svg width={16} height={8} viewBox="0 0 16 8" fill="none" stroke={colors.secondary} strokeWidth={1.5} strokeLinecap="round">
                        <Path d="M2 4h12" />
                      </Svg>
                    )}
                  </View>
                </View>
                {rec.note ? (
                  <View style={styles.cardNote}>
                    <Text style={styles.cardNoteText}>{rec.note}</Text>
                  </View>
                ) : null}
              </View>
            ))}
            {hasMore && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>{t('loading')}...</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

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
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  list: { flex: 1 },

  card: {
    backgroundColor: colors.surface, borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1, borderColor: colors.secondary,
    gap: 12,
  } as any,
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
  archivedBadgeText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.danger },

  cardAmounts: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 8,
    backgroundColor: colors.surface, borderRadius: 8,
  },
  cardAmtCol: { alignItems: 'center', flex: 1, gap: 4 },
  cardAmtVal: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight },
  cardAmtLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },

  cardFooter: { borderTopWidth: 0.5, borderTopColor: colors.secondary, paddingTop: 8 },
  cardFooterText: { fontSize: FONTS.micro.size, color: colors.textSub },

  cardNote: { borderTopWidth: 0.5, borderTopColor: colors.secondary, paddingTop: 8, marginTop: 4 },
  cardNoteText: { fontSize: FONTS.micro.size, color: colors.textSub, lineHeight: 16 },

  loadingMore: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, gap: 8 },
  loadingMoreText: { fontSize: FONTS.sub.size, color: colors.primary },

  // Filter
  filterField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterLabel: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub, width: 64, flexShrink: 0 },
  filterDateRange: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterDateWrap: {
    flex: 1, height: 34,
    backgroundColor: colors.bg, borderRadius: 6,
    borderWidth: 1, borderColor: colors.secondary,
    justifyContent: 'center', paddingHorizontal: 8,
  },
  filterDateText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub },
  filterDatePlaceholder: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub, fontStyle: 'italic' },
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
  filterApplyBtnDisabled: { backgroundColor: colors.secondary },
  filterApplyBtnText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.surface },
  filterApplyBtnTextDisabled: { color: colors.textSub },
} as any);
