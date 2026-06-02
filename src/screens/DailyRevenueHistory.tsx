import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import Toast from '../components/Toast';

interface Props { onBack: () => void }

export default function DailyRevenueHistory({ onBack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const styles = useMemo(() => getStyles(colors), [colors]);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const r: any = await api.getDailyRevenue(p, 30);
      setRecords(r.records || []);
      setPages(r.pages || 1);
      setPage(r.page || 1);
    } catch { setToast(t('toastLoadFailed')); }
    setLoading(false);
  };
  useEffect(() => { load(1); }, []);

  const fmtDateZh = (s: string) => {
    const [y, m, d] = s.split('-');
    const l = getLang();
    if (l === 'zh-TW') return `${y}年${m}月${d}日`;
    return `${y}年${m}月${d}日`;
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.backBtn}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textMain} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.title}>{t('revHistory')} ({records.length})</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View>
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('noRecords') || '暂无记录'}</Text>
          </View>
        ) : (
          records.map((r: any, i: number) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardDate}>{fmtDateZh(r.date)}</Text>
                {r.archived ? <View style={styles.archivedBadge}><Text style={styles.archivedText}>{t('revMarkArchive')}</Text></View> : null}
              </View>
              <View style={styles.cardGrid}>
                <CardField label={t('revRevenue')} value={r.revenue} colors={colors} />
                <CardField label={t('revTurnover')} value={r.turnover} colors={colors} />
                <CardField label={t('revJD')} value={r.jd_revenue} colors={colors} />
              </View>
              {r.note ? <Text style={styles.note}>{r.note}</Text> : null}
              {r.recorded_by ? <Text style={styles.footer}>{t('recordedBy')}: {r.recorded_by}</Text> : null}
            </View>
          ))
        )}

        {pages > 1 && (
          <View style={styles.pager}>
            <TouchableOpacity disabled={page <= 1} onPress={() => load(page - 1)} style={[styles.pagerBtn, page <= 1 && { opacity: 0.3 }]}>
              <Text style={styles.pagerBtnText}>‹ 上一页</Text>
            </TouchableOpacity>
            <Text style={styles.pagerInfo}>{page} / {pages}</Text>
            <TouchableOpacity disabled={page >= pages} onPress={() => load(page + 1)} style={[styles.pagerBtn, page >= pages && { opacity: 0.3 }]}>
              <Text style={styles.pagerBtnText}>下一页 ›</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

function CardField({ label, value, colors }: { label: string; value: number; colors: ThemeColors }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: colors.textSub, marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 14, color: value > 0 ? colors.textMain : colors.textSub, fontWeight: '600' }}>¥{(value || 0).toFixed(2)}</Text>
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
  title: { fontSize: 18, fontWeight: '700', color: colors.textMain },
  content: { padding: 16, paddingBottom: 60 },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { color: colors.textSub, fontSize: 14 },
  card: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  archivedBadge: { backgroundColor: withAlpha(colors.textSub, 0.15), borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  archivedText: { fontSize: 10, color: colors.textSub, fontWeight: '600' },
  cardGrid: { flexDirection: 'row', gap: 8 },
  note: { marginTop: 8, fontSize: 12, color: colors.textSub, fontStyle: 'italic' },
  footer: { marginTop: 6, fontSize: 11, color: colors.textSub },
  pager: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  pagerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: withAlpha(colors.primary, 0.1) },
  pagerBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  pagerInfo: { fontSize: 13, color: colors.textSub },
});
