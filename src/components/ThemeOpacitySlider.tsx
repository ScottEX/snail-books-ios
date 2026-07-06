import React, { useRef, useCallback } from 'react';
import { View, PanResponder } from 'react-native';
import { ThemeColors } from '../theme';

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface Props {
  value: number;        // 0..1
  onChange: (v: number) => void;
  colors: ThemeColors;
}

export default function ThemeOpacitySlider({ value, onChange, colors }: Props) {
  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        updateFromEvent(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        updateFromEvent(evt.nativeEvent.locationX);
      },
    })
  ).current;

  const updateFromEvent = useCallback(
    (x: number) => {
      if (trackWidthRef.current <= 0) return;
      const pct = Math.max(0, Math.min(1, x / trackWidthRef.current));
      onChange(Math.round(pct * 20) / 20); // step 0.05
    },
    [onChange],
  );

  const pct = Math.max(0, Math.min(1, value));
  const trackColor = withAlpha(colors.primary, 0.18);

  return (
    <View style={{ marginBottom: 8 }}>
      <View
        ref={trackRef}
        onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: trackColor,
          justifyContent: 'center',
          position: 'relative',
        }}
        pointerEvents="box-only"
        {...panResponder.panHandlers}
      >
        {/* fill bar */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct * 100}%`,
            backgroundColor: colors.primary,
            borderRadius: 7,
          }}
        />
        {/* thumb */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${pct * 100}%`,
            marginLeft: -10,
            width: 20,
            height: 14,
            borderRadius: 7,
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2,
            elevation: 2,
          }}
        />
      </View>
    </View>
  );
}
