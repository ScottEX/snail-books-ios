import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import { useServerDate } from '../hooks/useServerDate';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import Toast from '../components/Toast';
import DatePickerModal from '../components/DatePickerModal';

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
  const insets = useSafeAreaInsets();
  const sd = useServerDate();
  const styles = useMemo(() => getStyles(colors), [colors]);

  // Filter
  const [showFilter, setShowFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState(sd.offset(-30));
  const [dateTo, setDateTo] = useState(sd.today);
  const [appliedFrom, setAppliedFrom] = useState(dateFrom);
  const [appliedTo, setAppliedTo] = useState(dateTo);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

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

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.backBtn}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textMain} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.title}>{t('revHistoryBtn')} ({total}/{totalAll})</Text>
        <TouchableOpacity
          style={[styles.filterBtn, showFilter && styles.filterBtnActive]}
          onPress={() => setShowFilter(!showFilter)}
          activeOpacity={0.7}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
            stroke={showFilter ? colors.surface : colors.textMain} strokeWidth={2} strokeLinecap="round">
            <Path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {showFilter && (
        <View style={styles.filterPanel}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>{t('revenueDate')}</Text>
            <View style={styles.filterDateRange}>
              <TouchableOpacity style={styles.filterDateWrap} onPress={() => setShowFromPicker(true)}>
                <Text style={dateFrom ? styles.filterDateText : styles.filterDatePlaceholder}>
                  {dateFrom ? fmtDate(dateFrom) : t('any')}
                </Text>
              </TouchableOpacity>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.secondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M9 18l6-6-6-6"/>
              </Svg>
              <TouchableOpacity style={styles.filterDateWrap} onPress={() => setShowToPicker(true)}>
                <Text style={dateTo ? styles.filterDateText : styles.filterDatePlaceholder}>
                  {dateTo ? fmtDate(dateTo) : t('any')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {rangeInvalid && <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'right', marginTop: 4 }}>{t('errDateRange')}</Text>}
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.filterResetBtn} onPress={() => {
              const from = sd.offset(-30);
              const to = sd.today;
              setDateFrom(from); setDateTo(to);
              setAppliedFrom(from); setAppliedTo(to);
              setShowFilter(false);
            }} activeOpacity={0.7}>
              <Text style={styles.filterResetBtnText}>{t('reset')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterApplyBtn, rangeInvalid && styles.filterApplyBtnDisabled]}
              disabled={rangeInvalid}
              onPress={() => {
                setAppliedFrom(dateFrom);
                setAppliedTo(dateTo);
                setShowFilter(false);
              }} activeOpacity={0.8}>
              <Text style={[styles.filterApplyBtnText, rangeInvalid && styles.filterApplyBtnTextDisabled]}>{t('apply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: showFilter ? 150 : 0 }]}>
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
      </ScrollView>

      <DatePickerModal
        visible={showFromPicker}
        value={dateFrom}
        onClose={() => setShowFromPicker(false)}
        onSelect={(d) => { setDateFrom(d); setShowFromPicker(false); }}
        title={t('startDate')}
      />
      <DatePickerModal
        visible={showToPicker}
        value={dateTo}
        onClose={() => setShowToPicker(false)}
        onSelect={(d) => { setDateTo(d); setShowToPicker(false); }}
        title={t('endDate')}
      />

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    backgroundColor: withAlpha(colors.bg, 0.6),
    borderBottomWidth: 1, borderBottomColor: withAlpha(colors.textSub, 0.1),
  },
  backBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '700', color: colors.textMain, flex: 1 },
  filterBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: withAlpha(colors.textSub, 0.1),
    alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: colors.primary },
  filterPanel: {
    position: 'absolute', top: 56, left: 0, right: 0, zIndex: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.secondary,
    gap: 8,
  },
  filterField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterLabel: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub, width: 64 },
  filterDateRange: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterDateWrap: {
    flex: 1, height: 34,
    backgroundColor: colors.bg, borderRadius: 6,
    borderWidth: 1, borderColor: colors.secondary,
    justifyContent: 'center', paddingHorizontal: 8,
  },
  filterDateText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub },
  filterDatePlaceholder: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub, fontStyle: 'italic' },
  filterActions: { flexDirection: 'row', gap: 8 },
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

  content: { padding: 16, paddingBottom: 60 },
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
});
