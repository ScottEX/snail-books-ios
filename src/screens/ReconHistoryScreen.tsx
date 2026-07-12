import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated, PanResponder, StatusBar, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Line } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import { usePaginatedList } from '../hooks/usePaginatedList';
import EmptyState from '../components/EmptyState';
import { useToast } from '../hooks/useToast';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { modalClose, MODAL_CARD_RADIUS } from '../sharedStyles';
import ModalOverlay from '../components/ModalOverlay';
import { fmtAmtFull } from '../utils/format';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DatePickerModal from '../components/DatePickerModal';
import HistoryHeader from '../components/HistoryHeader';
import FilterPanel from '../components/FilterPanel';
import DateErrorHint from '../components/DateErrorHint';
import { useServerDate } from '../hooks/useServerDate';
import LoadingSpinner from '../components/LoadingSpinner';

/* ── Helpers ── */
/** Strict calendar months between two ISO dates */
function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  let m = (ty - fy) * 12 + (tm - fm);
  if (td < fd) m -= 1;
  return m;
}

/** Swipe-right-from-left-edge to go back. Native PanResponder version. */
function useSwipeBack(onBack: () => void) {
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) =>
      gs.dx > 15 && Math.abs(gs.dy) < 15 && gs.moveX < 36,
    onPanResponderRelease: (_, gs) => { if (gs.dx > 80) onBack(); },
  })).current;
  return pan.panHandlers;
}

function ReconEmptyIcon({ color }: { color: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

interface Props { onBack: () => void }

export default function ReconHistoryScreen({ onBack }: Props) {
  const sd = useServerDate();
  const swipeBack = useSwipeBack(onBack);

  const [selected, setSelected] = useState<any>(null);
  const selectedRef = useRef<any>(null);
  const { showToast, ToastHost } = useToast();

  const { colors } = useTheme();
  const st = useMemo(() => getSt(colors), [colors]);

  const [showFilter, setShowFilter] = useState(false);

  // ── Filter state — use server time defaults ──
  const initFrom = sd.offset(-30);
  const initTo = sd.today;
  const [filDateFrom, setFilDateFrom] = useState(initFrom);
  const [filDateTo, setFilDateTo] = useState(initTo);
  const [filBy, setFilBy] = useState('');
  const [appliedFrom, setAppliedFrom] = useState(initFrom);
  const [appliedTo, setAppliedTo] = useState(initTo);
  const [appliedBy, setAppliedBy] = useState('');
  const [filterDateError, setFilterDateError] = useState(0);
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const [datePickTarget, setDatePickTarget] = useState<'from' | 'to' | null>(null);
  const [showUserPick, setShowUserPick] = useState(false);
  const userDropAnim = useRef(new Animated.Value(0)).current;
  const dropScale = useRef(new Animated.Value(0.85)).current;
  const dropSlide = useRef(new Animated.Value(12)).current;
  const dropScrollRef = useRef<ScrollView>(null);

  const openUserDrop = () => {
    if (showUserPick) { closeUserDrop(); return; }
    setShowUserPick(true);
    dropScale.setValue(0.85);
    dropSlide.setValue(12);
    userDropAnim.setValue(0);
    Animated.parallel([
      Animated.spring(dropScale, { toValue: 1, useNativeDriver: true, bounciness: 8, speed: 14 }),
      Animated.spring(dropSlide, { toValue: 0, useNativeDriver: true, bounciness: 8, speed: 14 }),
      Animated.timing(userDropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    // Scroll to selected item
    setTimeout(() => {
      const idx = filBy === '' ? 0 : users.findIndex(u => u.username === filBy) + 1;
      if (idx >= 0) {
        dropScrollRef.current?.scrollTo({ y: idx * 40 + 4, animated: false });
      }
    }, 100);
  };
  const closeUserDrop = () => {
    Animated.parallel([
      Animated.timing(dropScale, { toValue: 0.85, duration: 180, useNativeDriver: true }),
      Animated.timing(dropSlide, { toValue: 12, duration: 180, useNativeDriver: true }),
      Animated.timing(userDropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setShowUserPick(false));
  };

  // Reset error when filter panel opens
  useEffect(() => { if (showFilter) setFilterDateError(0); }, [showFilter]);

  // Date range validation
  const rangeInvalid = useMemo(() =>
    (!!filDateFrom && !!filDateTo && filDateFrom > filDateTo),
    [filDateFrom, filDateTo]);
  const rangeTooLong = useMemo(() =>
    (!!filDateFrom && !!filDateTo && !rangeInvalid && monthsBetween(filDateFrom, filDateTo) > 24),
    [filDateFrom, filDateTo, rangeInvalid]);

  useEffect(() => { if (showFilter && users.length === 0) { api.getUsers().then(data => setUsers(data || [])).catch(() => { }); } }, [showFilter]);

  const getFilterParams = useCallback((): Record<string, string> => {
    const f: Record<string, string> = {};
    if (appliedFrom) f.date_from = appliedFrom;
    if (appliedTo) f.date_to = appliedTo;
    if (appliedBy) f.reconciled_by = appliedBy;
    return f;
  }, [appliedFrom, appliedTo, appliedBy]);

  const { records, total, totalAll, hasMore, loading, loadingMore, refresh, loadMore } = usePaginatedList({
    fetcher: useCallback(async (pg: number, perPage: number) => {
      const data: any = await api.getReconciliationsPage(pg, perPage, getFilterParams());
      return { records: data?.records || [], total: data?.total || 0, total_all: data?.total_all, pages: data?.pages || 1 };
    }, [getFilterParams]),
  });

  const filterKey = `${appliedFrom}|${appliedTo}|${appliedBy}`;
  useEffect(() => { refresh(); }, [filterKey]);

  const handleScroll = ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const padToBottom = 20;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - padToBottom) {
      if (hasMore && !loadingMore) loadMore();
    }
  };

  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-');
    const l = getLang();
    if (l.startsWith('en')) { const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${months[+m-1]} ${+day}, ${y}`; }
    return `${y}/${m}/${day}`;
  };

  const fmtDateTime = (d: string) => {
    const [datePart, timePart] = (d || '').split(' ');
    const [y, m, day] = (datePart || '').split('-');
    if (!y) return d;
    const l = getLang();
    if (l.startsWith('en')) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return timePart ? `${months[+m-1]} ${+day}, ${y} ${timePart}` : `${months[+m-1]} ${+day}, ${y}`;
    }
    return timePart ? `${y}年${+m}月${+day}日 ${timePart}` : `${y}年${+m}月${+day}日`;
  };

  const renderCard = (r: any) => (
    <TouchableOpacity key={r.id} style={st.card} onPress={() => { selectedRef.current = r; setSelected(r); }} activeOpacity={0.7}>
      <View style={st.dateRow}>
        <View style={st.dateItem}><Text style={st.dateLabel}>{t('reconDate')}</Text><Text style={st.dateVal}>{fmtDateTime(r.created_at || r.date)}</Text></View>
        <View style={st.dateSep} />
        <View style={st.dateItem}><Text style={st.dateLabel}>{t('billDate')}</Text><Text style={st.dateVal}>{fmtDate(r.bill_date || r.date)}</Text></View>
      </View>
      {r.reconciled_by ? (
        <View style={st.reconByRow}><Text style={st.reconByText}>{t('reconciledBy')}: {r.reconciled_by}</Text></View>
      ) : null}
      <View style={st.cardPairRow}>
        <View style={st.cardPairCol}>
          <View style={st.cardPairItem}><Text style={st.cardPairLabel}>{t('bookBalance')}</Text><Text style={st.cardPairVal}>{fmtAmtFull(r.cash_on_hand)}</Text></View>
          <View style={st.cardPairDiv} />
          <View style={st.cardPairItem}><Text style={st.cardPairLabel}>{t('cardBalance')}</Text><Text style={st.cardPairVal}>{fmtAmtFull(r.card_balance)}</Text></View>
        </View>
        <View style={st.cardPairCol}>
          <View style={st.cardPairItem}><Text style={st.cardPairLabel}>{t('currentBalance')}</Text><Text style={st.cardPairVal}>{fmtAmtFull(r.real_total)}</Text></View>
          <View style={st.cardPairDiv} />
          <View style={st.cardPairItem}><Text style={st.cardPairLabel}>{t('cashBalance')}</Text><Text style={st.cardPairVal}>{fmtAmtFull(r.cash_balance)}</Text></View>
        </View>
        <View style={st.cardPairCol}>
          <View style={st.cardPairItem}><Text style={st.cardPairLabel}>{t('bookDiff')}</Text><Text style={[st.cardPairVal, { color: r.diff > 0.005 ? colors.success : r.diff < -0.005 ? colors.danger : colors.textMain }]}>{r.diff >= 0 ? '+' : '-'}{fmtAmtFull(Math.abs(r.diff))}</Text></View>
          <View style={st.cardPairDiv} />
          <View style={st.cardPairItem}><Text style={st.cardPairLabel}>{t('fundsInTransit')}</Text><Text style={[st.cardPairVal, { color: (Math.abs(r.channel_total) < 0.005) ? colors.textMain : colors.primary }]}>{fmtAmtFull(r.channel_total)}</Text></View>
        </View>
      </View>
      <Text style={st.tapHint}>{t('tapForDetail')}</Text>
    </TouchableOpacity>
  );

  const resetFilters = () => {
    const dFrom = sd.offset(-30);
    const dTo = sd.today;
    setFilDateFrom(dFrom); setFilDateTo(dTo); setFilBy('');
    setAppliedFrom(dFrom); setAppliedTo(dTo); setAppliedBy('');
  };

  const todayISO = sd.today;
  const closeFilter = () => { setShowFilter(false); setShowUserPick(false); };

  return (
    <View style={st.root} {...swipeBack}>
      <StatusBar barStyle="dark-content" />
      <HistoryHeader
        onBack={onBack}
        title={`${t('reconHistory')} (${total}/${totalAll})`}
        filterActive={showFilter}
        onToggleFilter={() => setShowFilter(!showFilter)}
      />

      {/* Filter — dark glass via FilterPanel (BlurView inside) */}
      <FilterPanel visible={showFilter} onClose={closeFilter}>
        <DateErrorHint trigger={filterDateError} message={t('errDateFuture')} color={colors.danger} />
        {rangeInvalid && <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'right', marginTop: 2 }}>{t('errDateRange')}</Text>}
        {rangeTooLong && <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'right', marginTop: 2 }}>{t('errDateRangeTooLong')}</Text>}
        <View style={st.filterField}>
          <Text style={st.filterLabel}>{t('reconDate')}</Text>
          <View style={st.filterDateRange}>
            <TouchableOpacity style={st.filterDateChip} onPress={() => setDatePickTarget('from')} activeOpacity={0.7}>
              <Text style={st.filterDateText}>{filDateFrom ? fmtDate(filDateFrom) : t('any')}</Text>
            </TouchableOpacity>
            <Text style={{ color: '#FFFFFF' }}>→</Text>
            <TouchableOpacity style={st.filterDateChip} onPress={() => setDatePickTarget('to')} activeOpacity={0.7}>
              <Text style={st.filterDateText}>{filDateTo ? fmtDate(filDateTo) : t('any')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={st.filterField}>
          <Text style={st.filterLabel}>{t('reconciledBy')}</Text>
          <View style={st.filterSelectWrap}>
            <TouchableOpacity style={{ flex: 1, height: '100%', justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center' }} onPress={openUserDrop} activeOpacity={0.7}>
              <Text style={st.filterSelectText}>{filBy || t('any')}</Text>
              <Svg width={12} height={12} viewBox="0 0 1024 1024" style={{ marginLeft: 4, transform: [{ rotate: showUserPick ? '180deg' : '0deg' }] }}>
                <Path d="M836.899 399.237l-218.01 335.037c-47.506 73.007-166.272 73.007-213.778 0l-218.01-335.037C139.595 326.23 198.977 234.97 293.99 234.97h436.02c95.013 0 154.395 91.26 106.889 164.267z" fill="#FFFFFF" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
        <View style={st.filterActions}>
          <TouchableOpacity style={st.filterResetBtn} onPress={resetFilters} activeOpacity={0.7}>
            <Text style={st.filterResetBtnText}>{t('reset')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.filterApplyBtn, (rangeInvalid || rangeTooLong) && st.filterApplyBtnDisabled]}
            disabled={rangeInvalid || rangeTooLong}
            onPress={() => { setAppliedFrom(filDateFrom); setAppliedTo(filDateTo); setAppliedBy(filBy); closeFilter(); }}
            activeOpacity={0.8}
          >
            <Text style={[st.filterApplyBtnText, (rangeInvalid || rangeTooLong) && st.filterApplyBtnTextDisabled]}>
              {t('apply')}
            </Text>
          </TouchableOpacity>
        </View>
      </FilterPanel>

      {/* User dropdown — moved outside FilterPanel to avoid overflow clipping */}
      {showUserPick && (
        <Animated.View style={{
          position: 'absolute' as any, top: 212, left: 100, width: 160, zIndex: 10000,
          opacity: userDropAnim,
          transform: [{ translateY: dropSlide }, { scale: dropScale }],
        }}>
          <BlurView intensity={45} tint="dark" style={{ borderRadius: 10, overflow: 'hidden' as any }}>
            <ScrollView ref={dropScrollRef} style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            <TouchableOpacity onPress={() => { setFilBy(''); closeUserDrop(); }} activeOpacity={0.6} style={{ paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 4, marginTop: 4, borderRadius: 8, backgroundColor: filBy === '' ? 'rgba(10,132,255,0.15)' : 'transparent' }}>
              <Text style={{ fontSize: FONTS.sub.size, color: filBy === '' ? '#0A84FF' : '#FFFFFF', fontWeight: filBy === '' ? '700' : FONTS.sub.weight }}>{t('any')}</Text>
            </TouchableOpacity>
            {users.map((u, i) => (
              <TouchableOpacity key={u.id} onPress={() => { setFilBy(u.username); closeUserDrop(); }} activeOpacity={0.6} style={{ paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 4, marginBottom: i === users.length - 1 ? 4 : 0, borderRadius: 8, backgroundColor: filBy === u.username ? 'rgba(10,132,255,0.15)' : 'transparent' }}>
                <Text style={{ fontSize: FONTS.sub.size, color: filBy === u.username ? '#0A84FF' : '#FFFFFF', fontWeight: filBy === u.username ? '700' : FONTS.sub.weight }}>{u.username}</Text>
              </TouchableOpacity>
            ))}
            </ScrollView>
          </BlurView>
        </Animated.View>
      )}

      {/* Toast */}
      {ToastHost}

      {/* List */}
      <ScrollView style={st.list} showsVerticalScrollIndicator={false}
        onScroll={handleScroll} scrollEventThrottle={50}
        contentContainerStyle={{ paddingTop: showFilter ? 296 : 112 }}>
        {loading ? (
          <LoadingSpinner />
        ) : records.length === 0 ? (
            <EmptyState icon={<ReconEmptyIcon color={colors.textSub} />} title={t('noRecords')} hint={t('emptyReconHint')} />
          ) : (
            <>
              {records.map(renderCard)}
              {hasMore && (
                <View style={st.loadingMore}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={st.loadingMoreText}>{t('loading')}...</Text>
                </View>
              )}
            </>
          )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Detail Modal */}
      <ModalOverlay visible={!!selected} onClose={() => setSelected(null)} animation="springScale">
        {selectedRef.current && (() => { const r = selectedRef.current; return (
          <View style={[st.modal, { width: Dimensions.get('window').width * 0.9 }]}>
            <View style={st.modalHeader}>
              <View>
                <Text style={st.modalDate}>{t('reconDate')}: {fmtDateTime(r.created_at || r.date)}</Text>
                <Text style={st.modalDateSub}>{t('billDate')}: {fmtDate(r.bill_date || r.date)}</Text>
                {r.reconciled_by ? (<Text style={st.modalDateSub}>{t('reconciledBy')}: {r.reconciled_by}</Text>) : null}
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} style={{ padding: 4 }}>
                <Svg width="18" height="18" viewBox="0 0 24 24" stroke={colors.surface} strokeWidth="2" fill="none">
                  <Line x1="18" y1="6" x2="6" y2="18" />
                  <Line x1="6" y1="6" x2="18" y2="18" />
                </Svg>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={st.pairRow}>
                <View style={st.pairCol}>
                  <View style={st.pairItem}><Text style={st.pairLabel}>{t('bookBalance')}</Text><Text style={st.pairVal}>{fmtAmtFull(r.cash_on_hand)}</Text></View>
                  <View style={st.pairDivider} />
                  <View style={st.pairItem}><Text style={st.pairLabel}>{t('cardBalance')}</Text><Text style={st.pairVal}>{fmtAmtFull(r.card_balance)}</Text></View>
                </View>
                <View style={st.pairCol}>
                  <View style={st.pairItem}><Text style={st.pairLabel}>{t('currentBalance')}</Text><Text style={st.pairVal}>{fmtAmtFull(r.real_total)}</Text></View>
                  <View style={st.pairDivider} />
                  <View style={st.pairItem}><Text style={st.pairLabel}>{t('cashBalance')}</Text><Text style={st.pairVal}>{fmtAmtFull(r.cash_balance)}</Text></View>
                </View>
                <View style={st.pairCol}>
                  <View style={st.pairItem}><Text style={st.pairLabel}>{t('bookDiff')}</Text><Text style={[st.pairVal, { color: r.diff > 0.005 ? colors.success : r.diff < -0.005 ? colors.danger : colors.textMain }]}>{r.diff >= 0 ? '+' : '-'}{fmtAmtFull(Math.abs(r.diff))}</Text></View>
                  <View style={st.pairDivider} />
                  <View style={st.pairItem}><Text style={st.pairLabel}>{t('fundsInTransit')}</Text><Text style={[st.pairVal, { color: (Math.abs(r.channel_total) < 0.005) ? colors.textMain : colors.primary }]}>{fmtAmtFull(r.channel_total)}</Text></View>
                </View>
              </View>
              <View style={st.chanSection}>
                {[
                  { label: t('dineIn'), value: r.dine_in },
                  { label: t('meituan'), value: r.meituan },
                  { label: t('flashSale'), value: r.flash_sale },
                  { label: t('jd'), value: r.jd },
                  { label: t('tuan'), value: r.tuan },
                ].map((ch, i) => (
                  <View key={i} style={st.chanRow}>
                    <Text style={st.chanLabel}>{ch.label}</Text>
                    <Text style={st.chanVal}>{fmtAmtFull(ch.value)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ); })()}
      </ModalOverlay>

      {/* Date Picker */}
      <DatePickerModal
        visible={datePickTarget !== null}
        value={datePickTarget === 'from' ? filDateFrom : filDateTo}
        onClose={() => setDatePickTarget(null)}
        onSelect={(d: string) => {
          if (d > todayISO) { setFilterDateError(c => c + 1); return; }
          if (datePickTarget === 'from') setFilDateFrom(d);
          else setFilDateTo(d);
          setDatePickTarget(null);
        }}
        maxDate={todayISO}
      />

    </View>
  );
}

const getSt = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  list: { flex: 1, paddingHorizontal: 12 },
  loadingMore: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, gap: 8 },
  loadingMoreText: { fontSize: FONTS.sub.size, color: colors.primary },
  /* Card */
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: colors.secondary,
    gap: 10,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 8 },
  dateItem: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, marginBottom: 2 },
  dateVal: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub },
  dateSep: { width: 1, height: 24, backgroundColor: colors.secondary },
  cardPairRow: { flexDirection: 'row', gap: 4 },
  cardPairCol: { flex: 1, alignItems: 'center' },
  cardPairItem: { alignItems: 'center', gap: 2, paddingVertical: 4 },
  cardPairLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },
  cardPairVal: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain },
  cardPairDiv: { height: 1, backgroundColor: colors.bg, width: '60%', marginVertical: 2 },
  tapHint: { fontSize: FONTS.micro.size, color: colors.primary, textAlign: 'center', marginTop: 2 },
  reconByRow: { alignItems: 'center', paddingBottom: 2 },
  reconByText: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },
  /* Modal */
  modal: { backgroundColor: colors.surface, borderRadius: MODAL_CARD_RADIUS, overflow: 'hidden' },
  modalHeader: { backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18 },
  modalDate: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.surface },
  modalDateSub: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: withAlpha(colors.surface, 0.75), marginTop: 2 },
  modalClose: { ...modalClose, paddingLeft: 8 },
  pairRow: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 10, gap: 6 },
  pairCol: { flex: 1, alignItems: 'center', backgroundColor: colors.bg, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4 },
  pairItem: { alignItems: 'center', gap: 4, paddingVertical: 6 },
  pairLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },
  pairVal: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain },
  pairDivider: { height: 1, backgroundColor: colors.secondary, width: '70%' },
  chanSection: { marginHorizontal: 14, marginBottom: 18, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.bg, paddingTop: 12 },
  chanRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 4 },
  chanLabel: { fontSize: FONTS.sub.size, color: colors.textSub, fontWeight: FONTS.sub.weight },
  chanVal: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain },
  // Filter
  filterField: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  filterLabel: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: '#FFFFFF', width: 64, flexShrink: 0 },
  filterDateRange: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterDateChip: { flex: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', paddingHorizontal: 8 },
  filterDateText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: '#FFFFFF' },
  filterSelectWrap: { flex: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', paddingHorizontal: 8 },
  filterSelectText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: '#FFFFFF' },
  filterActions: { flexDirection: 'row', gap: 8, paddingTop: 6 },
  filterResetBtn: { flex: 1, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.secondary },
  filterResetBtnText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub },
  filterApplyBtn: { flex: 1, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },
  filterApplyBtnText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.surface },
  filterApplyBtnDisabled: { backgroundColor: colors.secondary },
  filterApplyBtnTextDisabled: { color: colors.surface },
} as any);
