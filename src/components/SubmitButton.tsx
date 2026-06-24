import { Text, TouchableOpacity, ActivityIndicator, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import type { ReactNode } from 'react';

/**
 * Port of web/src/components/SubmitButton.tsx — wraps a TouchableOpacity
 * so the loading state shows a spinner instead of disabling the button
 * silently. iOS LoginScreen used to inline `loading ? '...' : label`
 * on each button (and the verify button stayed clickable while empty).
 * SubmitButton centralises both fixes.
 */
interface SubmitButtonProps {
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
  label?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function SubmitButton({
  onPress,
  loading,
  disabled = false,
  label,
  children,
  style,
  textStyle,
}: SubmitButtonProps) {
  return (
    <TouchableOpacity
      style={style}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : children ? (
        children
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}