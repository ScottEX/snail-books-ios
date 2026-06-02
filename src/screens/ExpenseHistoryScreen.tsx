import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Animated
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import Toast from '../components/Toast';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { modalClose, historyHeader } from '../sharedStyles';

const PAGE_SIZE = 10;

function DateErrorHint({ trigger, message, colors, textAlign }: { trigger: number; message: string; colors: any; textAlign?: 'left' | 'right' | 'center' }) {
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
  return <Text style={{ color: colors.danger, fontSize: 12, textAlign: textAlign || 'right', marginTop: 2 }}>{message}</Text>;
}

export default function ExpenseHistoryScreen({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [previewData, setPreviewData] = useState<{ images: string[]; idx: number } | null>(null);
  const [previewOpacity, setPreviewOpacity] = useState(1);
  const touchStartX = useRef(0);
  // Uncontrolled date refs — React Native Web <input type="date"> crashes with controlled value={state}
  const filDateFromRef = useRef<HTMLInputElement>(null);
  const filDateToRef = useRef<HTMLInputElement>(null);
  const [showFilter, setShowFilter] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;
  const [filDateFrom, setFilDateFrom] = useState('');
  const [filDateTo, setFilDateTo] = useState('');
  useEffect(() => { if (filDateFromRef.current) filDateFromRef.current.value = filDateFrom; }, [filDateFrom]);
  useEffect(() => { if (filDateToRef.current) filDateToRef.current.value = filDateTo; }, [filDateTo]);
  const [filCategories, setFilCategories] = useState<string[]>([]);
  // Track active filters (snapshot at last apply) — compare strings to avoid object deps
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [appliedCats, setAppliedCats] = useState('');
  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterDateError, setFilterDateError] = useState(0);
  const [filDateFromKey, setFilDateFromKey] = useState(0);
  const [filDateToKey, setFilDateToKey] = useState(0);

  const { colors } = useTheme();
  const st = useMemo(() => getSt(colors), [colors]);

  // Build filter params from applied values
  const getFilterParams = useCallback((): Record<string, string> => {
    const f: Record<string, string> = { type: 'expense' };
    if (appliedFrom) f.date_from = appliedFrom;
    if (appliedTo) f.date_to = appliedTo;
    if (appliedCats) f.category = appliedCats;
    return f;
  }, [appliedFrom, appliedTo, appliedCats]);

  // i18n mapping for category & payment from API raw strings
  const trCat = (s: string) => {
    if (s.includes('日常')) return t('daily');
    if (s.includes('房租')) return t('rent');
    if (s.includes('薪资')) return t('salary');
    if (s.includes('采购')) return t('goods');
    return s;
  };
  const trPay = (s: string) => {
    if (s.includes('微信')) return t('payWechat');
    if (s.includes('支付宝') || s.includes('Alipay')) return t('payAlipay');
    if (s.includes('现金')) return t('payCash');
    return s;
  };
  const fmtExpDate = (d: string) => {
    const [y, m, day] = d.split('-');
    const l = getLang();
    if (l.startsWith('en')) { const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${months[+m-1]} ${+day}, ${y}`; }
    return `${y}年${m}月${day}日`;
  };

  // Parse images field from API (stored as JSON string '["url1","url2"]')
  const parseImages = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
  };

  const todayStr = () => new Date().toISOString().split('T')[0];
  const isFuture = (d: string) => d > todayStr();

  // Reset future-date error when filter panel opens
  useEffect(() => { if (showFilter) setFilterDateError(0); }, [showFilter]);

  // Fetch one page from server (with current filters)
  const loadPage = useCallback(async (pg: number, reset: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (reset) setLoading(true);
    try {
      const tx: any = await api.getTransactions(pg, PAGE_SIZE, getFilterParams());
      const exps = tx.transactions || [];
      setRecords(prev => reset ? exps : [...prev, ...exps]);
      setPage(pg);
      pageRef.current = pg;
      setTotal(tx.total || 0);
      setHasMore(pg < (tx.pages || 1));
    } catch { setToast(t('toastLoadFailed')); }
    setLoading(false);
    loadingRef.current = false;
  }, [getFilterParams]);

  // Initial load — trigger when filter params change
  const filterKey = `${appliedFrom}|${appliedTo}|${appliedCats}`;
  useEffect(() => {
    setRecords([]);
    loadPage(1, true);
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Current user for displaying who filled each record
  const currentUser = (() => { try { return localStorage.getItem('user') || ''; } catch { return ''; } })();

  // Render a single transaction row (FlatList item) — uses thumb_images for the
  // 48×48 list tile (fast, ~5-10KB) and falls back to full-size images for old
  // data without thumb_images. Preview always opens the full-size images.
  const renderItem = useCallback(({ item: e, index: i }: { item: any; index: number }) => {
    const thumbImgs = e.thumb_images ? parseImages(e.thumb_images) : [];
    const displayImgs = thumbImgs.length > 0 ? thumbImgs : parseImages(e.images);
    const previewImgs = parseImages(e.images);
    return (
      <View style={st.row}>
        <View style={st.rowTop}>
          <View style={st.badges}>
            <View style={st.catBadge}>
              <Text style={st.catBadgeText}>{trCat(e.category || '')}</Text>
            </View>
            <View style={st.payBadge}>
              <Text style={st.payBadgeText}>{trPay(e.account || '')}</Text>
            </View>
          </View>
          <Text style={st.amount}>-¥{e.amount.toFixed(2)}</Text>
        </View>
        {currentUser ? (
          <Text style={st.filledBy}>{t('filledBy')}: {currentUser}</Text>
        ) : null}
        <View style={st.rowBottom}>
          <Text style={st.dateText}>{fmtExpDate(e.date || (e.created_at || '').slice(0, 10))}</Text>
          {e.note ? (
            <Text style={st.note} numberOfLines={1}>{e.note}</Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
        {/* Image thumbnails — lazy + async + bg placeholder so JS thread stays free for scroll */}
        {displayImgs.length > 0 && (
          <View style={st.imgThumbs}>
            {displayImgs.map((url: string, j: number) => (
              <TouchableOpacity key={j}
                onPress={() => setPreviewData({ images: previewImgs, idx: j })}
                activeOpacity={0.8}>
                {React.createElement('img', {
                  src: url,
                  loading: 'lazy' as any,
                  decoding: 'async' as any,
                  style: {
                    width: 48, height: 48, borderRadius: 6, objectFit: 'cover',
                    backgroundColor: colors.bg,
                  } as any,
                  alt: 'receipt',
                })}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }, [currentUser, colors.bg, st, parseImages, trCat, trPay, fmtExpDate, t, setPreviewData]);

  // End-of-list pagination — replaces ScrollView onScroll, debounced 150ms
  const onEndReached = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    if (scrollTimerRef.current) return;
    scrollTimerRef.current = setTimeout(() => {
      scrollTimerRef.current = null;
      loadPage(pageRef.current + 1, false);
    }, 150);
  }, [hasMore, loadPage]);

  // Category toggle
  const toggleCat = (cat: string) => {
    setFilCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // No client-side filtering — server handles it
  const visible = records;

  // Date range validity — persistent hint while invalid (matches ReconHistoryScreen)
  const rangeInvalid = useMemo(() =>
    !!(filDateFrom && filDateTo && filDateFrom > filDateTo),
    [filDateFrom, filDateTo]);

  const navPreview = (newIdx: number) => {
    setPreviewOpacity(0);
    setTimeout(() => {
      setPreviewData({ images: previewData!.images, idx: newIdx });
      setPreviewOpacity(1);
    }, 150);
  };

  return (
    <View style={st.root}>
      {/* Header — absolute, transparent, floats above scroll (matches ReconHistoryScreen) */}
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <View style={st.backBtn}>
            <Text style={st.backArrow}>{'\u2039'}</Text>
          </View>
        </TouchableOpacity>
        <Text style={st.title}>{t('expenseHistory')} ({total})</Text>
        <TouchableOpacity style={[st.filterBtn, showFilter && st.filterBtnActive]} onPress={() => {
            if (!showFilter) {
              filterAnim.setValue(0);
              Animated.spring(filterAnim, { toValue: 1, useNativeDriver: true, tension: 170, friction: 26 }).start();
            }
            setShowFilter(!showFilter);
          }} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={showFilter ? colors.surface : colors.textSub} strokeWidth={2} strokeLinecap="round">
            <Path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
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
            {/* Date range */}
            <View style={st.filterField}>
              <Text style={st.filterLabel}>{t('filterDate')}</Text>
              <View style={st.filterDateRange}>
                <View style={st.filterDateWrap}>
                  {filDateFrom ? (
                    <Text style={st.filterDateText}>{fmtExpDate(filDateFrom)}</Text>
                  ) : (
                    <Text style={st.filterDatePlaceholder}>{t('any')}</Text>
                  )}
                  <input type="date" ref={filDateFromRef} defaultValue={filDateFrom} max={todayStr()} key={filDateFromKey}
                    onChange={(e: any) => { if (isFuture(e.target.value)) { filDateFromRef.current!.value = filDateFrom; setFilDateFromKey(k => k + 1); setFilterDateError(c => c + 1); } else { setFilDateFrom(e.target.value); } }}
                    style={st.filterDateHidden as any} />
                </View>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.secondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginHorizontal: 2, transform: [{ translateY: -1 }] }}><Path d="M9 18l6-6-6-6"/></Svg>
                <View style={st.filterDateWrap}>
                  {filDateTo ? (
                    <Text style={st.filterDateText}>{fmtExpDate(filDateTo)}</Text>
                  ) : (
                    <Text style={st.filterDatePlaceholder}>{t('any')}</Text>
                  )}
                  <input type="date" ref={filDateToRef} defaultValue={filDateTo} max={todayStr()} key={filDateToKey}
                    onChange={(e: any) => { if (isFuture(e.target.value)) { filDateToRef.current!.value = filDateTo; setFilDateToKey(k => k + 1); setFilterDateError(c => c + 1); } else { setFilDateTo(e.target.value); } }}
                    style={st.filterDateHidden as any} />
                </View>
              </View>
            </View>
            {/* Category chips */}
            <View style={st.filterField}>
              <Text style={st.filterLabel}>{t('filterCategory')}</Text>
              <View style={st.filterChipRow}>
                {(['日常', '房租', '薪资', '采购'] as const).map(cat => {
                  const active = filCategories.includes(cat);
                  return (
                    <TouchableOpacity key={cat}
                      style={[st.filterChip, active && st.filterChipActive]}
                      onPress={() => toggleCat(cat)} activeOpacity={0.7}>
                      <Text style={[st.filterChipText, active && st.filterChipTextActive]}>{t(cat === '日常' ? 'daily' : cat === '房租' ? 'rent' : cat === '薪资' ? 'salary' : 'goods' as any)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            {/* Actions */}
            <View style={st.filterActions}>
              <TouchableOpacity style={st.filterResetBtn} onPress={() => {
                setFilDateFrom(''); setFilDateTo(''); setFilCategories([]);
                setAppliedFrom(''); setAppliedTo(''); setAppliedCats('');
              }} activeOpacity={0.7}>
                <Text style={st.filterResetBtnText}>{t('reset')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.filterApplyBtn, rangeInvalid && st.filterApplyBtnDisabled]}
                disabled={rangeInvalid}
                onPress={() => {
                  setAppliedFrom(filDateFrom);
                  setAppliedTo(filDateTo);
                  setAppliedCats(filCategories.join(','));
                  setShowFilter(false);
                }} activeOpacity={0.8}>
                <Text style={[st.filterApplyBtnText, rangeInvalid && st.filterApplyBtnTextDisabled]}>{t('apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
                </Animated.View>
      </>)}

        {/* List — FlatList virtualises rows so off-screen items don't block scroll */}
      <FlatList
        testID="exp-scroll"
        style={st.list}
        data={visible}
        keyExtractor={(e: any, i: number) => e.id != null ? `tx-${e.id}` : `tx-${i}`}
        renderItem={renderItem}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: showFilter ? 246 : 112, paddingHorizontal: 16, paddingBottom: 80 }}
        ListEmptyComponent={!loading ? (
          <View style={st.emptyWrap}>
            <View style={st.emptyIcon}><Text style={st.emptyEmoji}>{'\uD83D\uDCCB'}</Text></View>
            <Text style={st.emptyTitle}>{t('noRecords')}</Text>
            <Text style={st.emptyHint}>{t('emptyExpenseHint')}</Text>
          </View>
        ) : null}
        ListFooterComponent={loading ? (
          <View style={st.loading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={st.loadingText}>...</Text>
          </View>
        ) : null}
      />

      {/* Fullscreen image preview with left/right swipe */}
      {previewData && (
        <View style={st.previewOverlay}
          onTouchStart={(e: any) => { touchStartX.current = e.nativeEvent.pageX || e.nativeEvent.touches?.[0]?.pageX || 0; }}
          onTouchEnd={(e: any) => {
            const endX = e.nativeEvent.pageX || e.nativeEvent.changedTouches?.[0]?.pageX || 0;
            const dx = endX - touchStartX.current;
            if (Math.abs(dx) > 60) {
              if (dx < 0 && previewData.idx < previewData.images.length - 1) {
                navPreview(previewData.idx + 1);
              } else if (dx > 0 && previewData.idx > 0) {
                navPreview(previewData.idx - 1);
              }
            }
          }}>
          <TouchableOpacity style={st.previewClose}
            onPress={() => setPreviewData(null)}
            activeOpacity={0.7}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.surface} strokeWidth={2} strokeLinecap="round">
              <Path d="M18 6L6 18M6 6l12 12" />
            </Svg>
          </TouchableOpacity>
          {previewData.images.length > 1 && previewData.idx > 0 && (
            <TouchableOpacity style={st.previewArrowLeft}
              onPress={() => navPreview(previewData.idx - 1)}
              activeOpacity={0.7}>
              <Text style={st.previewArrowText}>{'\u2039'}</Text>
            </TouchableOpacity>
          )}
          {previewData.images.length > 1 && previewData.idx < previewData.images.length - 1 && (
            <TouchableOpacity style={st.previewArrowRight}
              onPress={() => navPreview(previewData.idx + 1)}
              activeOpacity={0.7}>
              <Text style={st.previewArrowText}>{'\u203A'}</Text>
            </TouchableOpacity>
          )}
          {React.createElement('img', {
            src: previewData.images[previewData.idx],
            key: previewData.idx,
            decoding: 'async' as any,
            style: {
              maxWidth: '90%', maxHeight: '80%', borderRadius: 12, objectFit: 'contain',
              opacity: previewOpacity,
              // @ts-ignore
              transition: 'opacity 0.2s ease',
            },
            alt: 'preview',
          })}
          {previewData.images.length > 1 && (
            <Text style={st.previewCounter}>{previewData.idx + 1} / {previewData.images.length}</Text>
          )}
        </View>
      )}

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

const getSt = (colors: ThemeColors): any => StyleSheet.create({
  /* Root — flex: 1, no background (page bg from parent) */
  root: { flex: 1 },
  ...historyHeader(colors),
  /* List — scrolls under absolute header (matches ReconHistoryScreen list) */
  list: { flex: 1 },
  /* Row */
  row: {
    backgroundColor: colors.surface, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1, borderColor: colors.secondary,
    // @ts-ignore
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  badges: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1,
  },
  catBadge: {
    backgroundColor: withAlpha(colors.warning, 0.1), borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  catBadgeText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.primary },
  payBadge: {
    backgroundColor: colors.bg, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  payBadgeText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub },
  amount: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: colors.danger },
  filledBy: { fontSize: FONTS.micro.size, color: colors.textSub, marginTop: 2 },
  imgThumbs: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  rowBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: FONTS.sub.size, color: colors.textSub },
  note: { fontSize: FONTS.sub.size, color: colors.textSub, flex: 1, textAlign: 'right' },
  emptyWrap: { marginTop: 80, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.secondary },
  emptyEmoji: { fontSize: FONTS.h1.size },
  emptyTitle: { fontSize: FONTS.body.size, fontWeight: '500', color: colors.textSub },
  emptyHint: { fontSize: FONTS.sub.size, color: colors.textSub, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  loading: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 8 },
  loadingText: { fontSize: FONTS.sub.size, color: colors.primary },
  /* Preview overlay */
  previewOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  previewClose: {
    position: 'absolute', top: 48, right: 20, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  previewArrowLeft: {
    position: 'absolute', left: 16, top: '50%', zIndex: 10,
    width: 40, height: 40, borderRadius: 20, marginTop: -20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  previewArrowRight: {
    position: 'absolute', right: 16, top: '50%', zIndex: 10,
    width: 40, height: 40, borderRadius: 20, marginTop: -20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  previewArrowText: { fontSize: FONTS.amount.size, fontWeight: '300', color: colors.surface, marginTop: -2 },
  previewCounter: {
    position: 'absolute', bottom: 60, zIndex: 10,
    fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: 'rgba(255,255,255,0.7)',
  },
  /* Filter panel — matches ReconHistoryScreen */
  filterBtnTextActive: { color: colors.surface },
  filterPanel: {
    backgroundColor: colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.secondary,
    overflow: 'hidden',
  },
  filterContent: { padding: 12, gap: 8 },
  filterField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterLabel: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub, width: 64, flexShrink: 0 },
  filterDateRange: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  // @ts-ignore outline is web-only CSS, not in RN types
  filterDateInput: {
    flex: 1, height: 34, paddingHorizontal: 8,
    backgroundColor: colors.surface, borderRadius: 6,
    borderWidth: 1, borderColor: colors.secondary,
    fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub,
    fontFamily: 'inherit', outline: 'none',
  },
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
  filterChipRow: { flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: colors.bg,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub },
  filterChipTextActive: { color: colors.surface },
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
} as any);