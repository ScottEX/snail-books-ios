import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import ModalOverlay from './ModalOverlay';
import { FONTS } from '../theme';
import { t, getLang } from '../i18n';

interface Props {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSelect: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  title?: string;
}

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayStr = () => fmtDate(new Date());

const parseDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
};

export default function DatePickerModal({ visible, value, onClose, onSelect, minDate, maxDate }: Props) {
  const [draft, setDraft] = useState(value);
  const insets = useSafeAreaInsets();

  const prevVisible = useRef(visible);
  if (visible && !prevVisible.current) {
    setDraft(value);
  }
  prevVisible.current = visible;

  const pickerDate = parseDate(draft || todayStr());
  const locale = (() => {
    const l = getLang();
    if (l.startsWith('en')) return 'en-US';
    if (l === 'zh-TW' || l === 'zh-Hant') return 'zh-Hant';
    return 'zh-Hans';
  })();

  const isValid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const isFuture = (s: string) => !!maxDate && s > maxDate;

  const handlePickerChange = (_e: DateTimePickerEvent, date?: Date) => {
    if (date) setDraft(fmtDate(date));
  };

  return (
    <ModalOverlay
      visible={visible}
      onClose={onClose}
      animation="iosSheet"
      overlayStyle={{ justifyContent: 'flex-end', padding: 0 }}
      contentStyle={{ width: '100%', alignItems: 'center' }}
    >
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          locale={locale}
          minimumDate={minDate ? parseDate(minDate) : undefined}
          maximumDate={maxDate ? parseDate(maxDate) : undefined}
          onChange={handlePickerChange}
          themeVariant="light"
        />
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerBtn} onPress={() => setDraft(value)}>
            <Text style={{ color: 'rgba(0,0,0,0.88)', fontSize: FONTS.body.size, fontWeight: '500' }}>{getLang().startsWith('en') ? 'Reset' : '重置'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, (!isValid(draft) || isFuture(draft)) && { opacity: 0.3 }]}
            disabled={!isValid(draft) || !!isFuture(draft)}
            onPress={() => { onSelect(draft); onClose(); }}
          >
            <Text style={{ color: '#0A84FF', fontSize: FONTS.body.size, fontWeight: '700' }}>{t('confirm') || '确定'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalOverlay>
  );
}

const styles = StyleSheet.create({
  sheet: { width: '100%' as const, borderRadius: 22, overflow: 'hidden' as const, backgroundColor: '#FFFFFF' },
  footer: { flexDirection: 'row' as const, gap: 10, marginTop: 8 },
  footerBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' as const },
});
