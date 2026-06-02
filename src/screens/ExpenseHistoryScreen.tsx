import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import Toast from '../components/Toast';

interface Props { onBack: () => void }

export default function ExpenseHistoryScreen({ onBack }: Props) {
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
        const r: any = await api.getTransactions(1, 30, { type: 'expense' });
        setRecords(r.items || r.records || []);
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
        <Text style={styles.title}>{t('expenseHistory')} ({records.length})</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View>
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('emptyExpenseHint') || '暂无支出记录'}</Text>
          </View>
        ) : (
          records.map((r: any, i: number) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardDate}>{fmtDateZh(r.date)}</Text>
                <Text style={styles.cardAmount}>-¥{(r.amount || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardCategory}>{r.category || '—'}</Text>
                <Text style={styles.cardAccount}>{r.account || ''}</Text>
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
  cardAmount: { fontSize: 16, color: colors.danger, fontWeight: '700' },
  cardCategory: { fontSize: 14, color: colors.textMain, fontWeight: '500' },
  cardAccount: { fontSize: 12, color: colors.textSub },
  note: { marginTop: 6, fontSize: 12, color: colors.textSub, fontStyle: 'italic' },
});
