import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Modal } from 'react-native';
import { FONTS, withAlpha, ThemeColors } from '../theme';
import { t } from '../i18n';

export type MonthValue = 'all' | { year: number; month: number };

interface MonthPickerProps {
  selected: MonthValue;
  onSelect: (value: MonthValue) => void;
  months: { year: number; month: number }[];
  colors: ThemeColors;
  allLabel?: string;
}

/** Shared month selector: trigger button + dropdown Modal with scale animation.
 *  Used by platform fee card and fee history modal. */
export default function MonthPicker({ selected, onSelect, months, colors, allLabel }: MonthPickerProps) {
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<any>(null);

  const label = allLabel ?? t('feeAllMonths');

  const toggle = () => {
    if (!visible) {
      if (triggerRef.current && typeof triggerRef.current.measureInWindow === 'function') {
        triggerRef.current.measureInWindow((x: number, y: number, w: number, h: number) => {
          setPos({ top: y + h + 4, left: x });
        });
      }
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 24 }).start();
      setVisible(true);
    } else {
      Animated.timing(anim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setVisible(false));
    }
  };

  const close = (cb?: () => void) => {
    Animated.timing(anim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setVisible(false);
      cb?.();
    });
  };

  const displayText = selected === 'all'
    ? label
    : `${selected.year}.${String(selected.month).padStart(2, '0')}`;

  const sortedMonths = [...months]
    .filter((f: any) => f.year > 2024 || (f.year === 2024 && f.month >= 5))
    .sort((a: any, b: any) => (b.year - a.year) || (b.month - a.month));

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity
        ref={triggerRef}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 2, position: 'relative', paddingTop: 2 }}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: FONTS.microBold.size, color: colors.primary, fontWeight: FONTS.microBold.weight }}>
          {displayText}
        </Text>
        <Text style={{ fontSize: FONTS.micro.size, color: colors.primary }}>▼</Text>
      </TouchableOpacity>

      {/* Dropdown */}
      <Modal transparent animationType="none" visible={visible} onRequestClose={() => close()}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => close()}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.08)', opacity: anim }} />
        </TouchableOpacity>
        <Animated.View style={{
          position: 'absolute',
          top: pos.top || 100,
          left: pos.left || 10,
          backgroundColor: colors.surface,
          borderRadius: 14,
          paddingVertical: 6,
          width: 140,
          maxHeight: 240,
          opacity: anim,
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1], extrapolate: 'clamp' }) },
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0], extrapolate: 'clamp' }) },
          ],
        }}>
          <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            {/* All months option */}
            <TouchableOpacity
              style={{
                paddingHorizontal: 12, paddingVertical: 8,
                backgroundColor: selected === 'all' ? withAlpha(colors.danger, 0.1) : 'transparent',
                borderRadius: 8, marginHorizontal: 4,
              }}
              onPress={() => close(() => onSelect('all'))}
              activeOpacity={0.6}
            >
              <Text style={{
                fontSize: FONTS.sub.size,
                fontWeight: selected === 'all' ? '700' : '500',
                color: selected === 'all' ? colors.primary : colors.textMain,
              }}>
                {label}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: colors.secondary, marginHorizontal: 12, marginVertical: 4 }} />
            {sortedMonths.map((f: any) => {
              const isSel = selected !== 'all' && selected.year === f.year && selected.month === f.month;
              return (
                <TouchableOpacity
                  key={`mp-${f.year}-${f.month}`}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8,
                    backgroundColor: isSel ? withAlpha(colors.danger, 0.1) : 'transparent',
                    borderRadius: 8, marginHorizontal: 4,
                  }}
                  onPress={() => close(() => onSelect({ year: f.year, month: f.month }))}
                  activeOpacity={0.6}
                >
                  <Text style={{
                    fontSize: FONTS.sub.size,
                    fontWeight: isSel ? '700' : '400',
                    color: isSel ? colors.primary : colors.textMain,
                  }}>
                    {f.year}.{String(f.month).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Modal>
    </>
  );
}
