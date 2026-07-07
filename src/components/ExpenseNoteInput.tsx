import { View, Text } from 'react-native';
import AppTextInput from './AppTextInput';
import { useTheme, withAlpha } from '../theme';
import { FONTS } from '../theme';
import { t } from '../i18n';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  onFocus?: () => void;
}

export default function ExpenseNoteInput({ value, onChangeText, placeholder, label, onFocus }: Props) {
  const { colors: c } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <Text style={{ fontSize: 14, color: c.textSub, fontWeight: '500' as any, marginBottom: 0, marginTop: 9 }}>
        {label || t('expenseNote')}
      </Text>
      <AppTextInput
        style={{
          flex: 1,
          fontSize: FONTS.sub.size,
          color: c.textMain,
          borderWidth: 0,
          backgroundColor: withAlpha(c.textMain, 0.03),
          borderRadius: 10,
          padding: 12,
          minHeight: 78,
          textAlignVertical: 'top',
        } as any}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder || t('notePlaceholder')}
        placeholderTextColor={c.textSub}
        multiline
      />
    </View>
  );
}
