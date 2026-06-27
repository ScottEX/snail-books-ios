import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';

interface Props {
  onBack: () => void;
  title: string;
  filterActive?: boolean;
  onToggleFilter?: () => void;
  rightAction?: React.ReactNode;
}

export default function HistoryHeader({ onBack, title, filterActive, onToggleFilter, rightAction }: Props) {
  const { colors } = useTheme();
  const st = getSt(colors);

  return (
    <View style={st.header}>
      <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
        <View style={st.backBtn}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textMain} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </View>
      </TouchableOpacity>
      <Text style={st.title}>{title}</Text>
      {rightAction ? (
        rightAction
      ) : onToggleFilter ? (
        <TouchableOpacity
          style={[st.filterBtn, filterActive && st.filterBtnActive]}
          onPress={onToggleFilter}
          activeOpacity={0.7}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={filterActive ? colors.surface : colors.textMain} strokeWidth={2} strokeLinecap="round">
            <Path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" />
          </Svg>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 34 }} />
      )}
    </View>
  );
}

const getSt = (colors: ThemeColors) => StyleSheet.create({
  header: {
    position: 'absolute' as any, top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingTop: 56, paddingBottom: 10,
    backgroundColor: withAlpha(colors.bg, 0.85),
  },
  backBtn: { padding: 4 },
  title: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain, flex: 1, textAlign: 'center' },
  filterBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: colors.primary },
});
