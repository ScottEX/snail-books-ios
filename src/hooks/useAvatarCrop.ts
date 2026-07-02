// ═══════════════════════════════════════════════════════════════
// useAvatarCrop — RN 版头像裁剪逻辑 hook
// ═══════════════════════════════════════════════════════════════
//
// 对应 web 的 useCropCanvas.ts,但 RN 没有 HTMLCanvasElement/mouse/touch/wheel
// 事件,改为 PanResponder + Animated.Value + 手写数学计算。
//
// 本 hook 只负责状态 + 数学 + 控制函数,不绑定任何 View 的 gesture。
// PanResponder 实现在 CropModal 里(因为需要 View ref)。
//
// 用法(在 CropModal 内部):
//   const {
//     translateX, translateY, scale,
//     rotation, flipX,
//     stateRef,
//     fitImage, clampCrop, setScale,
//     rotate90, toggleFlip,
//   } = useAvatarCrop(src, stageSize, imgNatural);
//   // PanResponder 实现见 CropModal
//   // 确认时:用 stateRef.current + image 自然尺寸算出 crop 区域,
//   //         调 expo-image-manipulator 输出 400x400 jpeg base64。

import { useRef, useState } from 'react';
import { Animated } from 'react-native';

export interface AvatarCropState {
  x: number;
  y: number;
  scale: number;
  rotation: number; // 0/90/180/270
  flipX: boolean;
  minScale: number;
  maxScale: number;
  cropSize: number; // 圆形裁剪框直径
  drag: { active: boolean; sx: number; sy: number; ox: number; oy: number };
  pinch: { active: boolean; startDist: number; startScale: number; midX: number; midY: number };
}

interface UseAvatarCropOpts {
  /** 容器(舞台)边长,正方形。圆形裁剪框 = stageSize * 0.76 */
  stageSize: number;
  /** 原图自然宽高(已加载完成后由 CropModal 传入) */
  imgWidth: number;
  imgHeight: number;
}

export function useAvatarCrop({ stageSize, imgWidth, imgHeight }: UseAvatarCropOpts) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 用 React state 让 rotate/flip 触发 CropModal re-render
  const [rotation, setRotationState] = useState(0);
  const [flipX, setFlipXState] = useState(false);

  // 数学状态全在 ref 里,不触发 render(高频更新)
  const stateRef = useRef<AvatarCropState>({
    x: 0, y: 0, scale: 1, rotation: 0, flipX: false,
    minScale: 1, maxScale: 8,
    cropSize: Math.round(stageSize * 0.76),
    drag: { active: false, sx: 0, sy: 0, ox: 0, oy: 0 },
    pinch: { active: false, startDist: 0, startScale: 1, midX: 0, midY: 0 },
  }).current;

  // 限制平移,使图片永远覆盖圆形裁剪框
  const clampCrop = () => {
    const s = stateRef;
    const halfW = (imgWidth * s.scale) / 2;
    const halfH = (imgHeight * s.scale) / 2;
    const r = s.cropSize / 2;
    const maxX = halfW - r;
    const maxY = halfH - r;
    s.x = maxX > 0 ? Math.max(-maxX, Math.min(maxX, s.x)) : 0;
    s.y = maxY > 0 ? Math.max(-maxY, Math.min(maxY, s.y)) : 0;
    translateX.setValue(s.x);
    translateY.setValue(s.y);
  };

  // 初始化:图片适应裁剪框(留 5% 边距)
  const fitImage = () => {
    if (imgWidth <= 0 || imgHeight <= 0) return;
    const s = stateRef;
    // 考虑旋转 90° 的情况:用 max(w,h) 作为基准
    const effW = (s.rotation % 180 === 0) ? imgWidth : imgHeight;
    const effH = (s.rotation % 180 === 0) ? imgHeight : imgWidth;
    const sw = s.cropSize / effW;
    const sh = s.cropSize / effH;
    s.scale = Math.max(sw, sh) * 1.05;
    s.minScale = Math.max(sw, sh);
    s.x = 0; s.y = 0;
    translateX.setValue(0);
    translateY.setValue(0);
    scaleAnim.setValue(s.scale);
  };

  // 滑块设缩放(pct 0-100)
  const setScale = (pct: number) => {
    const s = stateRef;
    const t = pct / 100;
    s.scale = s.minScale + (s.maxScale - s.minScale) * t * 0.5;
    s.scale = Math.max(s.minScale, s.scale);
    scaleAnim.setValue(s.scale);
    clampCrop();
  };

  // 滑块当前位置(0-100)
  const getScalePct = (): number => {
    const s = stateRef;
    const range = (s.maxScale - s.minScale) * 0.5;
    if (range <= 0) return 0;
    const t = (s.scale - s.minScale) / range;
    return Math.max(0, Math.min(100, t * 100));
  };

  // 旋转 +90
  const rotate90 = () => {
    const s = stateRef;
    s.rotation = (s.rotation + 90) % 360;
    setRotationState(s.rotation);
    // 旋转后重新计算 minScale
    fitImage();
  };

  // 翻转 X
  const toggleFlip = () => {
    const s = stateRef;
    s.flipX = !s.flipX;
    setFlipXState(s.flipX);
  };

  return {
    translateX,
    translateY,
    scaleAnim,
    rotation,
    flipX,
    stateRef,
    fitImage,
    clampCrop,
    setScale,
    getScalePct,
    rotate90,
    toggleFlip,
  };
}