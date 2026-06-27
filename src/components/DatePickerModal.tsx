import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Animated, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { t, getLang } from '../i18n';

interface Props {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSelect: (date: string) => void;
  minDate?: string;
  title?: string;
}

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayStr = () => fmtDate(new Date());
const shiftDays = (base: string, n: number) => {
  const [y, m, d] = base.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  dt.setDate(dt.getDate() + n);
  return fmtDate(dt);
};

const ITEM_H = 44;
const VISIBLE = 5;
const PAD = ITEM_H * 2;
const MONTHS_ZH = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── 3D wheel column ── */
function WheelColumn({
  items, selectedIdx, onChange, scrollRef,
}: {
  items: string[];
  selectedIdx: number;
  onChange: (idx: number) => void;
  scrollRef: React.RefObject<ScrollView>;
}) {
  const onEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    onChange(Math.max(0, Math.min(idx, items.length - 1)));
  }, [items.length]);

  return (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      onMomentumScrollEnd={onEnd}
    >
      {/* top spacer so first item can scroll to center */}
      <View style={{ height: PAD }} />
      {items.map((label, i) => {
        const absDist = Math.abs(i - selectedIdx);
        const scale = Math.max(0.75, 1 - absDist * 0.08);
        const opacity = Math.max(0.2, 1 - absDist * 0.55);
        const isCenter = absDist < 0.5;
        return (
          <View key={label} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{
              transform: [
                { perspective: 400 },
                { rotateX: `${(i - selectedIdx) * 22}deg` },
                { scale },
              ],
              opacity,
            }}>
              <Text style={{
                fontSize: 17,
                color: isCenter ? '#FFFFFF' : 'rgba(255,255,255,0.38)',
                fontWeight: isCenter ? '700' : '400',
              }}>
                {label}
              </Text>
            </Animated.View>
          </View>
        );
      })}
      {/* bottom spacer */}
      <View style={{ height: PAD }} />
    </ScrollView>
  );
}

export default function DatePickerModal({ visible, value, onClose, onSelect, minDate, title }: Props) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState(value);
  const [year, month] = (draft || todayStr()).split('-').map(Number);
  const [yearMode, setYearMode] = useState(false);
  const [gridFade] = useState(new Animated.Value(1));
  const [, forceRender] = useState(0);

  const [wheelYearIdx, setWheelYearIdx] = useState(0);
  const [wheelMonthIdx, setWheelMonthIdx] = useState(0);
  const yearRef = useRef<ScrollView>(null!);
  const monthRef = useRef<ScrollView>(null!);

  const [mounted, setMounted] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const close = useCallback((afterClose?: () => void) => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setMounted(false);
      afterClose?.();
    });
  }, [anim]);

  useEffect(() => {
    if (visible) {
      setDraft(value); // sync from parent each time modal opens — Modal doesn't remount children
      setMounted(true);
      const spring = Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 24 });
      spring.start();
      return () => spring.stop();
    } else {
      anim.setValue(0);
      setMounted(false);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps — value sync is open-only

  if (!mounted) return null;

  const w = 'rgba(255,255,255,0.92)';
  const wSub = 'rgba(255,255,255,0.55)';
  const wBg = 'rgba(255,255,255,0.08)';
  const wBg2 = 'rgba(255,255,255,0.04)';

  const isValid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const isFuture = (s: string) => !!minDate && s > minDate;
  const thisYear = new Date().getFullYear();
  const minYear = thisYear - 20;
  const maxYear = thisYear + 20;
  const yearsArr: string[] = [];
  for (let y = minYear; y <= maxYear; y++) yearsArr.push(String(y));

  const months = getLang().startsWith('en') ? MONTHS_EN : MONTHS_ZH;

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = (() => {
    const l = getLang();
    if (l.startsWith('en')) return `${MONTHS_EN[month-1]} ${year}`;
    return `${year} 年 ${MONTHS_ZH[month-1]}`;
  })();

  const openWheel = () => {
    setWheelYearIdx(year - minYear);
    setWheelMonthIdx(month - 1);
    setYearMode(true);
    setTimeout(() => {
      yearRef.current?.scrollTo({ y: (year - minYear) * ITEM_H, animated: false });
      monthRef.current?.scrollTo({ y: (month - 1) * ITEM_H, animated: false });
    }, 50);
  };

  const confirmWheel = () => {
    const wy = minYear + wheelYearIdx;
    const wm = wheelMonthIdx + 1;
    const d = Math.min(parseInt(draft.split('-')[2] || '1'), new Date(wy, wm, 0).getDate());
    setDraft(`${wy}-${String(wm).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    setYearMode(false);
  };

  const handleSelectDay = (d: number) => {
    setDraft(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  };

  const handlePrevMonth = () => {
    let m = month - 1, y2 = year;
    if (m < 1) { m = 12; y2 -= 1; }
    setDraft(`${y2}-${String(m).padStart(2,'0')}-01`);
  };
  const handleNextMonth = () => {
    let m = month + 1, y2 = year;
    if (m > 12) { m = 1; y2 += 1; }
    setDraft(`${y2}-${String(m).padStart(2,'0')}-01`);
  };

  const quickChips = [
    { label: getLang().startsWith('en') ? 'Today' : '今天', d: todayStr() },
    { label: getLang().startsWith('en') ? 'Yest.' : '昨天', d: shiftDays(todayStr(), -1) },
    { label: getLang().startsWith('en') ? '2d ago' : '前天', d: shiftDays(todayStr(), -2) },
  ];

  const styles = getStyles(w, wSub, wBg, wBg2);

  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0], extrapolate: 'clamp' }) }] }}>
      <View style={[styles.overlay, { justifyContent: 'flex-end', paddingBottom: 0 }]}>
        <TouchableOpacity style={styles.backdrop} onPress={() => close(onClose)} activeOpacity={1} />
      <BlurView intensity={55} tint="dark" style={styles.sheet}>
        {yearMode ? (
          <>
            <View style={styles.wheelHeader}>
              <TouchableOpacity onPress={() => setYearMode(false)}>
                <Text style={{ color: wSub, fontSize: 14 }}>{getLang().startsWith('en') ? 'Cancel' : '取消'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmWheel}>
                <Text style={{ color: '#0A84FF', fontSize: 14, fontWeight: '700' }}>{t('confirm') || '确定'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.wheelWrap}>
              {/* Center highlight */}
              <View style={styles.wheelHighlight} pointerEvents="none" />
              {/* Year */}
              <View style={styles.wheelCol}>
                <WheelColumn
                  items={yearsArr}
                  selectedIdx={wheelYearIdx}
                  onChange={setWheelYearIdx}
                  scrollRef={yearRef}
                />
              </View>
              {/* Month */}
              <View style={styles.wheelCol}>
                <WheelColumn
                  items={months}
                  selectedIdx={wheelMonthIdx}
                  onChange={setWheelMonthIdx}
                  scrollRef={monthRef}
                />
              </View>
            </View>
          </>
        ) : (
          <>
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
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDraft(shiftDays(draft, -1))}>
                <Text style={styles.stepBtnText}>-1 {getLang().startsWith('en') ? 'day' : '天'}</Text>
              </TouchableOpacity>
              <TextInput style={styles.dateInput} value={draft} onChangeText={setDraft} keyboardType="numbers-and-punctuation" maxLength={10} placeholder="YYYY-MM-DD" placeholderTextColor={wSub} />
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDraft(shiftDays(draft, 1))}>
                <Text style={styles.stepBtnText}>+1 {getLang().startsWith('en') ? 'day' : '天'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={handlePrevMonth} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={styles.monthBtn}>
                <Text style={styles.monthBtnText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openWheel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.monthLabel}>{monthLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={styles.monthBtn}>
                <Text style={styles.monthBtnText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.gridArea}>
              <View style={styles.weekdayRow}>
                {(getLang().startsWith('en') ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] : ['日','一','二','三','四','五','六']).map(d => (
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
                    <TouchableOpacity key={i} style={styles.dayCell} disabled={disabled} onPress={() => handleSelectDay(d)} activeOpacity={0.7}>
                      {isSelected ? (
                        <View style={styles.dayCapsule}><Text style={styles.dayTextSelected}>{d}</Text></View>
                      ) : isToday ? (
                        <View style={styles.dayCapsuleToday}><Text style={styles.dayTextToday}>{d}</Text></View>
                      ) : (
                        <Text style={[styles.dayText, disabled && styles.dayTextDisabled]}>{d}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.footer}>
              <TouchableOpacity style={styles.footerBtn} onPress={() => setDraft(value)}>
                <Text style={{ color: w, fontSize: 14, fontWeight: '500' }}>{getLang().startsWith('en') ? 'Reset' : '重置'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtn, (!isValid(draft) || isFuture(draft)) && { opacity: 0.3 }]}
                disabled={!isValid(draft) || !!isFuture(draft)}
                onPress={() => close(() => { onSelect(draft); onClose(); })}
              >
                <Text style={{ color: '#0A84FF', fontSize: 14, fontWeight: '700' }}>{t('confirm') || '确定'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </BlurView>
      </View>
    </Animated.View>
  );
}

const getStyles = (w: string, wSub: string, wBg: string, wBg2: string) => ({
  overlay: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, alignItems: 'center' as const },
  backdrop: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { width: '94%' as const, maxWidth: 420, borderRadius: 22, overflow: 'hidden' as const, padding: 16, gap: 0 },
  quickRow: { flexDirection: 'row' as const, gap: 6, marginBottom: 12, marginTop: 8 },
  quickChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: wBg2, alignItems: 'center' as const },
  quickChipActive: { backgroundColor: '#0A84FF18' },
  quickChipText: { fontSize: 12, color: wSub, fontWeight: '500' as const },
  quickChipTextActive: { color: '#0A84FF', fontWeight: '700' as const },
  stepperRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 12 },
  stepBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: wBg },
  stepBtnText: { fontSize: 13, color: wSub, fontWeight: '600' as const },
  dateInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 0, backgroundColor: wBg2, fontSize: 14, color: w, textAlign: 'center' as const, fontWeight: '600' as const },
  calendarHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 2 },
  monthBtn: { paddingHorizontal: 8, paddingVertical: 0, borderRadius: 6 },
  monthBtnText: { fontSize: 28, color: '#0A84FF', fontWeight: '700' as const },
  monthLabel: { fontSize: 14, fontWeight: '700' as const, color: w, paddingVertical: 4, paddingHorizontal: 8 },
  weekdayRow: { flexDirection: 'row' as const, marginBottom: 4 },
  weekdayText: { flex: 1, textAlign: 'center' as const, fontSize: 11, color: wSub, fontWeight: '600' as const, paddingVertical: 4 },
  gridArea: {},
  daysGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const },
  dayCell: { width: '14.28%' as const, height: 42, alignItems: 'center' as const, justifyContent: 'center' as const },
  dayCapsule: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0A84FF18', alignItems: 'center' as const, justifyContent: 'center' as const },
  dayCapsuleToday: { width: 36, height: 36, borderRadius: 18, alignItems: 'center' as const, justifyContent: 'center' as const },
  dayText: { fontSize: 14, color: w },
  dayTextToday: { color: '#0A84FF', fontWeight: '600' as const },
  dayTextSelected: { color: '#0A84FF', fontWeight: '600' as const, fontSize: 15 },
  dayTextDisabled: { color: wSub + '30' },
  footer: { flexDirection: 'row' as const, gap: 10, marginTop: 12 },
  footerBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' as const },
  /* ── Wheel ── */
  wheelHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingBottom: 8 },
  wheelWrap: { height: ITEM_H * VISIBLE, flexDirection: 'row' as const, overflow: 'hidden' as const, backgroundColor: 'transparent', paddingHorizontal: 30 },
  wheelCol: { flex: 1, overflow: 'hidden' as const },
  wheelHighlight: {
    position: 'absolute' as const, left: 35, right: 35,
    top: ITEM_H * 2 + (ITEM_H - 36) / 2, height: 36, zIndex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  wheelMaskTop: { position: 'absolute' as const, left: 0, right: 0, top: 0, height: ITEM_H * 2, zIndex: 2 },
  wheelMaskBottom: { position: 'absolute' as const, left: 0, right: 0, bottom: 0, height: ITEM_H * 2, zIndex: 2 },
});
