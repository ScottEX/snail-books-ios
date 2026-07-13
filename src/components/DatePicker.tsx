import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { useTheme } from '../theme';
import { FONTS } from '../theme';
import { getLang } from '../i18n';
import { useState } from 'react';
import DatePickerModal from './DatePickerModal';

interface DatePickerProps {
  date: string;
  onChange: (date: string) => void;
  max?: string;
  onFutureDate?: () => void;
  showChevron?: boolean;
  showCalendarIcon?: boolean;
  displayDate?: string;
  color?: string;
  fontSize?: number;
  disabled?: boolean;
}

export default function DatePicker({
  date,
  onChange,
  max,
  onFutureDate,
  showChevron = true,
  showCalendarIcon = false,
  displayDate,
  color,
  fontSize,
  disabled = false,
}: DatePickerProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const c = color || colors.primary;
  const fs = fontSize || FONTS.subBold.size;
  const fw = (FONTS as any).subBold?.weight || '700';

  const handleSelect = (val: string) => {
    if (max && val > max) {
      onFutureDate?.();
      return;
    }
    onChange(val);
    setOpen(false);
  };

  return (
    <View>
      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}
      >
        {showCalendarIcon && (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.5}>
            <Rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <Line x1="16" y1="2" x2="16" y2="6"/>
            <Line x1="8" y1="2" x2="8" y2="6"/>
            <Line x1="3" y1="10" x2="21" y2="10"/>
          </Svg>
        )}
        <Text style={{ fontSize: fs, fontWeight: fw, color: c }}>
          {displayDate || fmtLocalDate(date)}
        </Text>
        {showChevron && (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M8 5l8 7-8 7" />
          </Svg>
        )}
      </TouchableOpacity>

      <DatePickerModal
        visible={open}
        value={date}
        maxDate={max}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
      />
    </View>
  );
}

function fmtLocalDate(d: string): string {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const lang = getLang();
  if (lang === 'en') {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[+m - 1]} ${+day}, ${y}`;
  }
  return `${y}年${+m}月${+day}日`;
}
