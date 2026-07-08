// ═══════════════════════════════════════════════════════════════
// CropModal — 头像裁剪 modal(RN 版,对应 web PartnerScreen 的 inline crop modal)
// ═══════════════════════════════════════════════════════════════
//
// 功能对齐 web 的 createPortal crop modal:
//   - 圆形裁剪框(stageSize * 0.76)
//   - 单指拖动 / 双指缩放(PanResponder)
//   - 旋转 +90° / 水平翻转(按钮触发)
//   - 滑块控制缩放
//   - 确认时调 expo-image-manipulator 做旋转 + flip + crop + resize,
//     输出 400x400 jpeg base64
//
// 实现差异 vs web:
//   - web 用 HTMLCanvas + mouse/touch/wheel event;RN 用 PanResponder + Animated
//   - web 的引导圆圈用 div+borderRadius overlay;RN 用 react-native-svg overlay
//   - web 用 createPortal;RN 用绝对定位 overlay
//   - 图片全尺寸渲染在 stage 区域,引导圆圈只是视觉 overlay(不对齐 web 的 canvas clip)

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, PanResponder, Animated, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import * as ImageManipulator from 'expo-image-manipulator';
const { FlipType } = ImageManipulator;
import { useAvatarCrop } from '../hooks/useAvatarCrop';

interface CropModalProps {
  visible: boolean;
  src: string;                  // 本地 URI
  onConfirm: (dataUri: string) => void;  // data:image/jpeg;base64,...
  onCancel: () => void;
}

const STAGE_PAD_H = 16;

export default function CropModal({ visible, src, onConfirm, onCancel }: CropModalProps) {
  const { width: WIN_W } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [zoomPct, setZoomPct] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [stageDim, setStageDim] = useState({ w: 0, h: 0 });
  // guideSize = 圆形引导框直径,对齐 web: min(stageW,stageH) * 0.76
  const guideSize = !stageDim.w ? WIN_W - STAGE_PAD_H * 2 : Math.round(Math.min(stageDim.w, stageDim.h) * 0.76);

  const crop = useAvatarCrop({
    stageSize: guideSize,
    imgWidth: imgNatural.w,
    imgHeight: imgNatural.h,
  });

  // ── stage 布局后,更新 hook 内的 cropSize(对齐 web 动态 cropSize)──
  useEffect(() => {
    if (stageDim.w > 0 && guideSize > 0) {
      crop.stateRef.cropSize = guideSize;
      if (imgNatural.w > 0) {
        crop.fitImage();
        setZoomPct(crop.getScalePct());
      }
    }
  }, [stageDim.w, stageDim.h]);

  // ── 加载图片自然尺寸 ──
  useEffect(() => {
    if (!visible || !src) return;
    setImgNatural({ w: 0, h: 0 });
    setErrMsg('');
    Image.getSize(src, (w, h) => setImgNatural({ w, h }), () => {
      setErrMsg('图片加载失败');
    });
  }, [visible, src]);

  // ── 图片尺寸拿到后,初始化 fit ──
  useEffect(() => {
    if (visible && imgNatural.w > 0) {
      crop.fitImage();
      setZoomPct(crop.getScalePct());
    }
  }, [visible, imgNatural.w]);

  // ── PanResponder:单指拖动 + 双指缩放 ── (rebuild when image dimensions load)
  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        if (imgNatural.w === 0) return;
        const touches = e.nativeEvent.touches;
        if (touches.length === 1) {
          crop.stateRef.drag.active = true;
          crop.stateRef.drag.sx = touches[0].pageX;
          crop.stateRef.drag.sy = touches[0].pageY;
          crop.stateRef.drag.ox = crop.stateRef.x;
          crop.stateRef.drag.oy = crop.stateRef.y;
        } else if (touches.length === 2) {
          crop.stateRef.pinch.active = true;
          crop.stateRef.pinch.startDist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY,
          );
          crop.stateRef.pinch.startScale = crop.stateRef.scale;
          crop.stateRef.pinch.midX = (touches[0].pageX + touches[1].pageX) / 2;
          crop.stateRef.pinch.midY = (touches[0].pageY + touches[1].pageY) / 2;
        }
      },
      onPanResponderMove: (e) => {
        if (imgNatural.w === 0) return;
        const touches = e.nativeEvent.touches;
        if (touches.length === 1 && crop.stateRef.drag.active) {
          crop.stateRef.x = crop.stateRef.drag.ox + (touches[0].pageX - crop.stateRef.drag.sx);
          crop.stateRef.y = crop.stateRef.drag.oy + (touches[0].pageY - crop.stateRef.drag.sy);
          crop.translateX.setValue(crop.stateRef.x);
          crop.translateY.setValue(crop.stateRef.y);
          crop.clampCrop();
        } else if (touches.length === 2 && crop.stateRef.pinch.active) {
          const d = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY,
          );
          const ns = Math.max(
            crop.stateRef.minScale,
            Math.min(crop.stateRef.maxScale, crop.stateRef.pinch.startScale * (d / crop.stateRef.pinch.startDist)),
          );
          crop.stateRef.scale = ns;
          crop.scaleAnim.setValue(ns);
          crop.clampCrop();
          setZoomPct(crop.getScalePct());
        }
      },
      onPanResponderRelease: () => {
        crop.stateRef.drag.active = false;
        crop.stateRef.pinch.active = false;
      },
      onPanResponderTerminate: () => {
        crop.stateRef.drag.active = false;
        crop.stateRef.pinch.active = false;
      },
    }),
    [imgNatural.w],
  );

  // ── 确认:实际裁剪 ──
  const handleConfirm = async () => {
    if (confirming || imgNatural.w === 0) return;
    setConfirming(true);
    setErrMsg('');
    try {
      const s = crop.stateRef;
      const outSize = 400;
      const cropSide = s.cropSize / s.scale; // 原图坐标下裁剪边长
      const rotatedW = s.rotation % 180 === 0 ? imgNatural.w : imgNatural.h;
      const rotatedH = s.rotation % 180 === 0 ? imgNatural.h : imgNatural.w;
      // 裁剪框中心在旋转后图片坐标系 = 图片中心 + (-translateX/scale, -translateY/scale)
      // 图片中心在原图坐标 = (rotatedW/2, rotatedH/2)
      const originX = rotatedW / 2 - s.x / s.scale - cropSide / 2;
      const originY = rotatedH / 2 - s.y / s.scale - cropSide / 2;
      // clamp 到合法范围
      const cx = Math.max(0, Math.min(originX, rotatedW - cropSide));
      const cy = Math.max(0, Math.min(originY, rotatedH - cropSide));
      const cw = Math.min(cropSide, rotatedW - cx);
      const ch = Math.min(cropSide, rotatedH - cy);

      const ops: ImageManipulator.Action[] = [];
      if (s.flipX) ops.push({ flip: FlipType.Horizontal });
      if (s.rotation !== 0) ops.push({ rotate: s.rotation });
      ops.push({ crop: { originX: cx, originY: cy, width: cw, height: ch } });
      ops.push({ resize: { width: outSize, height: outSize } });

      const result = await ImageManipulator.manipulateAsync(src, ops, {
        compress: 0.92,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      if (result.base64) {
        onConfirm(`data:image/jpeg;base64,${result.base64}`);
      } else {
        setErrMsg('裁切失败,请重试');
      }
    } catch (e) {
      console.error('crop failed', e);
      setErrMsg('裁切失败,请重试');
    } finally {
      setConfirming(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>调整头像</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Stage area — image fills the space, guide circle is an overlay (aligns web approach) */}
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
                { translateX: crop.translateX },
                { translateY: crop.translateY },
                { scale: crop.scaleAnim },
                { rotate: `${crop.rotation}deg` },
                { scaleX: crop.flipX ? -1 : 1 },
              ],
            }}
          />
        )}
        {/* Guide circle overlay — visual indicator, no clip */}
        <View style={styles.guideOverlay} pointerEvents="none">
          <Svg
            width={guideSize}
            height={guideSize}
          >
            {/* 外圆 */}
            <Circle cx={guideSize / 2} cy={guideSize / 2} r={guideSize / 2 - 1} stroke="rgba(255,255,255,0.8)" strokeWidth={2} fill="transparent" />
            {/* 三分线 */}
            <Line x1={0} y1={guideSize / 3} x2={guideSize} y2={guideSize / 3} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <Line x1={0} y1={(guideSize * 2) / 3} x2={guideSize} y2={(guideSize * 2) / 3} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <Line x1={guideSize / 3} y1={0} x2={guideSize / 3} y2={guideSize} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <Line x1={(guideSize * 2) / 3} y1={0} x2={(guideSize * 2) / 3} y2={guideSize} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            {/* 四角把手(L 形,对齐 web border 拼法) */}
            <Path
              d={`M 0,16 L 0,0 L 16,0 M ${guideSize-16},0 L ${guideSize},0 L ${guideSize},16 M 0,${guideSize-16} L 0,${guideSize} L 16,${guideSize} M ${guideSize},${guideSize-16} L ${guideSize},${guideSize} L ${guideSize-16},${guideSize}`}
              stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
              fill="transparent" opacity={0.9}
            />
          </Svg>
        </View>
        {/* Hint pill */}
        <View style={styles.pill} pointerEvents="none">
          <Text style={styles.pillText}>拖动移动 · 双指缩放</Text>
        </View>
      </View>

      {/* Toolbar:slider + 旋转 + 翻转 */}
      <View style={styles.toolbar}>
        <View style={styles.zoomRow}>
          <Text style={styles.zoomEdge}>A</Text>
          {/* 用 RN View 模拟滑块,避免 react-native-community/slider 新依赖 */}
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${zoomPct}%` }]} />
            <View style={[styles.sliderThumb, { left: `${zoomPct}%` }]} />
            <View
              style={StyleSheet.absoluteFill}
              {...{
                onStartShouldSetResponder: () => true,
                onMoveShouldSetResponder: () => true,
                onResponderGrant: (e: any) => updateZoomFromX(e.nativeEvent.locationX),
                onResponderMove: (e: any) => updateZoomFromX(e.nativeEvent.locationX),
              }}
            />
          </View>
          <Text style={styles.zoomEdge}>A</Text>
        </View>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.toolBtn} onPress={() => { crop.rotate90(); setZoomPct(crop.getScalePct()); }}>
          <Text style={styles.toolIcon}>↻</Text>
          <Text style={styles.toolLabel}>旋转</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={crop.toggleFlip}>
          <Text style={styles.toolIcon}>⇋</Text>
          <Text style={styles.toolLabel}>翻转</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={confirming}>
          <View style={styles.checkBadge}>
            <Text style={styles.checkBadgeText}>✓</Text>
          </View>
          <Text style={styles.confirmBtnText}>{confirming ? '处理中…' : '使用此头像'}</Text>
        </TouchableOpacity>
      </View>

      {errMsg !== '' && (
        <Text style={styles.errText}>{errMsg}</Text>
      )}
    </View>
  );

  // 滑块点击/拖动更新缩放
  function updateZoomFromX(localX: number) {
    const pct = Math.max(0, Math.min(100, (localX / 200) * 100));
    crop.setScale(pct);
    setZoomPct(crop.getScalePct());
  }
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
    backgroundColor: 'rgba(8,8,12,0.92)', justifyContent: 'flex-start', alignItems: 'stretch',
  },
  header: {
    paddingHorizontal: 16, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { fontSize: 14, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 20 },

  stageArea: {
    flex: 1, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', position: 'relative',
  },
  guideOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  pill: {
    position: 'absolute', bottom: 8, alignSelf: 'center',
    left: '50%', transform: [{ translateX: -75 }],
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  pillText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },

  toolbar: {
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  zoomEdge: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  sliderTrack: {
    flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2, position: 'relative',
  },
  sliderFill: {
    position: 'absolute', top: 0, left: 0, height: '100%',
    backgroundColor: '#5B5BD6', borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute', top: -5, width: 13, height: 13,
    marginLeft: -6.5, borderRadius: 6.5,
    backgroundColor: '#fff',
  },
  divider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 10 },
  toolBtn: {
    paddingVertical: 6, paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  toolIcon: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  toolLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  actions: {
    paddingTop: 10, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row', gap: 10,
  },
  cancelBtn: {
    flex: 1, padding: 11, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  confirmBtn: {
    flex: 2, padding: 11, borderRadius: 12, backgroundColor: '#5B5BD6',
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  checkBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 6,
  },
  checkBadgeText: { fontSize: 10, color: '#fff' },
  errText: {
    fontSize: 12, color: '#ef4444', textAlign: 'center',
    paddingBottom: 8, fontWeight: '500',
  },
});