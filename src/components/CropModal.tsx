// ═══════════════════════════════════════════════════════════════
// CropModal — 头像裁剪 modal (RN 版)
// v2.1: 回退 PanResponder，修复双指缩放 bug（grant 时检测 touch 数量而非依赖 drag/pinch flag）
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, useWindowDimensions, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import * as ImageManipulator from 'expo-image-manipulator';
const { FlipType } = ImageManipulator;
import { t } from '../i18n';
import Slider from '@react-native-community/slider';

interface CropModalProps {
  visible: boolean;
  src: string;
  onConfirm: (dataUri: string) => void;
  onCancel: () => void;
}

const STAGE_PAD_H = 16;

export default function CropModal({ visible, src, onConfirm, onCancel }: CropModalProps) {
  const { width: WIN_W } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const imgNaturalRef = useRef({ w: 0, h: 0 });
  const [zoomPct, setZoomPct] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [stageDim, setStageDim] = useState({ w: 0, h: 0 });
  const guideSize = !stageDim.w ? WIN_W - STAGE_PAD_H * 2 : Math.round(Math.min(stageDim.w, stageDim.h) * 0.76);

  // ── Image display transform (plain numbers + forceUpdate for re-render)
  const [dispX, setDispX] = useState(0);
  const [dispY, setDispY] = useState(0);
  const [dispScale, setDispScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);

  // ── Drag/pinch session state (non-rendering)
  const sessionRef = useRef({
    dragActive: false,
    dragStartX: 0, dragStartY: 0, dragOrigX: 0, dragOrigY: 0,
    pinchActive: false,
    pinchStartDist: 0, pinchStartScale: 1,
  });

  // ── Crop math state (non-rendering)
  const stateRef = useRef({
    x: 0, y: 0, scale: 1, rotation: 0, flipX: false,
    minScale: 1, maxScale: 8,
    cropSize: 272,
  });

  const clampCrop = () => {
    const s = stateRef.current;
    const { w, h } = imgNaturalRef.current;
    if (w <= 0) return;
    const halfW = (w * s.scale) / 2;
    const halfH = (h * s.scale) / 2;
    const r = s.cropSize / 2;
    const maxX = halfW - r;
    const maxY = halfH - r;
    s.x = maxX > 0 ? Math.max(-maxX, Math.min(maxX, s.x)) : 0;
    s.y = maxY > 0 ? Math.max(-maxY, Math.min(maxY, s.y)) : 0;
  };

  const syncDisplay = () => {
    const s = stateRef.current;
    setDispX(s.x);
    setDispY(s.y);
    setDispScale(s.scale);
    const range = (s.maxScale - s.minScale) * 0.5;
    const pct = range > 0 ? Math.round(100 * (s.scale - s.minScale) / range) : 0;
    setZoomPct(Math.max(0, Math.min(100, pct)));
  };

  const fitImage = () => {
    if (imgNatural.w <= 0 || imgNatural.h <= 0) return;
    const s = stateRef.current;
    const effW = (s.rotation % 180 === 0) ? imgNatural.w : imgNatural.h;
    const effH = (s.rotation % 180 === 0) ? imgNatural.h : imgNatural.w;
    const sw = s.cropSize / effW;
    const sh = s.cropSize / effH;
    s.scale = Math.max(sw, sh) * 1.05;
    s.minScale = Math.max(sw, sh);
    s.x = 0; s.y = 0;
    syncDisplay();
  };

  const setScaleFromSlider = (pct: number) => {
    const s = stateRef.current;
    const t = pct / 100;
    s.scale = s.minScale + (s.maxScale - s.minScale) * t * 0.5;
    s.scale = Math.max(s.minScale, s.scale);
    clampCrop();
    syncDisplay();
  };

  // ── stage 布局后更新 cropSize
  useEffect(() => {
    if (stageDim.w > 0 && guideSize > 0) {
      stateRef.current.cropSize = guideSize;
      if (imgNatural.w > 0) { fitImage(); }
    }
  }, [stageDim.w, stageDim.h]);

  // ── 加载图片
  useEffect(() => {
    if (!visible || !src) return;
    setImgNatural({ w: 0, h: 0 });
    imgNaturalRef.current = { w: 0, h: 0 };
    setErrMsg('');
    Image.getSize(src, (w, h) => {
      imgNaturalRef.current = { w, h };
      setImgNatural({ w, h });
    }, () => setErrMsg(t('cropFailed')));
  }, [visible, src]);

  useEffect(() => {
    if (visible && imgNatural.w > 0) { fitImage(); }
  }, [visible, imgNatural.w]);

  // ── PanResponder (修复: grant 时按 touch 数分支，不依赖之前 flag)
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const touches = e.nativeEvent.touches;
      const s = stateRef.current;
      if (touches.length >= 2) {
        // ── 双指缩放 ──
        sessionRef.current.pinchActive = true;
        sessionRef.current.pinchStartDist = Math.hypot(
          touches[0].pageX - touches[1].pageX,
          touches[0].pageY - touches[1].pageY,
        );
        sessionRef.current.pinchStartScale = s.scale;
      } else {
        // ── 单指拖动 ──
        sessionRef.current.dragActive = true;
        sessionRef.current.dragStartX = touches[0].pageX;
        sessionRef.current.dragStartY = touches[0].pageY;
        sessionRef.current.dragOrigX = s.x;
        sessionRef.current.dragOrigY = s.y;
      }
    },
    onPanResponderMove: (e) => {
      const touches = e.nativeEvent.touches;
      const s = stateRef.current;
      if (touches.length >= 2) {
        // 加入第二指后激活 pinch
        if (!sessionRef.current.pinchActive) {
          sessionRef.current.pinchActive = true;
          sessionRef.current.pinchStartDist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY,
          );
          sessionRef.current.pinchStartScale = s.scale;
        }
        const d = Math.hypot(
          touches[0].pageX - touches[1].pageX,
          touches[0].pageY - touches[1].pageY,
        );
        s.scale = Math.max(s.minScale, Math.min(s.maxScale,
          sessionRef.current.pinchStartScale * (d / sessionRef.current.pinchStartDist)));
        clampCrop();
        syncDisplay();
      } else if (touches.length === 1 && sessionRef.current.dragActive) {
        s.x = sessionRef.current.dragOrigX + (touches[0].pageX - sessionRef.current.dragStartX);
        s.y = sessionRef.current.dragOrigY + (touches[0].pageY - sessionRef.current.dragStartY);
        clampCrop();
        syncDisplay();
      }
    },
    onPanResponderRelease: () => {
      sessionRef.current.dragActive = false;
      sessionRef.current.pinchActive = false;
    },
    onPanResponderTerminate: () => {
      sessionRef.current.dragActive = false;
      sessionRef.current.pinchActive = false;
    },
  }), []);

  // ── Confirm
  const handleConfirm = async () => {
    if (confirming || imgNatural.w === 0) return;
    setConfirming(true);
    setErrMsg('');
    try {
      const s = stateRef.current;
      const outSize = 400;
      const cropSide = s.cropSize / s.scale;
      const rotatedW = s.rotation % 180 === 0 ? imgNatural.w : imgNatural.h;
      const rotatedH = s.rotation % 180 === 0 ? imgNatural.h : imgNatural.w;
      const originX = rotatedW / 2 - s.x / s.scale - cropSide / 2;
      const originY = rotatedH / 2 - s.y / s.scale - cropSide / 2;
      const cx = Math.max(0, Math.min(originX, rotatedW - cropSide));
      const cy = Math.max(0, Math.min(originY, rotatedH - cropSide));
      const cw = Math.min(cropSide, rotatedW - cx);
      const ch = Math.min(cropSide, rotatedH - cy);

      const ops: ImageManipulator.Action[] = [];
      if (s.flipX) ops.push({ flip: FlipType.Horizontal });
      if (s.rotation !== 0) ops.push({ rotate: s.rotation as any });
      ops.push({ crop: { originX: cx, originY: cy, width: cw, height: ch } });
      ops.push({ resize: { width: outSize, height: outSize } });

      const result = await ImageManipulator.manipulateAsync(src, ops, {
        compress: 0.92, format: ImageManipulator.SaveFormat.JPEG, base64: true,
      });
      if (result.base64) onConfirm(`data:image/jpeg;base64,${result.base64}`);
      else setErrMsg(t('cropFailed'));
    } catch (e) {
      console.error('crop failed', e);
      setErrMsg(t('cropFailed'));
    } finally { setConfirming(false); }
  };

  // ── Rotate / flip
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

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>{t('avatarCropTitle')}</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View
        style={styles.stageArea}
        onLayout={(e) => setStageDim({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...panResponder.panHandlers}
      >
        {imgNatural.w > 0 && stageDim.w > 0 && (
          <Image
            source={{ uri: src }}
            style={{
              position: 'absolute',
              width: imgNatural.w,
              height: imgNatural.h,
              left: stageDim.w / 2 - imgNatural.w / 2 + dispX,
              top: stageDim.h / 2 - imgNatural.h / 2 + dispY,
              transform: [
                { scale: dispScale },
                { rotate: `${rotation}deg` },
                { scaleX: flipX ? -1 : 1 },
              ],
            }}
          />
        )}

        <View style={styles.guideOverlay} pointerEvents="none">
          <Svg width={guideSize} height={guideSize}>
            <Circle cx={guideSize / 2} cy={guideSize / 2} r={guideSize / 2 - 1} stroke="rgba(255,255,255,0.8)" strokeWidth={2} fill="transparent" />
            <Line x1={0} y1={guideSize / 3} x2={guideSize} y2={guideSize / 3} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <Line x1={0} y1={(guideSize * 2) / 3} x2={guideSize} y2={(guideSize * 2) / 3} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <Line x1={guideSize / 3} y1={0} x2={guideSize / 3} y2={guideSize} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <Line x1={(guideSize * 2) / 3} y1={0} x2={(guideSize * 2) / 3} y2={guideSize} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <Path
              d={`M 0,18 L 0,0 L 18,0 M ${guideSize - 18},0 L ${guideSize},0 L ${guideSize},18 M 0,${guideSize - 18} L 0,${guideSize} L 18,${guideSize} M ${guideSize},${guideSize - 18} L ${guideSize},${guideSize} L ${guideSize - 18},${guideSize}`}
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
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={confirming}>
          <View style={styles.checkBadge}><Text style={styles.checkBadgeText}>✓</Text></View>
          <Text style={styles.confirmBtnText}>{confirming ? '处理中…' : t('useThisAvatar')}</Text>
        </TouchableOpacity>
      </View>

      {errMsg !== '' && <Text style={styles.errText}>{errMsg}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(8,8,12,0.92)', justifyContent: 'flex-start', alignItems: 'stretch' },
  header: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 20 },
  stageArea: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' },
  guideOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', bottom: 8, alignSelf: 'center', left: '50%', transform: [{ translateX: -75 }], backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  pillText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  toolbar: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  zoomEdge: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  zoomEdgeSmall: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  divider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 10 },
  toolBtn: { paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  toolIcon: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  toolLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  actions: { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  confirmBtn: { flex: 2, padding: 11, borderRadius: 12, backgroundColor: '#5B5BD6', justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  checkBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  checkBadgeText: { fontSize: 10, color: '#fff' },
  errText: { fontSize: 12, color: '#ef4444', textAlign: 'center', paddingBottom: 8, fontWeight: '500' },
});
