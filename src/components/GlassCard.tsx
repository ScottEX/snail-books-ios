// components/GlassCard.tsx
// iOS 26 Glass-style card — multi-layer gradient simulation
// Adapted for snail-books (light-mode, Expo, expo-linear-gradient)
import React, { useRef } from 'react';
import {
  View, StyleSheet, Animated, Platform,
  TouchableWithoutFeedback, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  tint?: 'none' | 'warm' | 'cool' | 'red';
  thickness?: 'thin' | 'regular' | 'thick';
}

export default function GlassCard({
  children,
  style,
  onPress,
  tint = 'none',
  thickness = 'regular',
}: GlassCardProps) {
  const pressAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 200, friction: 20,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200, friction: 20,
    }).start();
  };

  const isDark = false; // App is locked to light mode (userInterfaceStyle: "light")
  const cfg = getGlassConfig(isDark, tint, thickness);

  const content = (
    <Animated.View
      style={[
        styles.outer,
        style,
        { transform: [{ scale: pressAnim }] },
      ]}
    >
      {/* Layer 1: semi-transparent base background */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.base,
          { backgroundColor: cfg.baseBg },
        ]}
      />

      {/* Layer 2: ambient gradient (light absorption) */}
      <LinearGradient
        style={[StyleSheet.absoluteFill, styles.base]}
        colors={cfg.ambientGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />

      {/* Layer 3: top edge highlight (depth illusion) */}
      <LinearGradient
        style={[styles.topHighlight]}
        colors={cfg.topHighlight}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Layer 4: left edge highlight */}
      <LinearGradient
        style={[styles.leftHighlight]}
        colors={cfg.sideHighlight}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      {/* Layer 5: bottom dark edge (shadow at glass bottom) */}
      <LinearGradient
        style={[styles.bottomEdge]}
        colors={cfg.bottomEdge}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Layer 6: diagonal surface sheen (iOS 26 signature) */}
      <LinearGradient
        style={[StyleSheet.absoluteFill, styles.base]}
        colors={cfg.surfaceSheen}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Layer 7: border (glass edge reflection) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.border,
          { borderColor: cfg.borderColor },
        ]}
        pointerEvents="none"
      />

      {/* Content on top of all effect layers */}
      <View style={styles.content}>
        {children}
      </View>
    </Animated.View>
  );

  if (!onPress) return content;

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      {content}
    </TouchableWithoutFeedback>
  );
}

// ─── Color configuration ────────────────────────────────────────────────────

function getGlassConfig(
  isDark: boolean,
  tint: string,
  thickness: string,
): {
  baseBg: string;
  ambientGradient: readonly [string, string, string];
  topHighlight: readonly [string, string, string];
  sideHighlight: readonly [string, string, string];
  bottomEdge: readonly [string, string, string];
  surfaceSheen: readonly [string, string, string, string];
  borderColor: string;
} {
  const baseAlpha = thickness === 'thin' ? 0.45
    : thickness === 'thick' ? 0.72
    : 0.58;

  const tintMap: Record<string, string> = {
    none: isDark ? 'rgba(255,255,255,' : 'rgba(255,255,255,',
    warm: isDark ? 'rgba(255,240,210,' : 'rgba(255,248,235,',
    cool: isDark ? 'rgba(210,230,255,' : 'rgba(235,245,255,',
    red:  isDark ? 'rgba(255,220,220,' : 'rgba(255,240,240,',
  };

  if (isDark) {
    return {
      baseBg: `rgba(30,32,38,${baseAlpha})`,
      ambientGradient: [
        'rgba(80,85,100,0.18)',
        'rgba(20,22,28,0.08)',
        'rgba(40,42,52,0.12)',
      ],
      topHighlight: [
        'rgba(255,255,255,0.28)',
        'rgba(255,255,255,0.06)',
        'rgba(255,255,255,0.00)',
      ],
      sideHighlight: [
        'rgba(255,255,255,0.12)',
        'rgba(255,255,255,0.02)',
        'rgba(255,255,255,0.00)',
      ],
      bottomEdge: [
        'rgba(0,0,0,0.00)',
        'rgba(0,0,0,0.06)',
        'rgba(0,0,0,0.14)',
      ],
      surfaceSheen: [
        'rgba(255,255,255,0.06)',
        'rgba(255,255,255,0.00)',
        'rgba(255,255,255,0.00)',
        'rgba(255,255,255,0.03)',
      ],
      borderColor: 'rgba(255,255,255,0.18)',
    };
  }

  // Light mode (snail-books default)
  return {
    baseBg: `rgba(255,255,255,${baseAlpha})`,
    ambientGradient: [
      'rgba(255,255,255,0.35)',
      'rgba(230,235,245,0.08)',
      'rgba(240,242,248,0.15)',
    ],
    topHighlight: [
      'rgba(255,255,255,0.90)',
      'rgba(255,255,255,0.30)',
      'rgba(255,255,255,0.00)',
    ],
    sideHighlight: [
      'rgba(255,255,255,0.60)',
      'rgba(255,255,255,0.10)',
      'rgba(255,255,255,0.00)',
    ],
    bottomEdge: [
      'rgba(180,185,200,0.00)',
      'rgba(180,185,200,0.08)',
      'rgba(160,165,180,0.18)',
    ],
    surfaceSheen: [
      'rgba(255,255,255,0.50)',
      'rgba(255,255,255,0.10)',
      'rgba(255,255,255,0.00)',
      'rgba(255,255,255,0.08)',
    ],
    borderColor: 'rgba(255,255,255,0.75)',
  };
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outer: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  base: {
    borderRadius: 14,
  },
  topHighlight: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 56,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  leftHighlight: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: 40,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  bottomEdge: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 32,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  border: {
    borderRadius: 14,
    borderWidth: 1,
  },
  content: {
    position: 'relative',
    zIndex: 10,
  },
});
