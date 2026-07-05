import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image, StatusBar } from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { t, getLang } from '../i18n';
import { api, resolveAssetUrl } from '../api/client';
import { useServerDate } from '../hooks/useServerDate';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { getCurrentUser } from '../utils/storage';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DatePickerModal from '../components/DatePickerModal';
import HistoryHeader from '../components/HistoryHeader';
import { parseImages } from '../utils/parseImages';
import ImagePreview from '../components/ImagePreview';
import { useImagePreview } from '../hooks/useImagePreview';
import { useSwipeBack } from '../hooks/useSwipeBack';
import FilterPanel from '../components/FilterPanel';

/* ── Helpers ── */
const fmtDate = (d: string) => { if (!d) return ''; const [y, m, day] = d.split('-'); const l = getLang(); if (l.startsWith('en')) { const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${months[+m-1]} ${+day}, ${y}`; } return `${y}年${m}月${day}日`; };
// Strict calendar months between two ISO dates (YYYY-MM-DD) — matches web
const monthsBetween = (from: string, to: string): number => {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  let m = (ty - fy) * 12 + (tm - fm);
  if (td < fd) m -= 1;
  return m;
};
const localeCat = (cat: string): string => t(cat);
const localePay = (pay: string): string => {
  const keyMap: Record<string, string> = { cash: 'payCash', wechat: 'payWechat', alipay: 'payAlipay', bank: 'payBank', other: 'payOther' };
  return t(keyMap[pay] || pay);
};

function ExpenseEmptyIcon({ color }: { color: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Path d="M14 2v6h6" />
      <Circle cx="10" cy="12" r="3" />
      <Path d="M10 12h4" />
      <Path d="M9 17h6" />
    </Svg>
  );
}

// Stamp seal — expense (linked to procurement). Mirrors invoice 已作废 / procurement stamp.
function IcnSealExp({ color, label }: { color: string; label: string }) {
  return (
    <Svg width={42} height={42} viewBox="0 0 42 42">
      <Circle cx={21} cy={21} r={19.5} fill="none" stroke={color} strokeWidth={1.3} />
      <Circle cx={21} cy={21} r={17} fill="none" stroke={color} strokeWidth={0.5} strokeDasharray="2.5 1.8" />
      <SvgText x={21} y={24} textAnchor="middle" fontSize={8} fontWeight="700" fill={color} transform="rotate(-12, 21, 21)">{label}</SvgText>
    </Svg>
  );
}

interface Props {
  onBack: () => void;
  onExpDetail?: (e: any) => void;
  onInvoice?: (batchId: number) => void;
  refreshKey?: number;
}

export default function ExpenseHistoryScreen({ onBack, onExpDetail, onInvoice, refreshKey }: Props) {
  const { colors } = useTheme();
  const swipeBack = useSwipeBack(onBack);
  const st = useMemo(() => getSt(colors), [colors]);
  const sd = useServerDate();
  const currentUser = getCurrentUser();
  const { showToast, ToastHost } = useToast();

  const [showFilter, setShowFilter] = useState(false);

  const [filDateFrom, setFilDateFrom] = useState(sd.offset ? sd.offset(-30) : '');
  const [filDateTo, setFilDateTo] = useState(sd.today || '');
  const [filCats, setFilCats] = useState<string[]>([]);
  const [appliedFrom, setAppliedFrom] = useState(sd.offset ? sd.offset(-30) : '');
  const [appliedTo, setAppliedTo] = useState(sd.today || '');
  const [appliedCats, setAppliedCats] = useState('');

  // Once server date arrives, backfill the date filter defaults (matches web)
  useEffect(() => {
    if (sd.ready && sd.offset && !appliedFrom) {
      const from = sd.offset(-30);
      const to = sd.today;
      setFilDateFrom(from);
      setFilDateTo(to);
      setAppliedFrom(from);
      setAppliedTo(to);
    }
  }, [sd.ready, appliedFrom, appliedTo, sd.today, sd.offset]);
  const [datePickTarget, setDatePickTarget] = useState<'from' | 'to' | null>(null);
  const { preview, openPreview, closePreview } = useImagePreview();

  const toggleCat = (cat: string) => {
    setFilCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const fetcher = useCallback(async (page: number, perPage: number) => {
    try {
      const params: Record<string, string> = { type: 'expense' };
      if (appliedFrom) params.date_from = appliedFrom;
      if (appliedTo) params.date_to = appliedTo;
      if (appliedCats) params.category = appliedCats;
      const tx: any = await api.getTransactions(page, perPage, params);
      return { records: tx.transactions || [], total: tx.total || 0, pages: tx.pages || 1, total_all: tx.total_all };
    } catch {
      showToast(t('toastLoadFailed'));
      return { records: [], total: 0, pages: 1 };
    }
  }, [appliedFrom, appliedTo, appliedCats, showToast]);

  const { records, total, totalAll, hasMore, loading, loadingMore, refresh, loadMore } = usePaginatedList({
    fetcher,
    perPage: 50,
  });

  const filterKey = `${appliedFrom}|${appliedTo}|${appliedCats}`;
  useEffect(() => { refresh(); }, [filterKey]);

  // External refresh trigger (e.g. after adding a new expense)
  useEffect(() => { if (refreshKey !== undefined) refresh(); }, [refreshKey]);

  const rangeInvalid = useMemo(() => !!(filDateFrom && filDateTo && filDateFrom > filDateTo), [filDateFrom, filDateTo]);
  const rangeTooLong = useMemo(() => !!(filDateFrom && filDateTo && !rangeInvalid && monthsBetween(filDateFrom, filDateTo) > 24), [filDateFrom, filDateTo, rangeInvalid]);

  const resetFilters = () => {
    const dFrom = sd.offset ? sd.offset(-30) : filDateFrom; const dTo = sd.today || filDateTo;
    setFilDateFrom(dFrom); setFilDateTo(dTo); setFilCats([]);
    setAppliedFrom(dFrom); setAppliedTo(dTo); setAppliedCats('');
  };

  const renderItem = useCallback(({ item: e }: { item: any }) => {
    const thumbImgs = parseImages(e.thumb_images);
    const displayImgs = thumbImgs.length > 0 ? thumbImgs : parseImages(e.images);
    const previewImgsList = parseImages(e.images);
    const resolvedImgs = displayImgs.map((u: string) => resolveAssetUrl(u) || u);
    return (
    <TouchableOpacity onPress={() => onExpDetail?.(e)} activeOpacity={0.7}>
      <View style={st.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={st.rowTop}>
          <View style={st.badges}>
            <View style={st.catBadge}>
              <Text style={st.catBadgeText}>{localeCat(e.category || '')}</Text>
            </View>
            <View style={st.payBadge}>
              <Text style={st.payBadgeText}>{localePay(e.account || '')}</Text>
            </View>
            {e.procurement_batch_id ? (
              e.invoice_status ? (
              <TouchableOpacity
                onPress={() => onInvoice?.(e.procurement_batch_id)}
                activeOpacity={0.7}
                style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, backgroundColor: e.invoice_status === 'done' ? withAlpha(colors.success, 0.12) : withAlpha(colors.warning, 0.12) }}
              >
                <Text style={{ fontSize: 10, fontWeight: '600', color: e.invoice_status === 'done' ? colors.success : colors.warning }}>
                  {e.invoice_status === 'done' ? t('invRecStatusDone') : t('invRecStatusPending')}
                </Text>
              </TouchableOpacity>
              ) : (
              <TouchableOpacity
                onPress={() => onInvoice?.(e.procurement_batch_id)}
                activeOpacity={0.7}
                style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, backgroundColor: withAlpha(colors.primary, 0.10) }}
              >
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary }}>
                  {t('invToInvoice')}
                </Text>
              </TouchableOpacity>
              )
            ) : null}
          </View>
          {/* Wrap amount + seal so the seal anchors to the amount text */}
          <View style={st.expAmountWrap}>
            <Text style={[st.amount, Number(e.amount) < 0 && { color: colors.success }]}>
              {Number(e.amount) < 0 ? '+' : '-'}¥{Math.abs(Number(e.amount || 0)).toFixed(2)}
            </Text>
            {e.proc_batch_number ? (
              <View style={st.expSealWrap} pointerEvents="none">
                <IcnSealExp
                  color={e.proc_settled_at ? colors.success : colors.warning}
                  label={e.proc_settled_at ? t('procSettled') : t('procUnsettled')}
                />
              </View>
            ) : null}
          </View>
        </View>
        {currentUser ? (
          <Text style={st.filledBy}>{t('filledBy')}: {currentUser}</Text>
        ) : null}
        <View style={st.rowBottom}>
          <Text style={st.dateText}>{fmtDate(e.date || (e.created_at || '').slice(0, 10))}</Text>
          {e.proc_batch_number ? (
            <Text style={st.note} numberOfLines={1}>{t('procNowBatch').replace('{n}', String(e.proc_batch_number))}</Text>
          ) : e.note ? (
            <Text style={st.note} numberOfLines={1}>{e.note}</Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
        {/* Image thumbnails */}
        {resolvedImgs.length > 0 && (
          <View style={st.imgThumbs}>
            {resolvedImgs.map((url: string, j: number) => (
              <TouchableOpacity key={j} onPress={() => { openPreview(previewImgsList.map((u: string) => resolveAssetUrl(u) || u), j); }} activeOpacity={0.8}>
                <Image source={{ uri: url }} style={st.thumbImg} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      </View>
    </TouchableOpacity>
  ); }, [colors, st, onExpDetail, onInvoice, currentUser]);

  const CATEGORIES = ['daily', 'rent', 'salary', 'goods'];

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" />
      <HistoryHeader
        onBack={onBack}
        title={`${t('expenseHistory')} (${total}/${totalAll})`}
        filterActive={showFilter}
        onToggleFilter={() => setShowFilter(!showFilter)}
      />

      {/* Filter panel — shared FilterPanel for backdrop, BlurView inside for iOS frosted look */}
      <FilterPanel visible={showFilter} onClose={() => setShowFilter(false)} style={{ backgroundColor: 'transparent', borderWidth: 0 }}>
        <View style={{ margin: -12 }}>
        <BlurView intensity={45} tint="dark" style={{ borderRadius: 10, overflow: 'hidden' }}>
          <View style={{ padding: 12, gap: 8 }}>
        {rangeInvalid && <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'right' }}>{t('errDateRange')}</Text>}
        {rangeTooLong && <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'right' }}>{t('errDateRangeTooLong')}</Text>}
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
        {/* Quick date buttons — 3-language adapted */}
        <View style={st.filterField}>
          <Text style={st.filterLabel}>　</Text>
          <View style={st.filterChipRow}>
            {(() => {
              const l = getLang();
              const isEn = l.startsWith('en');
              const labels = isEn
                ? ['Today', 'Yest.', '2d ago', '3d ago']
                : (l.startsWith('zh-Hant') || l.startsWith('zh-TW'))
                  ? ['今天', '昨天', '前天', '大前天']
                  : ['今天', '昨天', '前天', '大前天'];
              return [
                { label: labels[0], date: sd.today },
                { label: labels[1], date: sd.offset ? sd.offset(-1) : '' },
                { label: labels[2], date: sd.offset ? sd.offset(-2) : '' },
                { label: labels[3], date: sd.offset ? sd.offset(-3) : '' },
              ].map(q => {
                const active = filDateFrom === q.date && filDateTo === q.date;
                return (
                  <TouchableOpacity key={q.label}
                    style={[st.filterChip, active && st.filterChipActive]}
                    onPress={() => { if (q.date) { setFilDateFrom(q.date); setFilDateTo(q.date); } }} activeOpacity={0.7}>
                    <Text style={[st.filterChipText, active && st.filterChipTextActive]}>{q.label}</Text>
                  </TouchableOpacity>
                );
              });
            })()}
          </View>
        </View>
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
              setShowFilter(false);
            }} activeOpacity={0.8}>
            <Text style={[st.filterApplyBtnText, (rangeInvalid || rangeTooLong) && st.filterApplyBtnTextDisabled]}>{t('apply')}</Text>
          </TouchableOpacity>
        </View>
          </View>
        </BlurView>
        </View>
      </FilterPanel>

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
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: showFilter ? 292 : 112, paddingHorizontal: 12, paddingBottom: 100 }}
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

      <ImagePreview
        images={preview?.images ?? []}
        initialIdx={preview?.idx ?? 0}
        visible={preview !== null}
        onClose={closePreview}
      />
      {ToastHost}
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
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
    minHeight: 44,
  },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  catBadge: { backgroundColor: withAlpha(colors.warning, 0.1), borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  catBadgeText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.primary },
  payBadge: { backgroundColor: colors.bg, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  payBadgeText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub },
  amount: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: colors.danger },
  expAmountWrap: { position: 'relative' as any },
  expSealWrap: { position: 'absolute' as any, top: -24, right: 0 },
  filledBy: { fontSize: 10, color: colors.textSub, marginTop: 2 },
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
