import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Modal } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FONTS, withAlpha, ThemeColors } from '../theme';
import { t } from '../i18n';

export type MonthValue = 'all' | { year: number; month: number };

interface MonthPickerProps {
  selected: MonthValue;
  onSelect: (value: MonthValue) => void;
  months: { year: number; month: number }[];
  colors: ThemeColors;
  allLabel?: string;
  /** Set false when already inside a <Modal> — renders dropdown inline instead of nesting another Modal. */
  useModal?: boolean;
}

/** Shared month selector: trigger button + dropdown with scale animation.
 *  Used by platform fee card and fee history modal. */
export default function MonthPicker({ selected, onSelect, months, colors, allLabel, useModal = true }: MonthPickerProps) {
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

  const DropdownContent = (
    <Animated.View style={{
      position: 'absolute',
      top: pos.top || 100,
      left: pos.left || 10,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingVertical: 6,
      width: 140,
      maxHeight: 240,
      zIndex: 99999,
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
  );

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
        <Svg width={14} height={14} viewBox="0 0 1024 1024" style={{ marginLeft: 2 }}>
          <Path d="M836.899 399.237l-218.01 335.037c-47.506 73.007-166.272 73.007-213.778 0l-218.01-335.037C139.595 326.23 198.977 234.97 293.99 234.97h436.02c95.013 0 154.395 91.26 106.889 164.267z" fill={colors.primary} />
        </Svg>
      </TouchableOpacity>

      {/* Dropdown */}
      {useModal ? (
        <Modal transparent animationType="none" visible={visible} onRequestClose={() => close()}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => close()}>
            <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.08)', opacity: anim }} />
          </TouchableOpacity>
          {DropdownContent}
        </Modal>
      ) : visible ? (
        <>
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }}
            activeOpacity={1}
            onPress={() => close()}
          >
            <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.08)', opacity: anim }} />
          </TouchableOpacity>
          {DropdownContent}
        </>
      ) : null}
    </>
  );
}
