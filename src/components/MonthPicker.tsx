import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { FONTS, ThemeColors, withAlpha } from '../theme';
import { SHEET_RADIUS } from '../sharedStyles';
import { t } from '../i18n';
import AnimatedDropdown from './AnimatedDropdown';
import DropdownArrow from './DropdownArrow';
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
        <DropdownArrow color={colors.primary} expanded={visible} />
      </TouchableOpacity>

      {/* Dropdown */}
      <AnimatedDropdown
        visible={visible}
        onClose={() => setVisible(false)}
        inline={!useModal}
        style={{ top: pos.top || 100, left: pos.left || 10, width: 160 }}
      >
        <BlurView intensity={45} tint="dark" style={{
          borderRadius: SHEET_RADIUS,
          overflow: 'hidden' as const,
        }}>
          <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            {/* All months option */}
            <TouchableOpacity
              style={{
                paddingHorizontal: 12, paddingVertical: 10,
                backgroundColor: selected === 'all' ? 'rgba(10,132,255,0.25)' : 'transparent',
                borderRadius: 8, marginHorizontal: 4, marginTop: 4,
              }}
              onPress={() => selectAndClose('all')}
              activeOpacity={0.6}
            >
              <Text style={{
                fontSize: FONTS.sub.size,
                fontWeight: selected === 'all' ? '700' : '500',
                color: selected === 'all' ? '#0A84FF' : '#FFFFFF',
              }}>
                {label}
              </Text>
            </TouchableOpacity>
            {sortedMonths.map((f: any, i: number) => {
              const isSel = selected !== 'all' && selected.year === f.year && selected.month === f.month;
              return (
                <TouchableOpacity
                  key={`mp-${f.year}-${f.month}`}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 10,
                    backgroundColor: isSel ? 'rgba(10,132,255,0.25)' : 'transparent',
                    borderRadius: 8, marginHorizontal: 4,
                    marginBottom: i === sortedMonths.length - 1 ? 4 : 0,
                  }}
                  onPress={() => selectAndClose({ year: f.year, month: f.month })}
                  activeOpacity={0.6}
                >
                  <Text style={{
                    fontSize: FONTS.sub.size,
                    fontWeight: isSel ? '700' : '400',
                    color: isSel ? '#0A84FF' : '#FFFFFF',
                  }}>
                    {f.year}.{String(f.month).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </BlurView>
      </AnimatedDropdown>
    </>
  );
}
