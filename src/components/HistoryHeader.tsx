import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { t } from '../i18n';
import { FONTS, useTheme, type ThemeColors } from '../theme';

interface Props {
  safeTop?: number;
  inline?: boolean;
  appearance?: 'blur' | 'primary';
  onBack: () => void;
  title: string;
  filterActive?: boolean;
  onToggleFilter?: () => void;
  rightAction?: React.ReactNode;
}

export default function HistoryHeader({
  safeTop = 56, inline = false, appearance = 'blur', onBack, title, filterActive, onToggleFilter, rightAction,
}: Props) {
  const { colors } = useTheme();
  const primary = appearance === 'primary';
  const foreground = primary ? colors.onPrimary : colors.textMain;
  const st = getSt(colors);

  return (
    <View style={[st.header, inline && st.inlineHeader, { paddingTop: safeTop }, primary && st.primaryHeader]}>
      {!primary && <BlurView intensity={70} tint="regular" style={StyleSheet.absoluteFill} />}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('back')} onPress={onBack} activeOpacity={0.7}>
        <View style={st.backBtn}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={foreground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </View>
      </TouchableOpacity>
      <Text accessibilityRole="header" style={[st.title, { color: foreground }]}>{title}</Text>
      {rightAction ? (
        rightAction
      ) : onToggleFilter ? (
        <TouchableOpacity
          style={[st.filterBtn, filterActive && st.filterBtnActive]}
          onPress={onToggleFilter}
          activeOpacity={0.7}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={filterActive && !primary ? colors.surface : foreground} strokeWidth={2} strokeLinecap="round">
            <Path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" />
          </Svg>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 34, height: 34 }} />
      )}
    </View>
  );
}

const getSt = (colors: ThemeColors) => StyleSheet.create({
  header: {
    position: 'absolute' as any, top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingBottom: 10,
    overflow: 'hidden',
  },
  inlineHeader: { position: 'relative' },
  primaryHeader: { backgroundColor: colors.primary },
  backBtn: { padding: 4 },
  title: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, flex: 1, textAlign: 'left' },
  filterBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: colors.primary },
});
