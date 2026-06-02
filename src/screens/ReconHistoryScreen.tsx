import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import Toast from '../components/Toast';

interface Props { onBack: () => void }

export default function ReconHistoryScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const styles = useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r: any = await api.getReconciliations(30);
        setRecords(Array.isArray(r) ? r : (r.records || r.items || []));
      } catch { setToast(t('toastLoadFailed')); }
      setLoading(false);
    })();
  }, []);

  const fmtDateZh = (s: string) => {
    const [y, m, d] = (s || '').split('-');
    if (!y) return s;
    return getLang() === 'zh-TW' ? `${y}年${m}月${d}日` : `${y}年${m}月${d}日`;
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.backBtn}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textMain} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.title}>{t('reconHistory')} ({records.length})</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View>
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('emptyReconHint') || '暂无可对账记录'}</Text>
          </View>
        ) : (
          records.map((r: any, i: number) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardDate}>{fmtDateZh(r.date || r.created_at)}</Text>
                <Text style={styles.cardAmount}>¥{(r.total_amount || r.amount || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardSub}>{r.recorded_by ? `${t('reconciledBy')}: ${r.recorded_by}` : ''}</Text>
                {r.diff !== undefined && r.diff !== null ? (
                  <Text style={[styles.cardDiff, Math.abs(r.diff) < 0.01 ? styles.cardDiffOk : styles.cardDiffBad]}>
                    差异 ¥{r.diff.toFixed(2)}
                  </Text>
                ) : null}
              </View>
              {r.note ? <Text style={styles.note}>{r.note}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>

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
  title: { fontSize: 18, fontWeight: '700', color: colors.textMain },
  content: { padding: 16, paddingBottom: 60 },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { color: colors.textSub, fontSize: 14 },
  card: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardDate: { fontSize: 13, color: colors.textSub },
  cardAmount: { fontSize: 16, color: colors.textMain, fontWeight: '700' },
  cardSub: { fontSize: 12, color: colors.textSub },
  cardDiff: { fontSize: 12, fontWeight: '600' },
  cardDiffOk: { color: colors.success },
  cardDiffBad: { color: colors.danger },
  note: { marginTop: 6, fontSize: 12, color: colors.textSub, fontStyle: 'italic' },
});
