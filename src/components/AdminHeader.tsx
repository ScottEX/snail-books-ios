import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';

// ── SVG icon shared between UserManagementScreen and UserDetailScreen ──
function BackArrowSvg() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

interface AdminHeaderProps {
  safeTop: number;
  onBack: () => void;
  title: string;
}

export default function AdminHeader({ safeTop, onBack, title }: AdminHeaderProps) {
  const headerHeight = safeTop + 42;

  return (
    <>
      <BlurView
        intensity={70}
        tint="regular"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
        }}
      />
      <StatusBar barStyle="light-content" />
      <View
        style={{
          position: 'absolute',
          top: safeTop - 5,
          left: 0,
          right: 0,
          zIndex: 90,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingTop: 0,
          paddingBottom: 6,
          paddingHorizontal: 16,
          backgroundColor: 'transparent',
          pointerEvents: 'box-none' as const,
        }}
      >
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <View style={styles.backBtn}>
            <BackArrowSvg />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
