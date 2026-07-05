import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Image, Animated, PanResponder, useWindowDimensions } from 'react-native';

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2;
const DOUBLE_TAP_MS = 300;
const SWIPE_THRESHOLD = 80;   // px to trigger page change
const SWIPE_VELOCITY = 0.3;    // px/ms to trigger

interface Props {
  images: string[];
  initialIdx: number;
  onIndexChange: (idx: number) => void;
}

export default function NativeImagePager({ images, initialIdx, onIndexChange }: Props) {
  const { width: W } = useWindowDimensions();
  const [idx, setIdx] = useState(initialIdx);
  const idxRef = useRef(initialIdx);
  const translateX = useRef(new Animated.Value(-initialIdx * W)).current;
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const pinchBase = useRef({ dist: 0, scale: 1 });
  const panStart = useRef({ x: 0, y: 0, offX: 0, offY: 0 });
  const lastTap = useRef(0);
  const isPinching = useRef(false);

  const goTo = useCallback((i: number, animated = true) => {
    const clamped = Math.max(0, Math.min(images.length - 1, i));
    idxRef.current = clamped;
    setIdx(clamped);
    onIndexChange(clamped);
    if (animated) {
      Animated.spring(translateX, { toValue: -clamped * W, useNativeDriver: true, friction: 8, tension: 60 }).start();
    } else {
      translateX.setValue(-clamped * W);
    }
  }, [images.length, W, translateX, onIndexChange]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => {
      if (gs.numberActiveTouches >= 2) return true;
      if (scaleRef.current > 1.05) return true;  // zoomed → claim all touches
      if (Math.abs(gs.dx) > 8 || Math.abs(gs.dy) > 8) return true;  // enough movement
      return false;
    },
    onPanResponderGrant: (e) => {
      const ts = e.nativeEvent.touches ?? [];
      if (ts.length >= 2) {
        isPinching.current = true;
        const dx = ts[0].pageX - ts[1].pageX;
        const dy = ts[0].pageY - ts[1].pageY;
        pinchBase.current = { dist: Math.hypot(dx, dy), scale: scaleRef.current };
      } else {
        isPinching.current = false;
        panStart.current = { x: 0, y: 0, offX: 0, offY: 0 };
        translateX.stopAnimation();
      }
    },
    onPanResponderMove: (e, gs) => {
      const ts = e.nativeEvent.touches ?? [];
      if (ts.length >= 2) {
        isPinching.current = true;
        const dx = ts[0].pageX - ts[1].pageX;
        const dy = ts[0].pageY - ts[1].pageY;
        const dist = Math.hypot(dx, dy);
        if (pinchBase.current.dist > 0) {
          const s = Math.max(1, Math.min(MAX_ZOOM, pinchBase.current.scale * (dist / pinchBase.current.dist)));
          scaleRef.current = s;
          setScale(s);
        }
      } else if (scaleRef.current > 1.05) {
        // Pan within zoomed image — not implemented for simplicity, just track
      } else {
        // Horizontal paging — track finger
        const raw = gs.dx - (panStart.current.x || 0);
        panStart.current.x = gs.dx;
        const cur = -idxRef.current * W + raw;
        const minX = -(images.length - 1) * W;
        const clamped = Math.max(minX, Math.min(0, cur));
        translateX.setValue(clamped);
      }
    },
    onPanResponderRelease: (_, gs) => {
      if (isPinching.current) {
        isPinching.current = false;
        if (scaleRef.current < 1.05) { scaleRef.current = 1; setScale(1); }
        return;
      }

      // Double-tap detection
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        if (scaleRef.current > 1.05) {
          scaleRef.current = 1; setScale(1);
        } else {
          scaleRef.current = DOUBLE_TAP_ZOOM; setScale(DOUBLE_TAP_ZOOM);
        }
        lastTap.current = 0;
        goTo(idxRef.current, false);
        return;
      }
      lastTap.current = now;

      // Page snap
      const curOffset = -(idxRef.current * W) + gs.dx;
      const vx = gs.vx || 0;
      let target = idxRef.current;
      if (Math.abs(gs.dx) > SWIPE_THRESHOLD || Math.abs(vx) > SWIPE_VELOCITY) {
        target = gs.dx > 0 ? idxRef.current - 1 : idxRef.current + 1;
      }
      goTo(target, true);
    },
    onPanResponderTerminate: () => {
      isPinching.current = false;
      goTo(idxRef.current, false);
    },
  }), [W, images.length, goTo, translateX]);

  if (W === 0) return null;

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} {...panResponder.panHandlers}>
      <Animated.View style={{ flex: 1, flexDirection: 'row', transform: [{ translateX }] }}>
        {images.map((src, i) => (
          <View key={i} style={{ width: W, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Image
              source={{ uri: src }}
              style={{
                width: `${100 * (i === idx ? scale : 1)}%`,
                height: `${90 * (i === idx ? scale : 1)}%`,
                resizeMode: 'contain',
              }}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
