import { useCallback, useMemo } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { clamp, runOnJS, useAnimatedStyle, useDerivedValue, useSharedValue } from 'react-native-reanimated';

interface Options {
  anchor: 'left' | 'right';
  left: number;
  right: number;
  top: number;
  bottom: number;
  onPress: () => void;
  disabled?: boolean;
}

export function useDraggableButton({ anchor, left, right, top, bottom, onPress, disabled }: Options) {
  const container = useSharedValue({ width: 0, height: 0 });
  const button = useSharedValue({ width: 0, height: 0 });
  const position = useSharedValue({ x: 0, y: 0 });
  const start = useSharedValue({ x: 0, y: 0 });

  const bounds = useDerivedValue(() => {
    const horizontal = Math.max(0, container.value.width - button.value.width - left - right);
    return {
      minX: anchor === 'right' ? -horizontal : 0,
      maxX: anchor === 'left' ? horizontal : 0,
      minY: Math.min(0, button.value.height + top + bottom - container.value.height),
    };
  });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: clamp(position.value.x, bounds.value.minX, bounds.value.maxX) },
      { translateY: clamp(position.value.y, bounds.value.minY, 0) },
    ],
  }));
  const gesture = useMemo(() => Gesture.Race(
    Gesture.Pan().enabled(!disabled).minDistance(8).maxPointers(1)
      .onStart(() => {
        start.value = {
          x: clamp(position.value.x, bounds.value.minX, bounds.value.maxX),
          y: clamp(position.value.y, bounds.value.minY, 0),
        };
      })
      .onUpdate(({ translationX, translationY }) => {
        position.value = {
          x: clamp(start.value.x + translationX, bounds.value.minX, bounds.value.maxX),
          y: clamp(start.value.y + translationY, bounds.value.minY, 0),
        };
      }),
    Gesture.Tap().enabled(!disabled).maxDistance(8).onEnd((_, success) => {
      if (success) runOnJS(onPress)();
    }),
  ), [bounds, disabled, onPress, position, start]);

  const onContainerLayout = useCallback(({ nativeEvent: { layout: { width, height } } }: LayoutChangeEvent) => {
    container.value = { width, height };
  }, [container]);
  const onButtonLayout = useCallback(({ nativeEvent: { layout: { width, height } } }: LayoutChangeEvent) => {
    button.value = { width, height };
  }, [button]);

  return { animatedStyle, gesture, onButtonLayout, onContainerLayout };
}
