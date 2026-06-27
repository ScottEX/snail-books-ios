import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import { usePaginatedList } from '../hooks/usePaginatedList';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { modalClose } from '../sharedStyles';
import { fmtAmtFull } from '../utils/format';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DatePickerModal from '../components/DatePickerModal';
import HistoryHeader from '../components/HistoryHeader';

/* ── Helpers ── */
const cnNow = () => { const d = new Date(); return new Date(d.getTime() + 8 * 3600000); };
const todayStr = () => cnNow().toISOString().slice(0, 10);
const offsetDate = (days: number) => { const d = cnNow(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

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
  const [selected, setSelected] = useState<any>(null);
  const detailAnim = useRef(new Animated.Value(0)).current;
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (r: any) => { setSelected(r); setDetailOpen(true); Animated.spring(detailAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 24 }).start(); };
  const closeDetail = () => { Animated.timing(detailAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => { setDetailOpen(false); setSelected(null); }); };

  const { colors } = useTheme();
  const st = useMemo(() => getSt(colors), [colors]);

  const [showFilter, setShowFilter] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;

  const openFilter = () => { setFilterVisible(true); setShowFilter(true); Animated.spring(filterAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 24 }).start(); };
  const closeFilter = () => { Animated.timing(filterAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => { setFilterVisible(false); setShowFilter(false); }); setShowUserPick(false); };
  const [filDateFrom, setFilDateFrom] = useState(offsetDate(-30));
  const [filDateTo, setFilDateTo] = useState(todayStr());
  const [filBy, setFilBy] = useState('');
  const [appliedFrom, setAppliedFrom] = useState(offsetDate(-30));
  const [appliedTo, setAppliedTo] = useState(todayStr());
  const [appliedBy, setAppliedBy] = useState('');
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const [datePickTarget, setDatePickTarget] = useState<'from' | 'to' | null>(null);
  const [showUserPick, setShowUserPick] = useState(false);
  const userDropAnim = useRef(new Animated.Value(0)).current;

  const openUserDrop = () => { setShowUserPick(true); Animated.timing(userDropAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start(); };
  const closeUserDrop = () => { Animated.timing(userDropAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => setShowUserPick(false)); };

  useEffect(() => { if (showFilter && users.length === 0) { api.getUsers().then(data => setUsers(data || [])).catch(() => { }); } }, [showFilter]);

  const getFilterParams = useCallback((): Record<string, string> => {
    const f: Record<string, string> = {};
    if (appliedFrom) f.date_from = appliedFrom;
    if (appliedTo) f.date_to = appliedTo;
    if (appliedBy) f.reconciled_by = appliedBy;
    return f;
  }, [appliedFrom, appliedTo, appliedBy]);

  const { records, total, hasMore, loading, loadingMore, refresh, loadMore } = usePaginatedList({
    fetcher: useCallback(async (pg: number, perPage: number) => {
      const data: any = await api.getReconciliationsPage(pg, perPage, getFilterParams());
      return { records: data?.records || [], total: data?.total || 0, pages: data?.pages || 1 };
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
    <TouchableOpacity key={r.id} style={st.card} onPress={() => openDetail(r)} activeOpacity={0.7}>
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
    const dFrom = offsetDate(-30); const dTo = todayStr();
    setFilDateFrom(dFrom); setFilDateTo(dTo); setFilBy('');
    setAppliedFrom(dFrom); setAppliedTo(dTo); setAppliedBy('');
  };

  return (
    <View style={st.root}>
      <HistoryHeader
        onBack={onBack}
        title={`${t('reconHistory')} (${records.length}/${total})`}
        filterActive={showFilter}
        onToggleFilter={() => showFilter ? closeFilter() : openFilter()}
      />

      {/* Filter panel */}
      {filterVisible && (
        <View style={{ position: 'absolute' as any, top: 100, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={closeFilter} />
          <Animated.View style={{ position: 'absolute', top: 0, left: 12, right: 12, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', transform: [{ translateY: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0], extrapolate: 'clamp' }) }], opacity: filterAnim } as any}>
            <BlurView intensity={45} tint="dark" style={{ padding: 16, borderRadius: 16 }}>
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
                <TouchableOpacity style={{ flex: 1, justifyContent: 'center' }} onPress={openUserDrop} activeOpacity={0.7}>
                  <Text style={st.filterSelectText}>{filBy || t('any')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={st.filterActions}>
              <TouchableOpacity style={st.filterResetBtn} onPress={resetFilters} activeOpacity={0.7}>
                <Text style={st.filterResetBtnText}>{t('reset')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.filterApplyBtn} onPress={() => { setAppliedFrom(filDateFrom); setAppliedTo(filDateTo); setAppliedBy(filBy); closeFilter(); }} activeOpacity={0.8}>
                <Text style={st.filterApplyBtnText}>{t('apply')}</Text>
              </TouchableOpacity>
            </View>
            </BlurView>
          </Animated.View>
          {/* User dropdown — outside filter box, won't be clipped */}
          {showUserPick && (
            <Animated.View style={{ position: 'absolute', top: 96, left: 100, width: 160, zIndex: 10, opacity: userDropAnim, transform: [{ translateY: userDropAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0], extrapolate: 'clamp' }) }] }}>
              <View style={{ backgroundColor: 'rgba(44,44,46,0.96)', borderRadius: 10, overflow: 'hidden' }}>
                <TouchableOpacity onPress={() => { setFilBy(''); closeUserDrop(); }} activeOpacity={0.6} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
                  <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '600' }}>{t('any')}</Text>
                </TouchableOpacity>
                <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 12 }} />
                {users.map(u => (
                  <TouchableOpacity key={u.id} onPress={() => { setFilBy(u.username); closeUserDrop(); }} activeOpacity={0.6} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
                    <Text style={{ fontSize: 14, color: filBy === u.username ? '#0A84FF' : '#FFFFFF', fontWeight: filBy === u.username ? '700' : '400' }}>{u.username}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}
        </View>
      )}

      {/* List */}
      <ScrollView style={st.list} showsVerticalScrollIndicator={false}
        onScroll={handleScroll} scrollEventThrottle={50}
        contentContainerStyle={{ paddingTop: 112, paddingBottom: 100 }}>
        {loading ? (<LoadingSpinner />)
          : records.length === 0 ? (
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
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Detail Modal */}
      {detailOpen && selected && (
        <View style={st.mask} pointerEvents="box-none">
          <Animated.View style={[st.maskBg, { opacity: detailAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDetail} />
          </Animated.View>
          <Animated.View style={[st.modal, { transform: [{ translateY: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0], extrapolate: 'clamp' }) }] }]}>
            <View style={st.modalHeader}>
              <View>
                <Text style={st.modalDate}>{t('reconDate')}: {fmtDateTime(selected.created_at || selected.date)}</Text>
                <Text style={st.modalDateSub}>{t('billDate')}: {fmtDate(selected.bill_date || selected.date)}</Text>
                {selected.reconciled_by ? (<Text style={st.modalDateSub}>{t('reconciledBy')}: {selected.reconciled_by}</Text>) : null}
              </View>
              <TouchableOpacity onPress={closeDetail} activeOpacity={0.6}>
                <Text style={st.modalClose}>{'✕'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={st.pairRow}>
                <View style={st.pairCol}>
                  <View style={st.pairItem}><Text style={st.pairLabel}>{t('bookBalance')}</Text><Text style={st.pairVal}>{fmtAmtFull(selected.cash_on_hand)}</Text></View>
                  <View style={st.pairDivider} />
                  <View style={st.pairItem}><Text style={st.pairLabel}>{t('cardBalance')}</Text><Text style={st.pairVal}>{fmtAmtFull(selected.card_balance)}</Text></View>
                </View>
                <View style={st.pairCol}>
                  <View style={st.pairItem}><Text style={st.pairLabel}>{t('currentBalance')}</Text><Text style={st.pairVal}>{fmtAmtFull(selected.real_total)}</Text></View>
                  <View style={st.pairDivider} />
                  <View style={st.pairItem}><Text style={st.pairLabel}>{t('cashBalance')}</Text><Text style={st.pairVal}>{fmtAmtFull(selected.cash_balance)}</Text></View>
                </View>
                <View style={st.pairCol}>
                  <View style={st.pairItem}><Text style={st.pairLabel}>{t('bookDiff')}</Text><Text style={[st.pairVal, { color: selected.diff > 0.005 ? colors.success : selected.diff < -0.005 ? colors.danger : colors.textMain }]}>{selected.diff >= 0 ? '+' : '-'}{fmtAmtFull(Math.abs(selected.diff))}</Text></View>
                  <View style={st.pairDivider} />
                  <View style={st.pairItem}><Text style={st.pairLabel}>{t('fundsInTransit')}</Text><Text style={[st.pairVal, { color: (Math.abs(selected.channel_total) < 0.005) ? colors.textMain : colors.primary }]}>{fmtAmtFull(selected.channel_total)}</Text></View>
                </View>
              </View>
              <View style={st.chanSection}>
                {[
                  { label: t('dineIn'), value: selected.dine_in },
                  { label: t('meituan'), value: selected.meituan },
                  { label: t('flashSale'), value: selected.flash_sale },
                  { label: t('jd'), value: selected.jd },
                  { label: t('tuan'), value: selected.tuan },
                ].map((ch, i) => (
                  <View key={i} style={st.chanRow}>
                    <Text style={st.chanLabel}>{ch.label}</Text>
                    <Text style={st.chanVal}>{fmtAmtFull(ch.value)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {/* Date Picker */}
      <DatePickerModal
        visible={datePickTarget !== null}
        value={datePickTarget === 'from' ? filDateFrom : filDateTo}
        onClose={() => setDatePickTarget(null)}
        onSelect={(d: string) => {
          if (datePickTarget === 'from') setFilDateFrom(d);
          else setFilDateTo(d);
          setDatePickTarget(null);
        }}
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
  dateVal: { fontSize: 11, fontWeight: FONTS.subBold.weight, color: colors.textSub },
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
  mask: { position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, justifyContent: 'center', alignItems: 'center' },
  maskBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: withAlpha(colors.textMain, 0.4) },
  modal: { width: '88%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden' },
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
} as any);
