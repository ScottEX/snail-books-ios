import { View, Text, StyleSheet } from 'react-native';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}

export default function EmptyState({ icon, title, hint }: EmptyStateProps) {
  const { colors: c } = useTheme();
  const st = getStyles(c);

  return (
    <View style={st.wrap}>
      <View style={st.icon}>{icon}</View>
      <Text style={st.title}>{title}</Text>
      {hint ? <Text style={st.hint}>{hint}</Text> : null}
    </View>
  );
}

const getStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      marginTop: 80,
      alignItems: 'center',
      gap: 12,
    },
    icon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: withAlpha(c.textSub, 0.06),
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: FONTS.body.size,
      fontWeight: '500',
      color: c.textSub,
    },
    hint: {
      fontSize: FONTS.sub.size,
      color: c.textSub,
      textAlign: 'center',
      paddingHorizontal: 40,
      lineHeight: 20,
    },
  });
