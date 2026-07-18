import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  StatusBar, TouchableOpacity, Modal,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withDelay,
  runOnJS, clamp, interpolate, Extrapolation,
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
// 进出场容器 spring（文档参数）
const ENTER_CFG = { damping: 30, stiffness: 260, mass: 0.9 };
const EXIT_CFG = { damping: 32, stiffness: 280, mass: 0.85 };

/** 缩略图在屏幕上的位置/尺寸 */
export interface ThumbLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 测量某个 View 的屏幕坐标，用于共享元素进出场 */
export function measureThumbLayout(ref: any, cb: (layout: ThumbLayout) => void) {
  if (!ref || typeof ref.measureInWindow !== 'function') return;
  ref.measureInWindow((x: number, y: number, width: number, height: number) => {
    if (width > 0 && height > 0) cb({ x, y, width, height });
  });
}

interface Props {
  images: string[];
  initialIdx?: number;
  visible: boolean;
  onClose: () => void;
  /** 被点击缩略图的屏幕坐标；有则走「原位展开/缩回」动画 */
  thumbLayout?: ThumbLayout | null;
}

export default function ImagePreview({ images, initialIdx = 0, visible, onClose, thumbLayout }: Props) {
  const [internalVisible, setInternalVisible] = useState(false);
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    if (visible) {
      setOpenCount(c => c + 1);
      setInternalVisible(true);
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setInternalVisible(false);
  }, []);

  const handleDismissComplete = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={internalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onDismiss={handleDismissComplete}
      onRequestClose={handleDismiss}
    >
      <GestureHandlerRootView style={styles.root}>
        <ContentView
          key={openCount}
          images={images}
          initialIdx={initialIdx}
          thumbLayout={thumbLayout ?? null}
          onClose={handleDismiss}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}

// ─── Content (keyed for fresh shared values on each open) ──────────────────────

function ContentView({ images, initialIdx, thumbLayout, onClose }: {
  images: string[];
  initialIdx: number;
  thumbLayout: ThumbLayout | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const currentIdx = useSharedValue(initialIdx);
  const listOffsetX = useSharedValue(-initialIdx * W);
  const [renderIdx, setRenderIdx] = useState(initialIdx);

  const hasThumb = !!thumbLayout && thumbLayout.width > 0 && thumbLayout.height > 0;

  // ── 容器矩形（从缩略图位置展开到全屏 / 缩回） ──
  const animX = useSharedValue(hasThumb ? thumbLayout!.x : 0);
  const animY = useSharedValue(hasThumb ? thumbLayout!.y : 0);
  const animW = useSharedValue(hasThumb ? thumbLayout!.width : W);
  const animH = useSharedValue(hasThumb ? thumbLayout!.height : H);
  const animRadius = useSharedValue(hasThumb ? 8 : 0);

  const bgOpacity = useSharedValue(0);
  const uiOpacity = useSharedValue(0);
  const closeAnim = useSharedValue(0); // 无缩略图时的兜底关闭
  const closing = useSharedValue(false);

  const syncRenderIdx = useCallback((idx: number) => { setRenderIdx(idx); }, []);

  // ── 进场 ──
  useEffect(() => {
    if (hasThumb) {
      animX.value = withSpring(0, ENTER_CFG);
      animY.value = withSpring(0, ENTER_CFG);
      animW.value = withSpring(W, ENTER_CFG);
      animH.value = withSpring(H, ENTER_CFG);
      animRadius.value = withTiming(0, { duration: 220 });
      bgOpacity.value = withTiming(1, { duration: 200 });
      uiOpacity.value = withDelay(120, withTiming(1, { duration: 180 }));
    } else {
      bgOpacity.value = withDelay(50, withTiming(1, { duration: 220 }));
      uiOpacity.value = withDelay(50, withTiming(1, { duration: 220 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 关闭：缩回最初点击的缩略图 ──
  const closeToThumb = useCallback((velocity = 0) => {
    if (closing.value || !hasThumb) return;
    closing.value = true;
    const t = thumbLayout!;
    uiOpacity.value = withTiming(0, { duration: 80 });
    bgOpacity.value = withTiming(0, { duration: 260 });
    const cfg = { ...EXIT_CFG, velocity };
    animX.value = withSpring(t.x, cfg);
    animY.value = withSpring(t.y, cfg);
    animW.value = withSpring(t.width, cfg);
    animH.value = withSpring(t.height, cfg);
    animRadius.value = withTiming(8, { duration: 240 });
    setTimeout(onClose, 320);
  }, [onClose, thumbLayout, hasThumb]);

  // ── 兜底关闭（无缩略图坐标）：淡出 + 下移 ──
  const handleCloseFallback = useCallback(() => {
    if (closing.value) return;
    closing.value = true;
    uiOpacity.value = withTiming(0, { duration: 120 });
    bgOpacity.value = withTiming(0, { duration: 240 });
    closeAnim.value = withTiming(1, { duration: 250 });
    setTimeout(onClose, 260);
  }, [onClose]);

  const handleClose = useCallback(() => {
    if (hasThumb) closeToThumb(0);
    else handleCloseFallback();
  }, [hasThumb, closeToThumb, handleCloseFallback]);

  // 下拉关闭（手势在 UI 线程，回 JS 触发）
  const handlePullClose = useCallback((vy: number) => {
    closeToThumb(vy);
  }, [closeToThumb]);

  // ── 动画样式 ──
  const containerStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: animX.value,
    top: animY.value,
    width: animW.value,
    height: animH.value,
    borderRadius: animRadius.value,
    overflow: 'hidden',
  }));

  // 列表随容器居中：容器小于全屏时，当前图保持居中可见
  const listStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: listOffsetX.value + (animW.value - W) / 2 },
      { translateY: (animH.value - H) / 2 },
    ],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0,0,0,${bgOpacity.value * 0.95})`,
  }));

  const uiStyle = useAnimatedStyle(() => ({
    opacity: uiOpacity.value,
  }));

  const fallbackCloseStyle = useAnimatedStyle(() => ({
    opacity: 1 - closeAnim.value,
    transform: [{ translateY: closeAnim.value * 30 }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, fallbackCloseStyle]}>
      <StatusBar hidden />
      {/* 黑色背景 */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]} pointerEvents="none" />

      {/* 图片容器：位置/尺寸动画化 */}
      <Animated.View style={containerStyle}>
        <Animated.View style={[styles.list, listStyle]}>
          {images.map((uri, index) => (
            <ImageItem
              key={`${uri}-${index}`}
              uri={uri}
              index={index}
              currentIdx={currentIdx}
              listOffsetX={listOffsetX}
              total={images.length}
              bgOpacity={bgOpacity}
              hasThumb={hasThumb}
              animateEntrance={!hasThumb}
              onClose={onClose}
              onPullClose={handlePullClose}
              onIndexChange={syncRenderIdx}
            />
          ))}
        </Animated.View>
      </Animated.View>

      {/* Header: close + counter */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + 8 }, uiStyle]}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>
          {renderIdx + 1} / {images.length}
        </Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Dots */}
      {images.length > 1 && (
        <Animated.View style={[styles.dots, { paddingBottom: insets.bottom + 12 }, uiStyle]} pointerEvents="none">
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === renderIdx && styles.dotActive]} />
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── Single Image Item with full gesture logic ──────────────────────────────────

interface ItemProps {
  uri: string;
  index: number;
  currentIdx: Animated.SharedValue<number>;
  listOffsetX: Animated.SharedValue<number>;
  total: number;
  bgOpacity: Animated.SharedValue<number>;
  hasThumb: boolean;
  animateEntrance: boolean;
  onClose: () => void;
  onPullClose: (vy: number) => void;
  onIndexChange: (idx: number) => void;
}

function ImageItem({ uri, index, currentIdx, listOffsetX, total, bgOpacity, hasThumb, animateEntrance, onClose, onPullClose, onIndexChange }: ItemProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const isClosing = useSharedValue(false);

  // ── 兜底入场（无缩略图坐标时）：从下方弹入 ──
  useEffect(() => {
    if (!animateEntrance) return;
    dragY.value = 60;
    dragScale.value = 0.88;
    dragY.value = withDelay(50, withSpring(0, { damping: 26, stiffness: 240 }));
    dragScale.value = withDelay(50, withSpring(1, { damping: 26, stiffness: 240 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        const isDraggingDown = !isClosing.value && ty > 0 && ty > Math.abs(tx) * 1.2;

        if (isDraggingDown) {
          dragY.value = ty;
          dragScale.value = interpolate(ty, [0, 300], [1, 0.75], Extrapolation.CLAMP);
          bgOpacity.value = interpolate(ty, [0, 250], [1, 0], Extrapolation.CLAMP);
        } else {
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
        const rawTx = savedTx.value + e.translationX;
        const rawTy = savedTy.value + e.translationY;

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
          const shouldClose = vy > 800 || ty > H * 0.25;

          if (shouldClose) {
            isClosing.value = true;
            if (hasThumb) {
              // 缩回最初点击的缩略图：图片先回中，容器带速度弹回
              dragY.value = withSpring(0, { ...EXIT_CFG, velocity: vy });
              dragScale.value = withSpring(1, EXIT_CFG);
              runOnJS(onPullClose)(vy);
            } else {
              const duration = Math.max(180, Math.min(320, 1000 / (vy / 100)));
              dragY.value = withTiming(H, {
                duration,
                easing: Easing.bezier(0.25, 0.1, 0.4, 1),
              });
              dragScale.value = withTiming(0.6, { duration });
              bgOpacity.value = withTiming(0, { duration: duration * 0.8 });
              runOnJS(onClose)();
            }
          } else {
            dragY.value = withSpring(0, { velocity: vy, damping: 28, stiffness: 260, mass: 0.8 });
            dragScale.value = withSpring(1, { damping: 28, stiffness: 260 });
            bgOpacity.value = withTiming(1, { duration: 200 });
          }
          return;
        }

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
          const inertiaX = e.velocityX * 0.4;
          const inertiaY = e.velocityY * 0.4;
          translateX.value = withSpring(clamped.x, { ...SPRING_CFG, velocity: inertiaX });
          translateY.value = withSpring(clamped.y, { ...SPRING_CFG, velocity: inertiaY });
          savedTx.value = clamped.x;
          savedTy.value = clamped.y;
        }
      }
    });

  // ── Gesture composition ──
  const composed = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pan, pinch),
  );

  // ── Animated styles ──
  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + dragY.value },
      { scale: scale.value * dragScale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.itemWrap, { left: index * W }]}>
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flex: 1, position: 'relative' },
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
