// ═══════════════════════════════════════════════════════════════
// ModalOverlay — 全屏遮罩 + 动画弹窗 (对齐 web)
// ═══════════════════════════════════════════════════════════════

import { Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { BACKDROP_COLOR } from '../theme';

interface ModalOverlayProps {
  visible?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  overlayStyle?: any;
  contentStyle?: any;
  /** 动画类型：'slide' 默认顶部滑入、'springScale' 弹性缩放、'blurMorph' 模糊渐显、'slideUpScale' 底部滑入缩放 */
  animation?: 'slide' | 'springScale' | 'blurMorph' | 'slideUpScale';
}

/** Uniform animated modal overlay used by all modals across the app. */
export default function ModalOverlay({ visible = true, onClose, children, overlayStyle, contentStyle, animation = 'slide' }: ModalOverlayProps) {
  const [show, setShow] = useState(false);
  const initialSlide = animation === 'springScale' ? 12 : animation === 'slideUpScale' ? 1 : -300;
  const initialScale = animation === 'springScale' ? 0.85 : animation === 'blurMorph' ? 1.04 : animation === 'slideUpScale' ? 0.96 : 1;
  const slide = useRef(new Animated.Value(initialSlide)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(initialScale)).current;
  const back = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShow(true);
      back.setValue(0);
      if (animation === 'springScale') {
        scale.setValue(0.85);
        slide.setValue(12);
        fade.setValue(0);
        Animated.parallel([
          Animated.timing(back, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 8, speed: 14 }),
          Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 8, speed: 14 }),
          Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
      } else if (animation === 'blurMorph') {
        scale.setValue(1.04);
        fade.setValue(0);
        Animated.parallel([
          Animated.timing(back, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]).start();
      } else if (animation === 'slideUpScale') {
        slide.setValue(1);
        scale.setValue(0.96);
        fade.setValue(0);
        Animated.parallel([
          Animated.timing(back, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(slide, { toValue: 0, duration: 420, easing: Easing.bezier(0.32, 0.94, 0.36, 1.02), useNativeDriver: false }),
          Animated.timing(scale, { toValue: 1, duration: 420, easing: Easing.bezier(0.32, 0.94, 0.36, 1.02), useNativeDriver: false }),
          Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: false }),
        ]).start();
      } else {
        slide.setValue(-300);
        fade.setValue(0);
        Animated.parallel([
          Animated.timing(back, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.spring(slide, { toValue: 0, useNativeDriver: false, bounciness: 4, speed: 14 }),
          Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: false }),
        ]).start();
      }
    } else if (show) {
      const backOut = Animated.sequence([
        Animated.delay(50),
        Animated.timing(back, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]);
      if (animation === 'springScale') {
        Animated.parallel([
          backOut,
          Animated.timing(scale, { toValue: 0.92, duration: 220, useNativeDriver: true }),
          Animated.timing(slide, { toValue: 8, duration: 220, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start(() => setShow(false));
      } else if (animation === 'blurMorph') {
        Animated.parallel([
          backOut,
          Animated.timing(scale, { toValue: 0.97, duration: 250, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setShow(false));
      } else if (animation === 'slideUpScale') {
        Animated.parallel([
          backOut,
          Animated.timing(slide, { toValue: 1, duration: 280, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: false }),
          Animated.timing(scale, { toValue: 0.96, duration: 280, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: false }),
          Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: false }),
        ]).start(() => setShow(false));
      } else {
        Animated.parallel([
          backOut,
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
    if (animation === 'slideUpScale') return [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }, { scale }];
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
      <Animated.View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, overlayStyle]}>
        <TouchableOpacity
          activeOpacity={1}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
        >
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BACKDROP_COLOR, opacity: back }} />
        </TouchableOpacity>
        <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, contentStyle, { opacity: fade, transform: getTrans() }]}>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
