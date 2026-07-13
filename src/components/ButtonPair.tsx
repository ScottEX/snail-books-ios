import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import LoadingSpinner from './LoadingSpinner';

interface ButtonPairProps {
  leftLabel: string;
  leftOnPress?: () => void;
  leftDisabled?: boolean;
  rightLabel: string;
  rightOnPress?: () => void;
  rightDisabled?: boolean;
  rightLoading?: boolean;
}

export default function ButtonPair({
  leftLabel,
  leftOnPress,
  leftDisabled = false,
  rightLabel,
  rightOnPress,
  rightDisabled = false,
  rightLoading = false,
}: ButtonPairProps) {
  const { colors: c } = useTheme();
  const st = getStyles(c);

  return (
    <View style={st.row}>
      <TouchableOpacity
        style={[st.left, leftDisabled && { opacity: 0.4 }]}
        onPress={leftOnPress}
        disabled={leftDisabled}
        activeOpacity={0.8}
      >
        <Text style={st.leftText}>{leftLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[st.right, (rightDisabled || rightLoading) && { opacity: 0.4 }]}
        onPress={rightOnPress}
        disabled={rightDisabled || rightLoading}
        activeOpacity={0.8}
      >
        {rightLoading ? (
          <LoadingSpinner label={false} size={20} color="#fff" />
        ) : (
          <Text style={st.rightText}>{rightLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    left: {
      flex: 1,
      backgroundColor: withAlpha(c.textMain, 0.06),
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.secondary,
    },
    leftText: {
      fontSize: FONTS.subBold.size,
      fontWeight: FONTS.subBold.weight,
      color: c.textSub,
    },
    right: {
      flex: 1,
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    rightText: {
      fontSize: FONTS.subBold.size,
      fontWeight: FONTS.subBold.weight,
      color: c.surface,
    },
  });
