import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Animated, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { t, getLang } from '../i18n';
import { api, resolveAssetUrl } from '../api/client';
import { useServerDate } from '../hooks/useServerDate';
import { usePaginatedList } from '../hooks/usePaginatedList';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DatePickerModal from '../components/DatePickerModal';
import HistoryHeader from '../components/HistoryHeader';
import { parseImages } from '../utils/parseImages';
import ImagePreviewModal from '../components/ImagePreviewModal';

/* ── Helpers ── */
const cnNow = () => { const d = new Date(); return new Date(d.getTime() + 8 * 3600000); };
const todayStr = () => cnNow().toISOString().slice(0, 10);
const offsetDate = (days: number) => { const d = cnNow(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const fmtDate = (d: string) => { if (!d) return ''; const [y, m, day] = d.split('-'); const l = getLang(); if (l.startsWith('en')) { const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${months[+m-1]} ${+day}, ${y}`; } return `${y}年${m}月${day}日`; };
const monthsBetween = (from: string, to: string): number => { const [fy, fm] = from.split('-').map(Number); const [ty, tm] = to.split('-').map(Number); return (ty - fy) * 12 + (tm - fm); };
const localeCat = (cat: string): string => {
  const m: Record<string, string> = { daily: '日常', rent: '房租', salary: '薪资', goods: '采购' };
  return getLang().startsWith('en') ? cat : (m[cat] || cat);
};
const localePay = (pay: string): string => {
  const m: Record<string, string> = { cash: '现金', wechat: '微信', alipay: '支付宝', bank: '银行卡', other: '其他' };
  return getLang().startsWith('en') ? pay : (m[pay] || pay);
};

function ExpenseEmptyIcon({ color }: { color: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Path d="M14 2v6h6" />
      <Path d="M10 12h4" />
      <Path d="M9 17h6" />
    </Svg>
  );
}

interface Props {
  onBack: () => void;
  onExpDetail?: (e: any) => void;
}

export default function ExpenseHistoryScreen({ onBack, onExpDetail }: Props) {
  const { colors } = useTheme();
  const st = useMemo(() => getSt(colors), [colors]);

  const [showFilter, setShowFilter] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;
  const thumbTapRef = useRef(false);

  const openFilter = () => { setFilterVisible(true); setShowFilter(true); Animated.spring(filterAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 24 }).start(); };
  const closeFilter = () => { Animated.timing(filterAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => { setFilterVisible(false); setShowFilter(false); }); };

  const [filDateFrom, setFilDateFrom] = useState(offsetDate(-30));
  const [filDateTo, setFilDateTo] = useState(todayStr());
  const [filCats, setFilCats] = useState<string[]>([]);
  const [appliedFrom, setAppliedFrom] = useState(offsetDate(-30));
  const [appliedTo, setAppliedTo] = useState(todayStr());
  const [appliedCats, setAppliedCats] = useState('');
  const [datePickTarget, setDatePickTarget] = useState<'from' | 'to' | null>(null);
  const [previewImgs, setPreviewImgs] = useState<string[]>([]);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const openPreview = (imgs: string[], idx: number) => {
    setPreviewImgs(imgs);
    setPreviewIdx(idx);
    setPreviewVisible(true);
  };

  const toggleCat = (cat: string) => {
    setFilCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const fetcher = useCallback(async (_page: number, _perPage: number) => {
    try {
      const params: Record<string, string> = { type: 'expense' };
      if (appliedFrom) params.date_from = appliedFrom;
      if (appliedTo) params.date_to = appliedTo;
      if (appliedCats) params.category = appliedCats;
      const tx: any = await api.getTransactions(1, 500, params);
      return { records: tx.transactions || [], total: tx.total || 0, pages: tx.pages || 1 };
    } catch {
      return { records: [], total: 0, pages: 1 };
    }
  }, [appliedFrom, appliedTo, appliedCats]);

  const { records, total, hasMore, loading, loadingMore, refresh, loadMore } = usePaginatedList({
    fetcher,
    perPage: 50,
  });

  const filterKey = `${appliedFrom}|${appliedTo}|${appliedCats}`;
  useEffect(() => { refresh(); }, [filterKey]);

  const rangeInvalid = useMemo(() => !!(filDateFrom && filDateTo && filDateFrom > filDateTo), [filDateFrom, filDateTo]);
  const rangeTooLong = useMemo(() => !!(filDateFrom && filDateTo && !rangeInvalid && monthsBetween(filDateFrom, filDateTo) > 24), [filDateFrom, filDateTo, rangeInvalid]);

  const resetFilters = () => {
    const dFrom = offsetDate(-30); const dTo = todayStr();
    setFilDateFrom(dFrom); setFilDateTo(dTo); setFilCats([]);
    setAppliedFrom(dFrom); setAppliedTo(dTo); setAppliedCats('');
  };

  const renderItem = useCallback(({ item: e }: { item: any }) => {
    const thumbImgs = parseImages(e.thumb_images);
    const displayImgs = thumbImgs.length > 0 ? thumbImgs : parseImages(e.images);
    const previewImgsList = parseImages(e.images);
    const resolvedImgs = displayImgs.map((u: string) => resolveAssetUrl(u) || u);
    return (
    <View style={st.row}>
      <TouchableOpacity onPress={() => onExpDetail?.(e)} activeOpacity={0.7} style={{ flex: 1 }}>
        <View style={st.rowTop}>
          <View style={st.badges}>
            <View style={st.catBadge}>
              <Text style={st.catBadgeText}>{localeCat(e.category || '')}</Text>
            </View>
            <View style={st.payBadge}>
              <Text style={st.payBadgeText}>{localePay(e.account || '')}</Text>
            </View>
          </View>
          <Text style={[st.amount, Number(e.amount) < 0 && { color: colors.success }]}>
            {Number(e.amount) < 0 ? '+' : '-'}¥{Math.abs(Number(e.amount || 0)).toFixed(2)}
          </Text>
        </View>
        <View style={st.rowBottom}>
          <Text style={st.dateText}>{fmtDate(e.date || (e.created_at || '').slice(0, 10))}</Text>
          <Text style={st.note} numberOfLines={1}>{e.note || ''}</Text>
        </View>
      </TouchableOpacity>
      {resolvedImgs.length > 0 && (
        <View style={st.imgThumbs}>
          {resolvedImgs.map((url: string, j: number) => (
            <TouchableOpacity key={j} onPress={() => { thumbTapRef.current = true; openPreview(previewImgsList.map((u: string) => resolveAssetUrl(u) || u), j); }} activeOpacity={0.8}>
              <Image source={{ uri: url }} style={st.thumbImg} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  ); }, [colors, st, onExpDetail]);

  const CATEGORIES = ['daily', 'rent', 'salary', 'goods'];

  return (
    <View style={st.root}>
      <HistoryHeader
        onBack={onBack}
        title={`${t('expenseHistory')} (${records.length}/${total})`}
        filterActive={showFilter}
        onToggleFilter={() => showFilter ? closeFilter() : openFilter()}
      />

      {/* Filter panel */}
      {filterVisible && (
        <View style={{ position: 'absolute' as any, top: 100, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={closeFilter} />
          <Animated.View style={{ position: 'absolute', top: 0, left: 12, right: 12, borderRadius: 16, overflow: 'hidden', transform: [{ translateY: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0], extrapolate: 'clamp' }) }], opacity: filterAnim } as any}>
            <BlurView intensity={45} tint="dark" style={{ padding: 16, borderRadius: 16 }}>
              <View style={st.filterField}>
                <Text style={st.filterLabel}>{t('expenseDate')}</Text>
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
              {rangeInvalid && <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'right', marginTop: 4 }}>{t('errDateRange')}</Text>}
              {rangeTooLong && <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'right', marginTop: 4 }}>{t('errDateRangeTooLong')}</Text>}
              <View style={st.filterField}>
                <Text style={st.filterLabel}>{t('filterCategory')}</Text>
                <View style={st.filterChipRow}>
                  {CATEGORIES.map(cat => {
                    const active = filCats.includes(cat);
                    return (
                      <TouchableOpacity key={cat} style={[st.filterChip, active && st.filterChipActive]} onPress={() => toggleCat(cat)} activeOpacity={0.7}>
                        <Text style={[st.filterChipText, active && st.filterChipTextActive]}>{localeCat(cat)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={st.filterActions}>
                <TouchableOpacity style={st.filterResetBtn} onPress={resetFilters} activeOpacity={0.7}>
                  <Text style={st.filterResetBtnText}>{t('reset')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.filterApplyBtn, (rangeInvalid || rangeTooLong) && st.filterApplyBtnDisabled]}
                  disabled={rangeInvalid || rangeTooLong}
                  onPress={() => {
                    setAppliedFrom(filDateFrom);
                    setAppliedTo(filDateTo);
                    setAppliedCats(filCats.join(','));
                    closeFilter();
                  }} activeOpacity={0.8}>
                  <Text style={[st.filterApplyBtnText, (rangeInvalid || rangeTooLong) && st.filterApplyBtnTextDisabled]}>{t('apply')}</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>
        </View>
      )}

      {/* Date picker modal */}
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

      {/* List */}
      <FlatList
        style={st.list}
        data={records}
        keyExtractor={(e: any, i: number) => e.id != null ? `tx-${e.id}` : `tx-${i}`}
        renderItem={renderItem}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 112, paddingHorizontal: 12, paddingBottom: 100 }}
        ListEmptyComponent={!loading ? (
          <EmptyState
            icon={<ExpenseEmptyIcon color={colors.textSub} />}
            title={t('noRecords')}
            hint={t('emptyExpenseHint')}
          />
        ) : null}
        ListFooterComponent={hasMore ? (
          <View style={st.loadingMore}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={st.loadingMoreText}>{t('loading')}...</Text>
          </View>
        ) : null}
      />

      {/* Initial loading overlay */}
      {loading && records.length === 0 && (
        <View style={{ position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', paddingTop: 112 }}>
          <LoadingSpinner label={false} />
        </View>
      )}

      <ImagePreviewModal
        images={previewImgs}
        initialIdx={previewIdx}
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
      />
    </View>
  );
}

const getSt = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  list: { flex: 1 },
  /* Row */
  row: {
    backgroundColor: colors.surface, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1, borderColor: colors.secondary,
  },
  rowTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  catBadge: { backgroundColor: withAlpha(colors.warning, 0.1), borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  catBadgeText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.primary },
  payBadge: { backgroundColor: colors.bg, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  payBadgeText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub },
  amount: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: colors.danger },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dateText: { fontSize: FONTS.sub.size, color: colors.textSub, flexShrink: 0 },
  note: { fontSize: FONTS.sub.size, color: colors.textSub, flex: 1, textAlign: 'right', overflow: 'hidden' },
  imgThumbs: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  thumbImg: { width: 48, height: 48, borderRadius: 6, backgroundColor: colors.bg },
  loadingMore: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 8 },
  loadingMoreText: { fontSize: FONTS.sub.size, color: colors.primary },
  /* Filter */
  filterField: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  filterLabel: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: '#FFFFFF', width: 64, flexShrink: 0 },
  filterDateRange: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterDateChip: {
    flex: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', paddingHorizontal: 8,
  },
  filterDateText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: '#FFFFFF' },
  filterChipRow: { flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: 'rgba(255,255,255,0.55)' },
  filterChipTextActive: { color: '#FFFFFF' },
  filterActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  filterResetBtn: { flex: 1, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.secondary },
  filterResetBtnText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub },
  filterApplyBtn: { flex: 1, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },
  filterApplyBtnDisabled: { opacity: 0.3 },
  filterApplyBtnText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.surface },
  filterApplyBtnTextDisabled: { color: 'rgba(255,255,255,0.3)' },
});
