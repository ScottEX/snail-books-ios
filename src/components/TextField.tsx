// ═══════════════════════════════════════════
// TextField — 统一输入框组件
//
// 替代各处散落的 TextInput 内联样式。
// 支持 label + error + rightIcon + 多行。
// ═══════════════════════════════════════════

import { View, Text, type TextInputProps } from 'react-native';
import AppTextInput from './AppTextInput';
import { useTheme, withAlpha } from '../theme';
import { FONTS } from '../theme';

interface TextFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  rightIcon?: React.ReactNode;
  /** Extra style for the outer wrapper */
  style?: object;
  /** Extra style for the TextInput itself */
  inputStyle?: object;
  /** Input Mode for number fields on mobile */
  inputMode?: TextInputProps['inputMode'];
}

export default function TextField({
  value, onChangeText, placeholder, label, error,
  multiline, secureTextEntry, keyboardType, autoFocus,
  onSubmitEditing, rightIcon, style, inputStyle, inputMode,
}: TextFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label ? (
        <Text style={{
          fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight,
          color: colors.textSub, marginBottom: 6,
        }}>
          {label}
        </Text>
      ) : null}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.bg,
        borderRadius: 10, borderWidth: 1,
        borderColor: error ? colors.danger : withAlpha(colors.textMain, 0.10),
        paddingHorizontal: 14,
        paddingVertical: multiline ? 10 : 0,
      }}>
        <AppTextInput
          style={[{
            flex: 1, fontSize: FONTS.sub.size, color: colors.textMain,
            paddingVertical: multiline ? 0 : 13,
            minHeight: multiline ? 80 : undefined,
          }, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSub}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          inputMode={inputMode}
          autoFocus={autoFocus}
          onSubmitEditing={onSubmitEditing}
        />
        {rightIcon}
      </View>
      {error ? (
        <Text style={{
          fontSize: FONTS.micro.size, color: colors.danger,
          marginTop: 4, marginLeft: 4,
        }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
