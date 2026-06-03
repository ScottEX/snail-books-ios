import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { t } from '../i18n';

interface Props {
  visible: boolean;
  value: string;  // YYYY-MM-DD
  onClose: () => void;
  onSelect: (date: string) => void;
  minDate?: string;
  title?: string;
}

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayStr = () => fmtDate(new Date());
const shiftDays = (base: string, n: number) => {
  const [y, m, d] = base.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  dt.setDate(dt.getDate() + n);
  return fmtDate(dt);
};

/**
 * RN-native date picker modal. Shows:
 * - Quick chips: 今天 / 昨天 / 前天 / 上周同一天
 * - +/- 1 day buttons
 * - Direct text input (YYYY-MM-DD)
 * - Calendar grid (current month)
 * - OK / Cancel
 */
export default function DatePickerModal({ visible, value, onClose, onSelect, minDate, title }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [year, month] = (draft || todayStr()).split('-').map(Number);

  const styles = useMemo(() => getStyles(colors), [colors]);

  if (!visible) return null;

  const isValid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const isFuture = (s: string) => !!minDate && s > minDate;

  // Calendar grid for the current draft month
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startWeekday = firstDay.getDay();  // 0 = Sun
  const daysInMonth = lastDay.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = (() => {
    const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    return `${year} 年 ${months[month-1]}`;
  })();

  const handleSelect = (d: number) => {
    const next = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    setDraft(next);
  };
  const handlePrevMonth = () => {
    let m = month - 1, y = year;
    if (m < 1) { m = 12; y -= 1; }
    setDraft(`${y}-${String(m).padStart(2,'0')}-01`);
  };
  const handleNextMonth = () => {
    let m = month + 1, y = year;
    if (m > 12) { m = 1; y += 1; }
    setDraft(`${y}-${String(m).padStart(2,'0')}-01`);
  };

  const quickChips = [
    { label: '今天',     d: todayStr() },
    { label: '昨天',     d: shiftDays(todayStr(), -1) },
    { label: '前天',     d: shiftDays(todayStr(), -2) },
  ];

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 60 }]}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title || '选择日期'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M18 6L6 18M6 6l12 12" />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Quick chips */}
        <View style={styles.quickRow}>
          {quickChips.map(c => (
            <TouchableOpacity
              key={c.d}
              style={[styles.quickChip, draft === c.d && styles.quickChipActive]}
              onPress={() => setDraft(c.d)}
            >
              <Text style={[styles.quickChipText, draft === c.d && styles.quickChipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ±1 day controls */}
        <View style={styles.stepperRow}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => setDraft(shiftDays(draft, -1))}>
            <Text style={styles.stepBtnText}>-1 天</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.dateInput}
            value={draft}
            onChangeText={setDraft}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSub}
          />
          <TouchableOpacity style={styles.stepBtn} onPress={() => setDraft(shiftDays(draft, 1))}>
            <Text style={styles.stepBtnText}>+1 天</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={handlePrevMonth} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={styles.monthBtn}>
            <Text style={styles.monthBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={handleNextMonth} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={styles.monthBtn}>
            <Text style={styles.monthBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayRow}>
          {['日','一','二','三','四','五','六'].map(d => (
            <Text key={d} style={styles.weekdayText}>{d}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {cells.map((d, i) => {
            if (d === null) return <View key={i} style={styles.dayCell} />;
            const iso = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isToday = iso === todayStr();
            const isSelected = iso === draft;
            const disabled = isFuture(iso);
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.dayCell,
                  isToday && styles.dayCellToday,
                  isSelected && styles.dayCellSelected,
                ]}
                disabled={disabled}
                onPress={() => handleSelect(d)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayText,
                  isToday && styles.dayTextToday,
                  isSelected && styles.dayTextSelected,
                  disabled && styles.dayTextDisabled,
                ]}>
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Confirm / Cancel */}
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.footerBtn, { borderWidth: 1, borderColor: colors.secondary }]} onPress={onClose}>
            <Text style={{ color: colors.textSub, fontWeight: '600' }}>{t('cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.primary }, (!isValid(draft) || isFuture(draft)) && { opacity: 0.3 }]}
            disabled={!isValid(draft) || !!isFuture(draft)}
            onPress={() => { onSelect(draft); onClose(); }}
          >
            <Text style={{ color: colors.surface, fontWeight: '600' }}>{t('confirm') || '确定'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, alignItems: 'center' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    width: '94%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: 16,
    padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700', color: colors.textMain },
  quickRow: { flexDirection: 'row', gap: 6 },
  quickChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.bg, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  quickChipActive: { backgroundColor: withAlpha(colors.primary, 0.12), borderColor: colors.primary },
  quickChipText: { fontSize: 12, color: colors.textSub, fontWeight: '500' },
  quickChipTextActive: { color: colors.primary, fontWeight: '700' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: withAlpha(colors.textSub, 0.1) },
  stepBtnText: { fontSize: 13, color: colors.textSub, fontWeight: '600' },
  dateInput: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1,
    borderColor: colors.secondary, fontSize: 15, color: colors.textMain, textAlign: 'center', fontWeight: '600',
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  monthBtnText: { fontSize: 18, color: colors.textMain },
  monthLabel: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  weekdayRow: { flexDirection: 'row' },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 11, color: colors.textSub, fontWeight: '600', paddingVertical: 4 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellToday: { borderWidth: 1, borderColor: withAlpha(colors.primary, 0.3), borderRadius: 20 },
  dayCellSelected: { backgroundColor: colors.primary, borderRadius: 20 },
  dayText: { fontSize: 13, color: colors.textMain },
  dayTextToday: { color: colors.primary, fontWeight: '600' },
  dayTextSelected: { color: colors.surface, fontWeight: '700' },
  dayTextDisabled: { color: withAlpha(colors.textSub, 0.3) },
  footer: { flexDirection: 'row', gap: 10, marginTop: 4 },
  footerBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
