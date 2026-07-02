// ═══════════════════════════════════════════════════════════════
// ModalOverlay — 全屏遮罩 + 居中弹窗(对齐 web createPortal 行为)
// ═══════════════════════════════════════════════════════════════
//
// web 用 createPortal(..., document.body) 把弹窗渲染到 body 直接子元素,
// absolute 定位 top/left/right/bottom: 0 覆盖整个 window。
//
// iOS 改用 RN 原生 <Modal transparent> 包装,等价于 web portal 行为:
//   - 原生 UIView 渲染在 app 最顶层,覆盖 status bar + bottom 安全区
//   - transparent=true 自己画遮罩,不破坏内层样式
//   - animationType="none" 由我们 Animated 接管进出动画
//   - statusBarTranslucent 让 status bar 也被遮罩覆盖
//
// 背景色对齐 web:rgba(20,18,16,0.65)(原 iOS 是 #000 + opacity 0.8)。

import { Modal, View, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef, useState } from 'react';

interface ModalOverlayProps {
  visible?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  overlayStyle?: any;
  contentStyle?: any;
  /** 动画类型:'slide' 默认顶部滑入、'springScale' 弹性缩放、'blurMorph' 模糊渐显 */
  animation?: 'slide' | 'springScale' | 'blurMorph';
}

/** Uniform animated modal overlay used by all modals across the app. */
export default function ModalOverlay({ visible = true, onClose, children, overlayStyle, contentStyle, animation = 'slide' }: ModalOverlayProps) {
  const [show, setShow] = useState(false);
  const initialSlide = animation === 'springScale' ? 12 : -300;
  const initialScale = animation === 'springScale' ? 0.85 : animation === 'blurMorph' ? 1.04 : 1;
  const slide = useRef(new Animated.Value(initialSlide)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(initialScale)).current;

  useEffect(() => {
    if (visible) {
      setShow(true);
      if (animation === 'springScale') {
        scale.setValue(0.85);
        slide.setValue(12);
        fade.setValue(0);
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 8, speed: 14 }),
          Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 8, speed: 14 }),
          Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
      } else if (animation === 'blurMorph') {
        scale.setValue(1.04);
        fade.setValue(0);
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]).start();
      } else {
        slide.setValue(-300);
        fade.setValue(0);
        Animated.parallel([
          Animated.spring(slide, { toValue: 0, useNativeDriver: false, bounciness: 4, speed: 14 }),
          Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: false }),
        ]).start();
      }
    } else if (show) {
      if (animation === 'springScale') {
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.92, duration: 220, useNativeDriver: true }),
          Animated.timing(slide, { toValue: 8, duration: 220, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start(() => setShow(false));
      } else if (animation === 'blurMorph') {
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.97, duration: 250, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setShow(false));
      } else {
        Animated.parallel([
          Animated.timing(slide, { toValue: -300, duration: 180, useNativeDriver: false }),
          Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: false }),
        ]).start(() => setShow(false));
      }
    }
  }, [visible]);

  if (!show) return null;

  const getTrans = () => {
    if (animation === 'springScale') return [{ scale }, { translateY: slide }];
    if (animation === 'blurMorph') return [{ scale }];
    return [{ translateY: slide }];
  };

  return (
    <Modal
      visible={show}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[{ flex: 1 }, { opacity: fade }, overlayStyle]}>
        <TouchableOpacity
          activeOpacity={1}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,18,16,0.65)' }}
          onPress={onClose}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }} pointerEvents="box-none">
          <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, contentStyle, { transform: getTrans() }]}>
            {children}
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}