// ═══════════════════════════════════════════════════════════════
// ModalOverlay — 全屏遮罩 + 动画弹窗 (对齐 web)
// ═══════════════════════════════════════════════════════════════

import { Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { useEffect, useRef, useState, useMemo } from 'react';
import { BACKDROP_COLOR } from '../theme';

interface ModalOverlayProps {
  visible?: boolean;
  onClose: () => void;
  onClosed?: () => void;
  children: React.ReactNode | ((staggerAnims: Animated.Value[]) => React.ReactNode);
  overlayStyle?: any;
  contentStyle?: any;
  animation?: 'slide' | 'springScale' | 'blurMorph' | 'slideUpScale' | 'stagger' | 'iosSheet';
  staggerCount?: number;
  /** Override dismiss animation duration for springScale (ms). Omit for default. */
  outDuration?: number;
  /** Override backdrop color. Defaults to BACKDROP_COLOR. */
  backdropColor?: string;
}

export default function ModalOverlay({ visible = true, onClose, onClosed, children, overlayStyle, contentStyle, animation = 'slide', staggerCount = 4, outDuration, backdropColor }: ModalOverlayProps) {
  const [show, setShow] = useState(false);
  const initialSlide = animation === 'springScale' ? 12 : animation === 'slideUpScale' ? 500 : animation === 'stagger' ? 40 : animation === 'iosSheet' ? 500 : -300;
  const initialScale = animation === 'springScale' ? 0.85 : animation === 'blurMorph' ? 1.04 : animation === 'slideUpScale' ? 0.96 : animation === 'stagger' ? 0.94 : 1;
  const slide = useRef(new Animated.Value(initialSlide)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(initialScale)).current;
  const back = useRef(new Animated.Value(0)).current;

  // Stagger child anims: one Animated.Value per child item
  const staggerAnims = useMemo(
    () => (animation === 'stagger' ? Array.from({ length: staggerCount }, () => new Animated.Value(0)) : []),
    [animation, staggerCount],
  );

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
          Animated.spring(scale, { toValue: 1, useNativeDriver: false, bounciness: 8, speed: 14 }),
          Animated.spring(slide, { toValue: 0, useNativeDriver: false, bounciness: 8, speed: 14 }),
          Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: false }),
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
        slide.setValue(500);
        scale.setValue(0.96);
        fade.setValue(0);
        Animated.parallel([
          Animated.timing(back, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(slide, { toValue: 0, duration: 420, easing: Easing.bezier(0.32, 0.94, 0.36, 1.02), useNativeDriver: false }),
          Animated.timing(scale, { toValue: 1, duration: 420, easing: Easing.bezier(0.32, 0.94, 0.36, 1.02), useNativeDriver: false }),
          Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: false }),
        ]).start();
      } else if (animation === 'stagger') {
        slide.setValue(40);
        scale.setValue(0.94);
        fade.setValue(0);
        staggerAnims.forEach(a => a.setValue(0));
        Animated.parallel([
          Animated.timing(back, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(slide, { toValue: 0, duration: 400, easing: Easing.bezier(0.22, 0.88, 0.4, 1), useNativeDriver: false }),
          Animated.timing(scale, { toValue: 1, duration: 400, easing: Easing.bezier(0.22, 0.88, 0.4, 1), useNativeDriver: false }),
          Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.sequence([
            Animated.delay(80),
            Animated.stagger(
              60,
              staggerAnims.map(a =>
                Animated.timing(a, { toValue: 1, duration: 350, easing: Easing.bezier(0.22, 0.88, 0.4, 1), useNativeDriver: false }),
              ),
            ),
          ]),
        ]).start();
      } else if (animation === 'iosSheet') {
        slide.setValue(500);
        fade.setValue(1); // 纯位移，不淡入
        Animated.parallel([
          Animated.timing(back, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(slide, { toValue: 0, duration: 450, easing: Easing.bezier(0.2, 0.9, 0.25, 1), useNativeDriver: true }),
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
        const d = outDuration;
        Animated.parallel([
          d != null ? Animated.timing(back, { toValue: 0, duration: d, useNativeDriver: false }) : backOut,
          Animated.timing(scale, { toValue: 0.92, duration: d ?? 220, useNativeDriver: false }),
          Animated.timing(slide, { toValue: 8, duration: d ?? 220, useNativeDriver: false }),
          Animated.timing(fade, { toValue: 0, duration: d ?? 180, useNativeDriver: false }),
        ]).start(() => { setShow(false); onClosed?.(); });
      } else if (animation === 'blurMorph') {
        Animated.parallel([
          backOut,
          Animated.timing(scale, { toValue: 0.97, duration: 250, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => { setShow(false); onClosed?.(); });
      } else if (animation === 'slideUpScale') {
        Animated.parallel([
          backOut,
          Animated.timing(slide, { toValue: 500, duration: 280, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: false }),
          Animated.timing(scale, { toValue: 0.96, duration: 280, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: false }),
          Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: false }),
        ]).start(() => { setShow(false); onClosed?.(); });
      } else if (animation === 'stagger') {
        Animated.parallel([
          backOut,
          Animated.timing(slide, { toValue: 40, duration: 220, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: false }),
          Animated.timing(scale, { toValue: 0.97, duration: 220, useNativeDriver: false }),
          Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: false }),
        ]).start(() => { setShow(false); onClosed?.(); });
      } else if (animation === 'iosSheet') {
        Animated.parallel([
          backOut,
          Animated.timing(slide, { toValue: 500, duration: 300, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: true }),
        ]).start(() => { setShow(false); onClosed?.(); });
      } else {
        Animated.parallel([
          backOut,
          Animated.timing(slide, { toValue: -300, duration: 180, useNativeDriver: false }),
          Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: false }),
        ]).start(() => { setShow(false); onClosed?.(); });
      }
    }
  }, [visible]);

  if (!show) return null;

  const getTrans = () => {
    if (animation === 'springScale') return [{ scale }, { translateY: slide }];
    if (animation === 'blurMorph') return [{ scale }];
    if (animation === 'slideUpScale') return [{ translateY: slide }, { scale }];
    if (animation === 'stagger') return [{ translateY: slide }, { scale }];
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
      <Animated.View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }, overlayStyle]}>
        <TouchableOpacity
          activeOpacity={1}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
        >
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: backdropColor ?? BACKDROP_COLOR, opacity: back }} />
        </TouchableOpacity>
        <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, contentStyle, { opacity: fade, transform: getTrans() }]}>
          {animation === 'stagger' && typeof children === 'function' ? children(staggerAnims) : (children as React.ReactNode)}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
