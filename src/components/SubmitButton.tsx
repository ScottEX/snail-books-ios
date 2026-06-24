import { Text, TouchableOpacity, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import type { ReactNode } from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * Port of web/src/components/SubmitButton.tsx — wraps a TouchableOpacity
 * so the loading state shows a spinner instead of disabling the button
 * silently. iOS LoginScreen used to inline `loading ? '...' : label`
 * on each button (and the verify button stayed clickable while empty).
 * SubmitButton centralises both fixes.
 *
 * Uses the ported LoadingSpinner (custom SVG spinner, not the stock
 * RN <ActivityIndicator>) so the look matches web's other loading
 * surfaces (ReconHistory / ExpenseHistory / DailyRevenue).
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
        <LoadingSpinner label={false} size={20} color="#fff" />
      ) : children ? (
        children
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}