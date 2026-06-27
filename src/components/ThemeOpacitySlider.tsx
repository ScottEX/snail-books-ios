import React, { useRef } from 'react';
import { View, PanResponder } from 'react-native';
import { ThemeColors, withAlpha } from '../theme';

interface Props {
  value: number;        // 0..1
  onChange: (v: number) => void;
  colors: ThemeColors;
}

/** Web-style opacity slider: track bar + fill bar + draggable/tappable area.
 *  Matches web's <input type="range"> visual: 4px bars, tap to jump, drag to scrub. */
export default function ThemeOpacitySlider({ value, onChange, colors }: Props) {
  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const pct = Math.round(value * 100);

  const updateFromX = (pageX: number) => {
    if (!trackRef.current) return;
    trackRef.current.measureInWindow((x, _y, width) => {
      if (width <= 0) return;
      const clamped = Math.max(0, Math.min(1, (pageX - x) / width));
      const stepped = Math.round(clamped * 20) / 20; // 0.05 step
      onChange(stepped);
    });
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: any) => {
        updateFromX(e.nativeEvent.pageX);
      },
      onPanResponderMove: (e: any) => {
        updateFromX(e.nativeEvent.pageX);
      },
    })
  ).current;

  return (
    <View
      ref={trackRef}
      onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
      style={{ position: 'relative', height: 32, justifyContent: 'center' }}
      {...pan.panHandlers}
    >
      {/* Track */}
      <View style={{
        position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2,
        backgroundColor: colors.secondary,
      }} />
      {/* Fill */}
      <View style={{
        position: 'absolute', left: 0, height: 4, borderRadius: 2,
        width: `${pct}%`,
        backgroundColor: colors.primary,
      }} />
    </View>
  );
}
