import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FONTS, withAlpha, ThemeColors } from '../theme';
import { t } from '../i18n';
import AnimatedDropdown from './AnimatedDropdown';

export type MonthValue = 'all' | { year: number; month: number };

interface MonthPickerProps {
  selected: MonthValue;
  onSelect: (value: MonthValue) => void;
  months: { year: number; month: number }[];
  colors: ThemeColors;
  allLabel?: string;
  /** Set false when already inside a <Modal> — renders dropdown inline instead of nesting another Modal. */
  useModal?: boolean;
  /** Compact trigger style (gap:2, paddingTop:2) for inline use like platform fee card. Default true. */
  compact?: boolean;
}

/** Shared month selector: trigger button + AnimatedDropdown with scale animation.
 *  Used by platform fee card and fee history modal. */
export default function MonthPicker({ selected, onSelect, months, colors, allLabel, useModal = true, compact = true }: MonthPickerProps) {
  const [visible, setVisible] = useState(false);
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
      setVisible(true);
    } else {
      setVisible(false);
    }
  };

  const selectAndClose = (value: MonthValue) => {
    setVisible(false);
    onSelect(value);
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
        style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 2 : 4, position: 'relative', ...(compact ? { paddingTop: 2 } : { paddingVertical: 8 }) }}
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
      <AnimatedDropdown
        visible={visible}
        onClose={() => setVisible(false)}
        inline={!useModal}
        style={{ top: pos.top || 100, left: pos.left || 10, width: 140 }}
      >
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          paddingVertical: 6,
          maxHeight: 240,
          overflow: 'hidden' as const,
        }}>
          <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            {/* All months option */}
            <TouchableOpacity
              style={{
                paddingHorizontal: 12, paddingVertical: 8,
                backgroundColor: selected === 'all' ? withAlpha(colors.danger, 0.1) : 'transparent',
                borderRadius: 8, marginHorizontal: 4,
              }}
              onPress={() => selectAndClose('all')}
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
                  onPress={() => selectAndClose({ year: f.year, month: f.month })}
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
        </View>
      </AnimatedDropdown>
    </>
  );
}
