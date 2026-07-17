import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  StatusBar, TouchableOpacity, Modal,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, runOnJS,
  clamp, interpolate, Extrapolation,
  Easing,
} from 'react-native-reanimated';
import {
  GestureDetector, Gesture,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W, height: H } = Dimensions.get('window');

const MAX_SCALE = 4;
const OVERSCALE_DAMPING = 0.3;
const SWIPE_VELOCITY = 400;
const SWIPE_THRESHOLD = W * 0.3;

const SPRING_CFG = { damping: 32, stiffness: 280, mass: 0.8 };

interface Props {
  images: string[];
  initialIdx?: number;
  visible: boolean;
  onClose: () => void;
}

export default function ImagePreview({ images, initialIdx = 0, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const currentIdx = useSharedValue(initialIdx);
  const [renderIdx, setRenderIdx] = useState(initialIdx);
  const listOffsetX = useSharedValue(-initialIdx * W);
  const [internalVisible, setInternalVisible] = useState(false);

  // Sync external visible → show Modal; close is a one-way animation
  useEffect(() => {
    if (visible) setInternalVisible(true);
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setInternalVisible(false); // triggers native dismiss animation
  }, []);

  const handleDismissComplete = useCallback(() => {
    // Called by onDismiss after native animation finishes and GestureHandler is torn down
    onClose();
  }, [onClose]);

  const syncRenderIdx = useCallback((idx: number) => { setRenderIdx(idx); }, []);

  // Reset on open
  useEffect(() => {
    if (visible) {
      currentIdx.value = initialIdx;
      listOffsetX.value = -initialIdx * W;
      setRenderIdx(initialIdx);
    }
  }, [visible, initialIdx]);

  return (
    <Modal
      visible={internalVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onDismiss={handleDismissComplete}
      onRequestClose={handleDismiss}
    >
      <StatusBar hidden />
      <GestureHandlerRootView style={styles.root}>
        {/* Image list */}
        <Animated.View style={styles.list}>
          {images.map((uri, index) => (
            <ImageItem
              key={uri + index}
              uri={uri}
              index={index}
              currentIdx={currentIdx}
              listOffsetX={listOffsetX}
              total={images.length}
              onClose={handleDismiss}
              onIndexChange={syncRenderIdx}
            />
          ))}
        </Animated.View>

        {/* Header: close + counter */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} activeOpacity={0.7}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.counter}>
            {renderIdx + 1} / {images.length}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Dots */}
        {images.length > 1 && (
          <View style={[styles.dots, { paddingBottom: insets.bottom + 12 }]}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === renderIdx && styles.dotActive]} />
            ))}
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

// ─── Single Image Item with full gesture logic ──────────────────────────────────

interface ItemProps {
  uri: string;
  index: number;
  currentIdx: Animated.SharedValue<number>;
  listOffsetX: Animated.SharedValue<number>;
  total: number;
  onClose: () => void;
  onIndexChange: (idx: number) => void;
}

function ImageItem({ uri, index, currentIdx, listOffsetX, total, onClose, onIndexChange }: ItemProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const bgOpacity = useSharedValue(1);
  const dragY = useSharedValue(0);         // 下拉位移
  const dragScale = useSharedValue(1);     // 拖动时图片缩小
  const isClosing = useSharedValue(false); // 防止关闭动画中途打断

  const getMaxTranslate = (s: number) => {
    'worklet';
    const scaledW = W * s;
    const scaledH = H * s;
    return { x: Math.max(0, (scaledW - W) / 2), y: Math.max(0, (scaledH - H) / 2) };
  };

  const clampTranslate = (tx: number, ty: number, s: number) => {
    'worklet';
    const { x: maxX, y: maxY } = getMaxTranslate(s);
    return { x: clamp(tx, -maxX, maxX), y: clamp(ty, -maxY, maxY) };
  };

  const resetZoom = () => {
    'worklet';
    scale.value = withSpring(1, SPRING_CFG);
    translateX.value = withSpring(0, SPRING_CFG);
    translateY.value = withSpring(0, SPRING_CFG);
    savedScale.value = 1;
    savedTx.value = 0;
    savedTy.value = 0;
  };

  const goToIndex = (idx: number) => {
    'worklet';
    const clamped = clamp(idx, 0, total - 1);
    currentIdx.value = clamped;
    listOffsetX.value = withSpring(-clamped * W, SPRING_CFG);
    runOnJS(onIndexChange)(clamped);
  };

  // ── Entrance animation (index === 0 only, shared bg view) ──
  useEffect(() => {
    if (index === 0) {
      dragY.value = 60;
      dragScale.value = 0.88;
      bgOpacity.value = 0;
      dragY.value = withSpring(0, { damping: 26, stiffness: 240 });
      dragScale.value = withSpring(1, { damping: 26, stiffness: 240 });
      bgOpacity.value = withTiming(1, { duration: 220 });
    }
  }, []);

  // ── Double tap (scale 1 ↔ 2.5) ──
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd((e) => {
      'worklet';
      if (scale.value > 1) {
        resetZoom();
      } else {
        const targetScale = 2.5;
        const focal = { x: e.x - W / 2, y: e.y - H / 2 };
        scale.value = withSpring(targetScale, SPRING_CFG);
        const { x: maxX, y: maxY } = getMaxTranslate(targetScale);
        const newTx = clamp(-focal.x * (targetScale - 1), -maxX, maxX);
        const newTy = clamp(-focal.y * (targetScale - 1), -maxY, maxY);
        translateX.value = withSpring(newTx, SPRING_CFG);
        translateY.value = withSpring(newTy, SPRING_CFG);
        savedScale.value = targetScale;
        savedTx.value = newTx;
        savedTy.value = newTy;
      }
    });

  // ── Pinch zoom ──
  const pinch = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      'worklet';
      const next = savedScale.value * e.scale;
      if (next < 1) {
        scale.value = 1 + (next - 1) * OVERSCALE_DAMPING;
      } else {
        scale.value = Math.min(next, MAX_SCALE);
      }
    })
    .onEnd(() => {
      'worklet';
      if (scale.value < 1) {
        resetZoom();
      } else {
        const clamped = clampTranslate(translateX.value, translateY.value, scale.value);
        translateX.value = withSpring(clamped.x, SPRING_CFG);
        translateY.value = withSpring(clamped.y, SPRING_CFG);
        savedScale.value = scale.value;
        savedTx.value = clamped.x;
        savedTy.value = clamped.y;
      }
    });

  // ── Pan (translate + edge swipe + pull-down dismiss) ──
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      'worklet';
      savedTx.value = translateX.value;
      savedTy.value = translateY.value;
    })
    .onUpdate((e) => {
      'worklet';
      const s = scale.value;
      const { x: maxX, y: maxY } = getMaxTranslate(s);

      if (s <= 1) {
        const tx = e.translationX;
        const ty = e.translationY;

        // 只有明显向下拖（Y > X * 1.2）时才进入下拉关闭模式
        const isDraggingDown = !isClosing.value && ty > 0 && ty > Math.abs(tx) * 1.2;

        if (isDraggingDown) {
          // 图片跟手位移
          dragY.value = ty;

          // 图片随下拉缩小：最多缩到 0.75
          dragScale.value = interpolate(
            ty,
            [0, 300],
            [1, 0.75],
            Extrapolation.CLAMP,
          );

          // 背景随下拉渐隐
          bgOpacity.value = interpolate(
            ty,
            [0, 250],
            [1, 0],
            Extrapolation.CLAMP,
          );

          // 下拉时不切换图片
        } else {
          // 正常水平切换
          const baseOffset = -currentIdx.value * W;
          let nextOffset = baseOffset + e.translationX;
          const isFirst = currentIdx.value === 0 && e.translationX > 0;
          const isLast = currentIdx.value === total - 1 && e.translationX < 0;
          if (isFirst || isLast) {
            nextOffset = baseOffset + e.translationX * 0.25;
          }
          listOffsetX.value = nextOffset;

          dragY.value = 0;
          dragScale.value = 1;
          bgOpacity.value = 1;
        }
      } else {
        // scale>1: pan within zoomed image
        const rawTx = savedTx.value + e.translationX;
        const rawTy = savedTy.value + e.translationY;

        // Damping beyond boundaries
        if (rawTx > maxX) {
          translateX.value = maxX + (rawTx - maxX) * OVERSCALE_DAMPING;
        } else if (rawTx < -maxX) {
          translateX.value = -maxX + (rawTx + maxX) * OVERSCALE_DAMPING;
        } else {
          translateX.value = rawTx;
        }
        translateY.value = clamp(rawTy, -maxY, maxY);
      }
    })
    .onEnd((e) => {
      'worklet';
      const s = scale.value;

      if (s <= 1) {
        const vx = e.velocityX;
        const vy = e.velocityY;
        const tx = e.translationX;
        const ty = e.translationY;

        const isDraggingDown = ty > 0 && ty > Math.abs(tx) * 1.2;

        if (isDraggingDown) {
          // 判断是否触发关闭: 速度 > 800 或 距离 > 屏幕 1/4
          const shouldClose = vy > 800 || ty > H * 0.25;

          if (shouldClose) {
            isClosing.value = true;

            // 根据速度计算飞出时长
            const duration = Math.max(180, Math.min(320, 1000 / (vy / 100)));

            dragY.value = withTiming(H, {
              duration,
              easing: Easing.bezier(0.25, 0.1, 0.4, 1),
            });

            dragScale.value = withTiming(0.6, { duration });

            bgOpacity.value = withTiming(0, { duration: duration * 0.8 });

            runOnJS(onClose)();
          } else {
            // 回弹: 带速度的 spring
            dragY.value = withSpring(0, {
              velocity: vy,
              damping: 28,
              stiffness: 260,
              mass: 0.8,
            });

            dragScale.value = withSpring(1, {
              damping: 28,
              stiffness: 260,
            });

            bgOpacity.value = withTiming(1, { duration: 200 });
          }

          return;
        }

        // 左右切换：速度或位移达到阈值
        const shouldNext = vx < -SWIPE_VELOCITY || tx < -SWIPE_THRESHOLD;
        const shouldPrev = vx > SWIPE_VELOCITY || tx > SWIPE_THRESHOLD;

        if (shouldNext && currentIdx.value < total - 1) {
          goToIndex(currentIdx.value + 1);
        } else if (shouldPrev && currentIdx.value > 0) {
          goToIndex(currentIdx.value - 1);
        } else {
          listOffsetX.value = withSpring(-currentIdx.value * W, SPRING_CFG);
        }
        bgOpacity.value = withTiming(1, { duration: 200 });
        dragY.value = withSpring(0, { damping: 28, stiffness: 260 });
        dragScale.value = withSpring(1, { damping: 28, stiffness: 260 });
      } else {
        // scale>1: snap back + edge swipe to next page
        const { x: maxX } = getMaxTranslate(s);
        const clamped = clampTranslate(translateX.value, translateY.value, s);

        const atRightEdge = translateX.value <= -maxX + 2;
        const atLeftEdge = translateX.value >= maxX - 2;

        if (atRightEdge && e.velocityX < -SWIPE_VELOCITY && currentIdx.value < total - 1) {
          resetZoom();
          goToIndex(currentIdx.value + 1);
        } else if (atLeftEdge && e.velocityX > SWIPE_VELOCITY && currentIdx.value > 0) {
          resetZoom();
          goToIndex(currentIdx.value - 1);
        } else {
          translateX.value = withSpring(clamped.x, SPRING_CFG);
          translateY.value = withSpring(clamped.y, SPRING_CFG);
          savedTx.value = clamped.x;
          savedTy.value = clamped.y;
        }
      }
    });

  // ── Gesture composition ──
  // Race: first to activate wins. pan activates ~10px → responsive swipe/zoom.
  // doubleTap activates on 2nd tap (no movement) → zoom toggle.
  const composed = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pan, pinch),
  );

  // ── Animated styles ──
  const listStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: listOffsetX.value }],
  }));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + dragY.value },
      { scale: scale.value * dragScale.value },
    ],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0,0,0,${bgOpacity.value})`,
  }));

  const isVisible = useAnimatedStyle(() => ({
    display: Math.abs(index - currentIdx.value) <= 1 ? 'flex' : 'none',
  }));

  return (
    <>
      {/* Background layer (follows pull-down opacity) */}
      {index === 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, bgStyle]} pointerEvents="none" />
      )}

      {/* Image container (horizontal layout) */}
      <Animated.View style={[styles.itemWrap, { left: index * W }, listStyle, isVisible]}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.imageWrap, imageStyle]}>
            <Image
              source={uri}
              style={styles.image}
              contentFit="contain"
              cachePolicy="disk"
            />
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  list: { flex: 1, flexDirection: 'row', position: 'relative' },
  itemWrap: {
    position: 'absolute',
    width: W, height: H,
    alignItems: 'center', justifyContent: 'center',
  },
  imageWrap: {
    width: W, height: H,
    alignItems: 'center', justifyContent: 'center',
  },
  image: { width: W, height: H },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, zIndex: 10,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { color: '#fff', fontSize: 14, fontWeight: '500' },
  counter: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },
  dots: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: { backgroundColor: '#fff', width: 16, borderRadius: 3 },
});
