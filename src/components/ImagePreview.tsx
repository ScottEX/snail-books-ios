import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  PanResponder, ScrollView, Image, Platform, useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FONTS } from '../theme';

const SPRING = { friction: 8, tension: 60 };
const DISMISS_THRESHOLD = 80;
const DISMISS_VELOCITY = 0.4;
const OPEN_DURATION = 220;
const CLOSE_DURATION = 200;
const SNAP_DURATION = 220;
const MAX_ZOOM = 4;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_ZOOM = 2;
const OVERSCROLL_SWIPE = 60; // px past boundary to trigger page change

interface ImagePreviewProps {
  images: string[];
  initialIdx?: number;
  visible: boolean;
  onClose: () => void;
}

export default function ImagePreview({
  images,
  initialIdx = 0,
  visible,
  onClose,
}: ImagePreviewProps) {
  const { width: WINDOW_W, height: WINDOW_H } = useWindowDimensions();
  const [idx, setIdx] = useState(initialIdx);
  const [dismissing, setDismissing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // ── Animated values ──
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(0.92)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // ── ① Open: fade + scale ──
  useEffect(() => {
    if (!visible) return;
    overlayOpacity.setValue(0);
    imageScale.setValue(0.92);
    panY.setValue(0);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: OPEN_DURATION, useNativeDriver: false }),
      Animated.spring(imageScale, { ...SPRING, toValue: 1, useNativeDriver: false }),
    ]).start();
  }, [visible]);

  // ── Scroll to initial index on open ──
  useEffect(() => {
    if (!visible) return;
    setIdx(initialIdx);
    if (WINDOW_W > 0) {
      scrollRef.current?.scrollTo({ x: initialIdx * WINDOW_W, animated: false });
    }
  }, [visible, initialIdx, WINDOW_W]);

  // ── Close ──
  const animateClose = useCallback(() => {
    if (dismissing) return;
    setDismissing(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: CLOSE_DURATION, useNativeDriver: false }),
      Animated.spring(imageScale, { ...SPRING, toValue: 0.92, useNativeDriver: false }),
    ]).start(() => onClose());
  }, [dismissing, overlayOpacity, imageScale, onClose]);

  // ── Pinch-zoom guard: suppress overlay PanResponder while zooming ──
  const zoomActiveRef = useRef(false);
  const [scrollLocked, setScrollLocked] = useState(false);

  // ── PanResponder — vertical dismiss (disabled during pinch-zoom) ──
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !dismissing && !zoomActiveRef.current,
    onMoveShouldSetPanResponder: (_, gs) =>
      !dismissing && !zoomActiveRef.current && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5 && Math.abs(gs.dy) > 20,

    onPanResponderGrant: () => {
      panY.stopAnimation();
      panY.setValue(0);
    },

    onPanResponderMove: (_, gs) => {
      const dy = gs.dy;
      const resistance = dy / (1 + Math.abs(dy) / 250);
      panY.setValue(resistance);

      const scaleProgress = Math.min(Math.abs(dy) / 350, 1);
      imageScale.setValue(1 - scaleProgress * 0.08);

      const fadeProgress = Math.pow(Math.min(Math.abs(dy) / (DISMISS_THRESHOLD * 1.3), 1), 1.6);
      overlayOpacity.setValue(1 - fadeProgress * 0.55);
    },

    onPanResponderRelease: (_, gs) => {
      const fastFling = gs.vy > DISMISS_VELOCITY;
      const overThreshold = gs.dy > DISMISS_THRESHOLD;

      if (overThreshold || (fastFling && gs.dy > 30)) {
        setDismissing(true);
        Animated.parallel([
          Animated.timing(overlayOpacity, { toValue: 0, duration: CLOSE_DURATION, useNativeDriver: false }),
          Animated.timing(panY, { toValue: WINDOW_H * 0.5, duration: CLOSE_DURATION, useNativeDriver: false }),
          Animated.spring(imageScale, { ...SPRING, toValue: 0.92, useNativeDriver: false }),
        ]).start(() => onClose());
      } else {
        Animated.parallel([
          Animated.timing(panY, { toValue: 0, duration: SNAP_DURATION, useNativeDriver: false }),
          Animated.spring(imageScale, { ...SPRING, toValue: 1, useNativeDriver: false }),
          Animated.timing(overlayOpacity, { toValue: 1, duration: 180, useNativeDriver: false }),
        ]).start();
      }
    },
  }), [dismissing, panY, overlayOpacity, imageScale, WINDOW_H, onClose]);

  // ── Edge-swipe page change when zoomed ──
  const handleSwipeToPage = useCallback((direction: -1 | 1) => {
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= images.length) return;
    setIdx(nextIdx);
    scrollRef.current?.scrollTo({ x: nextIdx * WINDOW_W, animated: true });
  }, [idx, images.length, WINDOW_W]);

  if (!visible || images.length === 0 || WINDOW_W === 0) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} {...panResponder.panHandlers}>
      {/* Close button */}
      <TouchableOpacity style={styles.close} onPress={animateClose} activeOpacity={0.7}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
          <Path d="M18 6L6 18M6 6l12 12" />
        </Svg>
      </TouchableOpacity>

      {/* Paged ScrollView — native horizontal swipe */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const raw = offsetX / WINDOW_W;
          const page = Math.round(raw);
          if (page >= 0 && page < images.length && page !== idx) {
            setIdx(page);
          }
        }}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        scrollEnabled={!scrollLocked}
      >
        {images.map((src, i) => (
          <Animated.View
            key={i}
            style={[styles.page, { width: WINDOW_W, transform: [{ scale: imageScale }] }]}
          >
            <ZoomableImage
              src={src}
              windowW={WINDOW_W}
              windowH={WINDOW_H}
              onZoomActive={(v) => { zoomActiveRef.current = v; setScrollLocked(v); }}
              onSwipeToPage={handleSwipeToPage}
            />
          </Animated.View>
        ))}
      </ScrollView>

      {/* Counter — dots */}
      {images.length > 1 && (
        <View style={styles.dots}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// ── Helpers ──

/** Compute the fitted image dimensions given natural size and viewport constraints. */
function getFittedSize(naturalW: number, naturalH: number, viewW: number, viewH: number) {
  if (!naturalW || !naturalH) return { w: viewW, h: viewH };
  const imgRatio = naturalW / naturalH;
  const viewRatio = viewW / viewH;
  if (imgRatio > viewRatio) {
    return { w: viewW, h: viewW / imgRatio };
  }
  return { w: viewH * imgRatio, h: viewH };
}

/** Clamp a value within [low, high], applying sqrt resistance beyond bounds (iOS-style). */
function clampResist(val: number, low: number, high: number) {
  if (val < low) return low - Math.sqrt(low - val) * 2;
  if (val > high) return high + Math.sqrt(val - high) * 2;
  return val;
}

// ═══════════════════════════════════════════════════════════════════════
//  ZoomableImage — pinch-to-zoom + edge-constrained pan + edge-swipe page
// ═══════════════════════════════════════════════════════════════════════

function ZoomableImage({
  src, windowW, windowH, onZoomActive, onSwipeToPage,
}: {
  src: string; windowW: number; windowH: number;
  onZoomActive: (active: boolean) => void;
  onSwipeToPage?: (direction: -1 | 1) => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const scaleRef = useRef(1);
  const rawOffsetRef = useRef({ x: 0, y: 0 }); // raw unclamped — for edge-swipe detection only
  const offRef = useRef({ x: 0, y: 0 });        // always synced with state — for snap-back

  const pinchBase = useRef({ dist: 0, scale: 1 });
  const panBase = useRef({ x: 0, y: 0 });
  const touchRef = useRef({ startX: 0, startY: 0 });
  const lastTap = useRef(0);
  const wasPinch = useRef(false);
  const didPan = useRef(false);    // true if this gesture involved horizontal panning

  // Image natural size — updated on load; used to compute pan boundaries
  const imgNatural = useRef({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  const zoomed = scaleRef.current > 1.005;

  /** Current allowed pan range given zoom level and natural image size. */
  const computeBounds = useCallback(() => {
    const viewH = windowH * 0.9;
    const fitted = getFittedSize(imgNatural.current.w, imgNatural.current.h, windowW, viewH);
    const s = scaleRef.current;
    const scaledW = fitted.w * s;
    const scaledH = fitted.h * s;
    const maxX = Math.max(0, (scaledW - windowW) / 2);
    const maxY = Math.max(0, (scaledH - windowH) / 2);
    return { maxX, maxY, scaledW, scaledH, fitted };
  }, [windowW, windowH]);

  // ── Touch handlers ──

  const handleTouchStart = useCallback((e: any) => {
    const ts = e.nativeEvent?.touches || e.touches || [];
    const isPinch = ts.length === 2;
    const isPan = ts.length === 1 && zoomed;

    if (!isPinch && !isPan) return;

    e.stopPropagation();
    onZoomActive(true);
    wasPinch.current = isPinch;
    didPan.current = false;

    if (isPinch) {
      const dx = ts[0].clientX - ts[1].clientX;
      const dy = ts[0].clientY - ts[1].clientY;
      pinchBase.current = { dist: Math.hypot(dx, dy), scale: scaleRef.current };
    } else {
      panBase.current = { x: offset.x, y: offset.y };
      touchRef.current = { startX: ts[0].clientX, startY: ts[0].clientY };
    }
  }, [offset.x, offset.y, zoomed, onZoomActive]);

  const handleTouchMove = useCallback((e: any) => {
    const ts = e.nativeEvent?.touches || e.touches || [];
    const isPinch = ts.length === 2;
    const isPan = ts.length === 1 && zoomed;

    if (!isPinch && !isPan) return;

    e.stopPropagation();
    e.preventDefault?.();

    if (isPinch) {
      const dx = ts[0].clientX - ts[1].clientX;
      const dy = ts[0].clientY - ts[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (pinchBase.current.dist > 0) {
        const newScale = Math.max(1, Math.min(MAX_ZOOM, pinchBase.current.scale * (dist / pinchBase.current.dist)));
        scaleRef.current = newScale;
        setScale(newScale);

        // Re-clamp offset — zooming out shrinks allowed pan area
        const { maxX, maxY } = computeBounds();
        const cx = offRef.current.x;
        const cy = offRef.current.y;
        const nx = Math.max(-maxX, Math.min(maxX, cx));
        const ny = Math.max(-maxY, Math.min(maxY, cy));
        if (nx !== cx || ny !== cy) {
          offRef.current = { x: nx, y: ny };
          rawOffsetRef.current = { x: nx, y: ny };
          setOffset({ x: nx, y: ny });
        }
      }
    } else {
      didPan.current = true;
      const rawX = panBase.current.x + (ts[0].clientX - touchRef.current.startX);
      const rawY = panBase.current.y + (ts[0].clientY - touchRef.current.startY);

      // Clamp with iOS-style resistance beyond boundaries
      const { maxX, maxY } = computeBounds();
      const clampedX = clampResist(rawX, -maxX, maxX);
      const clampedY = clampResist(rawY, -maxY, maxY);

      rawOffsetRef.current = { x: rawX, y: rawY }; // for edge-swipe
      offRef.current = { x: rawX, y: rawY };
      setOffset({ x: clampedX, y: clampedY });
    }
  }, [zoomed, computeBounds]);

  const handleTouchEnd = useCallback((e: any) => {
    const ts = e.nativeEvent?.changedTouches || e.changedTouches || [];
    const isPinch = ts.length === 2;
    const curScale = scaleRef.current;
    const curZoomed = curScale > 1.005;

    if (curZoomed || isPinch) {
      e.stopPropagation();
    } else {
      onZoomActive(false); // ensure ScrollView unlocked (touchcancel safety)
      return;
    }

    const now = Date.now();
    const endOfPinch = wasPinch.current;
    wasPinch.current = false;

    if (!endOfPinch) {
      if (ts.length === 1 && now - lastTap.current < DOUBLE_TAP_MS) {
        const touch = ts[0];
        if (curZoomed) {
          scaleRef.current = 1;
          setScale(1);
          setOffset({ x: 0, y: 0 });
          offRef.current = { x: 0, y: 0 };
          rawOffsetRef.current = { x: 0, y: 0 };
          onZoomActive(false);
        } else {
          scaleRef.current = DOUBLE_TAP_ZOOM;
          setScale(DOUBLE_TAP_ZOOM);
          const cx = windowW / 2;
          const cy = windowH / 2;
          setOffset({
            x: (cx - touch.clientX) * (DOUBLE_TAP_ZOOM - 1),
            y: (cy - touch.clientY) * (DOUBLE_TAP_ZOOM - 1),
          });
          offRef.current = { x: (cx - touch.clientX) * (DOUBLE_TAP_ZOOM - 1), y: (cy - touch.clientY) * (DOUBLE_TAP_ZOOM - 1) };
          rawOffsetRef.current = { x: (cx - touch.clientX) * (DOUBLE_TAP_ZOOM - 1), y: (cy - touch.clientY) * (DOUBLE_TAP_ZOOM - 1) };
        }
        lastTap.current = 0;
        return;
      }
      if (ts.length === 1) {
        lastTap.current = now;
      }
    }

    if (curScale <= 1.005) {
      scaleRef.current = 1;
      setScale(1);
      setOffset({ x: 0, y: 0 });
      offRef.current = { x: 0, y: 0 };
      rawOffsetRef.current = { x: 0, y: 0 };
      onZoomActive(false);
      return;
    }

    // ── Edge-swipe to next/prev page (only if user actually panned) ──
    if (curZoomed && didPan.current) {
      const { maxX } = computeBounds();
      const rawX = rawOffsetRef.current.x;

      if (rawX < -maxX - OVERSCROLL_SWIPE) {
        onSwipeToPage?.(1);
        scaleRef.current = 1;
        setScale(1);
        setOffset({ x: 0, y: 0 });
        offRef.current = { x: 0, y: 0 };
        rawOffsetRef.current = { x: 0, y: 0 };
        onZoomActive(false);
        return;
      }
      if (rawX > maxX + OVERSCROLL_SWIPE) {
        onSwipeToPage?.(-1);
        setScale(1);
        setOffset({ x: 0, y: 0 });
        offRef.current = { x: 0, y: 0 };
        rawOffsetRef.current = { x: 0, y: 0 };
        onZoomActive(false);
        return;
        return;
      }
    }

    // ── Snap pan back within bounds ──
    const { maxX, maxY } = computeBounds();
    const curX = offRef.current.x;
    const curY = offRef.current.y;
    const snapX = Math.max(-maxX, Math.min(maxX, curX));
    const snapY = Math.max(-maxY, Math.min(maxY, curY));
    if (snapX !== curX || snapY !== curY) {
      setOffset({ x: snapX, y: snapY });
      offRef.current = { x: snapX, y: snapY };
    }
    // Gesture ended — unlock ScrollView for page swiping
    onZoomActive(false);
  }, [windowW, windowH, onZoomActive, onSwipeToPage, computeBounds]);

  // ── Image load: capture natural dimensions ──
  const onImgLoad = useCallback((e: any) => {
    const img = e.target || e.currentTarget;
    imgNatural.current = { w: img.naturalWidth || 0, h: img.naturalHeight || 0 };
  }, []);

  if (Platform.OS !== 'web') {
    return (
      <NativeZoomableImage
        src={src}
        windowW={windowW}
        windowH={windowH}
        onZoomActive={onZoomActive}
        onSwipeToPage={onSwipeToPage}
      />
    );
  }

  // Web-only: raw elements for precise touch handling
  return React.createElement('div', {
    style: {
      width: '100%', height: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      touchAction: zoomed ? 'none' : 'auto',
    } as React.CSSProperties,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd,  // same cleanup: unlock ScrollView
  },
    React.createElement('img', {
      ref: imgRef,
      src,
      draggable: false,
      alt: 'preview',
      onLoad: onImgLoad,
      style: {
        width: `${100 * scale}%`,
        maxWidth: 'none',
        height: 'auto',
        maxHeight: `${90 * scale}vh`,
        objectFit: 'contain',
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        transformOrigin: 'center center',
        transition: scale === 1 && offset.x === 0 && offset.y === 0
          ? 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        pointerEvents: 'none',
      } as React.CSSProperties,
    })
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  NativeZoomableImage — pinch-to-zoom for iOS/Android (PanResponder)
// ═══════════════════════════════════════════════════════════════════════

function NativeZoomableImage({
  src, windowW, windowH, onZoomActive, onSwipeToPage,
}: {
  src: string; windowW: number; windowH: number;
  onZoomActive: (active: boolean) => void;
  onSwipeToPage?: (direction: -1 | 1) => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const offRef = useRef({ x: 0, y: 0 });
  const pinchBase = useRef({ dist: 0, scale: 1 });
  const panStart = useRef({ x: 0, y: 0, offX: 0, offY: 0 });
  const lastTap = useRef(0);
  const imgSize = useRef({ w: 0, h: 0 });

  const computeBounds = useCallback(() => {
    const { w, h } = imgSize.current;
    if (!w || !h) return { maxX: 0, maxY: 0 };
    const fitted = getFittedSize(w, h, windowW, windowH);
    const s = scaleRef.current;
    return {
      maxX: Math.max(0, (fitted.w * s - windowW) / 2),
      maxY: Math.max(0, (fitted.h * s - windowH) / 2),
    };
  }, [windowW, windowH]);

  const resetZoom = useCallback(() => {
    scaleRef.current = 1;
    setScale(1);
    setOffset({ x: 0, y: 0 });
    offRef.current = { x: 0, y: 0 };
    onZoomActive(false);
  }, [onZoomActive]);

  const handleTouchStart = useCallback((e: any) => {
    const ts: any[] = e.nativeEvent.touches ?? e.nativeEvent.changedTouches ?? [];
    if (ts.length >= 2) {
      const dx = ts[0].pageX - ts[1].pageX;
      const dy = ts[0].pageY - ts[1].pageY;
      pinchBase.current = { dist: Math.hypot(dx, dy), scale: scaleRef.current };
      onZoomActive(true);
    } else if (scaleRef.current > 1.005 && ts.length === 1) {
      panStart.current = { x: ts[0].pageX, y: ts[0].pageY, offX: offRef.current.x, offY: offRef.current.y };
    }
  }, [onZoomActive]);

  const handleTouchMove = useCallback((e: any) => {
    const ts: any[] = e.nativeEvent.touches ?? e.nativeEvent.changedTouches ?? [];
    if (ts.length >= 2 && pinchBase.current.dist > 0) {
      const dx = ts[0].pageX - ts[1].pageX;
      const dy = ts[0].pageY - ts[1].pageY;
      const dist = Math.hypot(dx, dy);
      const s = Math.max(1, Math.min(MAX_ZOOM, pinchBase.current.scale * (dist / pinchBase.current.dist)));
      scaleRef.current = s;
      setScale(s);
      const { maxX, maxY } = computeBounds();
      const nx = Math.max(-maxX, Math.min(maxX, offRef.current.x));
      const ny = Math.max(-maxY, Math.min(maxY, offRef.current.y));
      if (nx !== offRef.current.x || ny !== offRef.current.y) {
        offRef.current = { x: nx, y: ny };
        setOffset({ x: nx, y: ny });
      }
    } else if (scaleRef.current > 1.005 && ts.length === 1) {
      const nx = panStart.current.offX + (ts[0].pageX - panStart.current.x);
      const ny = panStart.current.offY + (ts[0].pageY - panStart.current.y);
      const { maxX, maxY } = computeBounds();
      offRef.current = { x: nx, y: ny };
      setOffset({ x: clampResist(nx, -maxX, maxX), y: clampResist(ny, -maxY, maxY) });
    }
  }, [computeBounds]);

  const handleTouchEnd = useCallback((e: any) => {
    const ts: any[] = e.nativeEvent.touches ?? [];
    if (ts.length === 0) {
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        if (scaleRef.current > 1.005) {
          resetZoom();
        } else {
          scaleRef.current = DOUBLE_TAP_ZOOM;
          setScale(DOUBLE_TAP_ZOOM);
        }
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }

      if (scaleRef.current <= 1.005) {
        resetZoom();
        return;
      }

      const { maxX } = computeBounds();
      const rawX = offRef.current.x;
      if (rawX < -maxX - OVERSCROLL_SWIPE) { onSwipeToPage?.(1); resetZoom(); return; }
      if (rawX > maxX + OVERSCROLL_SWIPE) { onSwipeToPage?.(-1); resetZoom(); return; }

      const { maxY } = computeBounds();
      const snapX = Math.max(-maxX, Math.min(maxX, offRef.current.x));
      const snapY = Math.max(-maxY, Math.min(maxY, offRef.current.y));
      setOffset({ x: snapX, y: snapY });
      offRef.current = { x: snapX, y: snapY };
    }
    onZoomActive(scaleRef.current > 1.005);
  }, [computeBounds, onSwipeToPage, resetZoom, onZoomActive]);

  return (
    <View
      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Image
        source={{ uri: src }}
        onLoad={(e: any) => {
          const { width: w, height: h } = e.nativeEvent.source || {};
          if (w && h) imgSize.current = { w, h };
        }}
        style={{
          width: `${100 * scale}%`,
          height: `${90 * scale}%`,
          resizeMode: 'contain',
          transform: [{ translateX: offset.x }, { translateY: offset.y }, { scale }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  scrollView: { flex: 1 },
  scrollContent: { alignItems: 'center' },
  page: { alignItems: 'center', justifyContent: 'center' },
  close: {
    position: 'absolute', top: 48, right: 20, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  dots: {
    position: 'absolute' as any, bottom: 60, alignSelf: 'center', zIndex: 10,
    flexDirection: 'row' as any, gap: 6,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: { backgroundColor: 'rgba(255,255,255,0.9)' },
});
