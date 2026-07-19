// ═══════════════════════════════════════════════════════════════
// BgCropModal — 封面/背景裁剪 modal (RN 版)
// ───────────────────────────────────────────────────────────────
// mode='cover' = 横向封面比例; mode='bg' = 竖向背景比例
// 只负责裁剪，无内部预览。裁剪完直接 onConfirm(dataUri) 回传父组件。

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, useWindowDimensions, PanResponder, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Line, Circle } from 'react-native-svg';
import { FONTS } from '../theme';
import * as ImageManipulator from 'expo-image-manipulator';
const { FlipType } = ImageManipulator;
import { t } from '../i18n';
import Slider from '@react-native-community/slider';
import SubmitButton from './SubmitButton';

interface BgCropModalProps {
  visible: boolean;
  src: string;
  onConfirm: (dataUri: string) => void;
  onCancel: () => void;
  /** 'cover' = horizontal banner ratio 260/stageW; default 'bg' = viewport ratio */
  mode?: 'cover' | 'bg';
}

export default function BgCropModal({ visible, src, onConfirm, onCancel, mode }: BgCropModalProps) {
  const { width: WIN_W, height: WIN_H } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const imgNaturalRef = useRef({ w: 0, h: 0 });
  const hasFit = useRef(false);  // prevent refit on layout changes during confirm
  const [zoomPct, setZoomPct] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [stageDim, setStageDim] = useState({ w: 0, h: 0 });

  // ── Guide: aspect ratio from viewport, width capped to fit stage
  //     Matches web: cropRatio = window.innerHeight / window.innerWidth
  const bgAspect = WIN_W > 0 ? WIN_H / WIN_W : 812 / 375;
  const stageW = stageDim.w > 0 ? stageDim.w : WIN_W;
  const stageH2 = stageDim.h > 0 ? stageDim.h : WIN_H;
  const cropAspect = mode === 'cover'
    ? (stageW > 0 ? 260 / stageW : 260 / 375)
    : bgAspect;
  const guideW = !stageDim.w
    ? Math.round(WIN_W * 0.76)
    : mode === 'cover'
      ? Math.round(stageDim.w * 0.8)
      : Math.min(stageDim.w, Math.round(stageH2 / cropAspect));
  const guideH = Math.round(guideW * cropAspect);

  // ── Rotation / flip (React state, non-continuous) ──
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);

  // ── Animated values (UI thread via native driver) ──
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // ── Crop math state (ref, no re-render) ──
  const stateRef = useRef({
    x: 0, y: 0, scale: 1, rotation: 0, flipX: false,
    minScale: 1, maxScale: 8,
    cropW: guideW, cropH: guideH,
  });

  const clampCrop = () => {
    const s = stateRef.current;
    const { w, h } = imgNaturalRef.current;
    if (w <= 0) return;
    const halfW = (w * s.scale) / 2;
    const halfH = (h * s.scale) / 2;
    const hw = s.cropW / 2;
    const hh = s.cropH / 2;
    const maxX = halfW - hw;
    const maxY = halfH - hh;
    s.x = maxX > 0 ? Math.max(-maxX, Math.min(maxX, s.x)) : 0;
    s.y = maxY > 0 ? Math.max(-maxY, Math.min(maxY, s.y)) : 0;
    translateX.setValue(s.x);
    translateY.setValue(s.y);
  };

  const getScalePct = () => {
    const s = stateRef.current;
    const range = (s.maxScale - s.minScale) * 0.5;
    if (range <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round(100 * (s.scale - s.minScale) / range)));
  };

  const updateZoom = () => {
    setZoomPct(getScalePct());
  };

  const fitImage = () => {
    if (imgNatural.w <= 0 || imgNatural.h <= 0) return;
    const s = stateRef.current;
    const effW = (s.rotation % 180 === 0) ? imgNatural.w : imgNatural.h;
    const effH = (s.rotation % 180 === 0) ? imgNatural.h : imgNatural.w;
    const sw = s.cropW / effW;
    const sh = s.cropH / effH;
    s.scale = Math.max(sw, sh) * 1.05;
    s.minScale = Math.max(sw, sh);
    s.x = 0; s.y = 0;
    translateX.setValue(0);
    translateY.setValue(0);
    scaleAnim.setValue(s.scale);
    updateZoom();
  };

  // ── Slider → scale ──
  const setScaleFromSlider = (pct: number) => {
    const s = stateRef.current;
    const t = pct / 100;
    s.scale = s.minScale + (s.maxScale - s.minScale) * t * 0.5;
    s.scale = Math.max(s.minScale, s.scale);
    scaleAnim.setValue(s.scale);
    clampCrop();
    updateZoom();
  };

  // ── stage 布局后更新 cropW/cropH ──
  useEffect(() => {
    if (stageDim.w > 0 && guideW > 0) {
      stateRef.current.cropW = guideW;
      stateRef.current.cropH = guideH;
      // Only fit on initial layout (first non-zero stage dims).
      // Skip subsequent fits — e.g. during confirm the actions bar
      // height changes slightly, which would otherwise reset the image.
      if (imgNatural.w > 0 && !hasFit.current) {
        fitImage();
        hasFit.current = true;
      }
    }
  }, [stageDim.w, stageDim.h]);

  // ── 加载图片 ──
  useEffect(() => {
    if (!visible || !src) return;
    setImgNatural({ w: 0, h: 0 });
    imgNaturalRef.current = { w: 0, h: 0 };
    hasFit.current = false;  // reset for new image
    setErrMsg('');
    Image.getSize(src, (w, h) => {
      imgNaturalRef.current = { w, h };
      setImgNatural({ w, h });
    }, () => setErrMsg(t('cropFailed')));
  }, [visible, src]);

  useEffect(() => {
    if (visible && imgNatural.w > 0) fitImage();
  }, [visible, imgNatural.w]);

  // ── PanResponder ──
  const panResponder = useMemo(() => {
    let dragOrigX = 0, dragOrigY = 0, dragStartX = 0, dragStartY = 0, dragActive = false;
    let pinchStartDist = 0, pinchStartScale = 1, pinchActive = false;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const touches = e.nativeEvent.touches;
        const s = stateRef.current;
        if (touches.length >= 2) {
          pinchActive = true;
          pinchStartDist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
          pinchStartScale = s.scale;
        } else {
          dragActive = true;
          dragStartX = touches[0].pageX;
          dragStartY = touches[0].pageY;
          dragOrigX = s.x;
          dragOrigY = s.y;
        }
      },
      onPanResponderMove: (e) => {
        const touches = e.nativeEvent.touches;
        const s = stateRef.current;

        if (touches.length >= 2) {
          if (!pinchActive) {
            pinchActive = true;
            dragActive = false;
            pinchStartDist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
            pinchStartScale = s.scale;
          }
          const d = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
          s.scale = Math.max(s.minScale, Math.min(s.maxScale, pinchStartScale * (d / pinchStartDist)));
          scaleAnim.setValue(s.scale);
          clampCrop();
          updateZoom();
        } else if (touches.length === 1 && dragActive) {
          s.x = dragOrigX + (touches[0].pageX - dragStartX);
          s.y = dragOrigY + (touches[0].pageY - dragStartY);
          clampCrop();
          updateZoom();
        }
      },
      onPanResponderRelease: () => { dragActive = false; pinchActive = false; },
      onPanResponderTerminate: () => { dragActive = false; pinchActive = false; },
    });
  }, []);

  // ── Confirm: crop → fire onConfirm with base64 dataUri ──
  const handleConfirm = async () => {
    if (confirming || imgNatural.w === 0) return;
    setConfirming(true);
    setErrMsg('');
    try {
      const s = stateRef.current;
      const outW = mode === 'cover' ? 720 : 1280;
      const outH = Math.max(mode === 'cover' ? 200 : 320, Math.round(outW * cropAspect));
      const cropWOrig = s.cropW / s.scale;
      const cropHOrig = s.cropH / s.scale;
      const rotatedW = s.rotation % 180 === 0 ? imgNatural.w : imgNatural.h;
      const rotatedH = s.rotation % 180 === 0 ? imgNatural.h : imgNatural.w;
      const originX = rotatedW / 2 - s.x / s.scale - cropWOrig / 2;
      const originY = rotatedH / 2 - s.y / s.scale - cropHOrig / 2;
      const cx = Math.max(0, Math.min(originX, rotatedW - cropWOrig));
      const cy = Math.max(0, Math.min(originY, rotatedH - cropHOrig));
      const cw = Math.min(cropWOrig, rotatedW - cx);
      const ch = Math.min(cropHOrig, rotatedH - cy);

      const ops: ImageManipulator.Action[] = [];
      if (s.flipX) ops.push({ flip: FlipType.Horizontal });
      if (s.rotation !== 0) ops.push({ rotate: s.rotation as any });
      ops.push({ crop: { originX: cx, originY: cy, width: cw, height: ch } });
      ops.push({ resize: { width: outW, height: outH } });

      const result = await ImageManipulator.manipulateAsync(src, ops, {
        compress: 0.92, format: ImageManipulator.SaveFormat.JPEG, base64: true,
      });
      if (result.base64) {
        const dataUri = `data:image/jpeg;base64,${result.base64}`;
        onConfirm(dataUri);
      } else {
        setErrMsg(t('cropFailed'));
      }
    } catch (e) {
      setErrMsg(t('cropFailed'));
    } finally { setConfirming(false); }
  };

  const rotate90 = () => {
    const s = stateRef.current;
    s.rotation = (s.rotation + 90) % 360;
    setRotation(s.rotation);
    fitImage();
  };

  const toggleFlip = () => {
    const s = stateRef.current;
    s.flipX = !s.flipX;
    setFlipX(s.flipX);
  };

  // ── springScale entry (matches ThemePickerModal) ──
  const entryFade = useRef(new Animated.Value(0)).current;
  const entryScale = useRef(new Animated.Value(0.85)).current;
  const entrySlide = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    entryFade.setValue(0);
    entryScale.setValue(0.85);
    entrySlide.setValue(12);
    Animated.parallel([
      Animated.spring(entryScale, { toValue: 1, bounciness: 8, speed: 14, useNativeDriver: true }),
      Animated.spring(entrySlide, { toValue: 0, bounciness: 8, speed: 14, useNativeDriver: true }),
      Animated.timing(entryFade, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  // ── springScale dismiss (matches ThemePickerModal close) ──
  const [closing, setClosing] = useState(false);
  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    Animated.parallel([
      Animated.timing(entryScale, { toValue: 0.92, duration: 220, useNativeDriver: true }),
      Animated.timing(entrySlide, { toValue: 8, duration: 220, useNativeDriver: true }),
      Animated.timing(entryFade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => { setClosing(false); onCancel(); });
  };

  if (!visible && !closing) return null;

  // ── Mode-dependent labels ──
  const cropTitle = mode === 'cover' ? t('coverCropTitle') : t('editBg');
  const confirmLabel = mode === 'cover' ? t('useThisCover') : t('useThisBg');
  const armLen = 18;
  const cornerPath = `M 0,${armLen} L 0,0 L ${armLen},0 M ${guideW - armLen},0 L ${guideW},0 L ${guideW},${armLen} M 0,${guideH - armLen} L 0,${guideH} L ${armLen},${guideH} M ${guideW},${guideH - armLen} L ${guideW},${guideH} L ${guideW - armLen},${guideH}`;

  return (
    <Animated.View style={[styles.overlay, { opacity: entryFade, transform: [{ scale: entryScale }, { translateY: entrySlide }] }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>{cropTitle}</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Cropping area ── */}
      <View
        style={styles.stageArea}
        onLayout={(e) => setStageDim({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...panResponder.panHandlers}
      >
        {imgNatural.w > 0 && stageDim.w > 0 && (
          <Animated.Image
            source={{ uri: src }}
            style={{
              position: 'absolute',
              width: imgNatural.w,
              height: imgNatural.h,
              left: stageDim.w / 2 - imgNatural.w / 2,
              top: stageDim.h / 2 - imgNatural.h / 2,
              transform: [
                { translateX },
                { translateY },
                { scale: scaleAnim },
                { rotate: `${rotation}deg` },
                { scaleX: flipX ? -1 : 1 },
              ],
            }}
          />
        )}

        <View style={styles.guideOverlay} pointerEvents="none">
          <Svg width={guideW} height={guideH}>
            <Rect x={0} y={0} width={guideW} height={guideH} stroke="rgba(255,255,255,0.8)" strokeWidth={2} fill="transparent" />
            <Line x1={0} y1={guideH / 3} x2={guideW} y2={guideH / 3} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <Line x1={0} y1={(guideH * 2) / 3} x2={guideW} y2={(guideH * 2) / 3} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <Line x1={guideW / 3} y1={0} x2={guideW / 3} y2={guideH} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <Line x1={(guideW * 2) / 3} y1={0} x2={(guideW * 2) / 3} y2={guideH} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <Path
              d={cornerPath}
              stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
              fill="transparent" opacity={0.9}
            />
          </Svg>
        </View>

        <View style={styles.pill} pointerEvents="none">
          <Text style={styles.pillText}>{t('cropPill')}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.zoomRow}>
          <Text style={styles.zoomEdgeSmall}>A</Text>
          <Slider
            style={{ flex: 1, height: 40 }}
            minimumValue={0} maximumValue={100} step={1}
            value={zoomPct}
            onValueChange={(v) => setScaleFromSlider(v)}
            minimumTrackTintColor="#5B5BD6"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#fff"
          />
          <Text style={styles.zoomEdge}>A</Text>
        </View>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.toolBtn} onPress={rotate90}>
          <Text style={styles.toolIcon}>↻</Text>
          <Text style={styles.toolLabel}>{t('cropRotate')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolBtn, { marginLeft: 8 }]} onPress={toggleFlip}>
          <Text style={styles.toolIcon}>⇋</Text>
          <Text style={styles.toolLabel}>{t('cropFlip')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
          <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
        </TouchableOpacity>
        <SubmitButton
          onPress={handleConfirm}
          loading={confirming}
          style={styles.confirmBtn}
        >
          <View style={styles.checkBadge}><Text style={styles.checkBadgeText}>✓</Text></View>
          <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
        </SubmitButton>
      </View>

      {errMsg !== '' && <Text style={styles.errText}>{errMsg}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(8,8,12,0.92)', justifyContent: 'flex-start', alignItems: 'stretch' },
  header: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: FONTS.sub.size, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 20 },
  stageArea: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' },
  guideOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', bottom: 8, alignSelf: 'center', left: '50%', transform: [{ translateX: -75 }], backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  pillText: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.7)' },
  toolbar: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  zoomEdge: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.5)' },
  zoomEdgeSmall: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.5)' },
  divider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 10 },
  toolBtn: { paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  toolIcon: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  toolLabel: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  actions: { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: FONTS.sub.size, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  confirmBtn: { flex: 2, padding: 11, borderRadius: 12, backgroundColor: '#5B5BD6', justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  confirmBtnText: { fontSize: FONTS.sub.size, fontWeight: '600', color: '#fff' },
  checkBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  checkBadgeText: { fontSize: FONTS.micro.size, color: '#fff' },
  errText: { fontSize: FONTS.micro.size, color: '#ef4444', textAlign: 'center', paddingBottom: 8, fontWeight: '500' },
});
