import { View, TouchableOpacity, Animated } from 'react-native';
import { MODAL_BACKDROP_OPACITY } from '../theme';
import { useEffect, useRef, useState } from 'react';

interface ModalOverlayProps {
  visible?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  overlayStyle?: any;
  contentStyle?: any;
}

/** Uniform spring-animated modal overlay used by all modals across the app. */
export default function ModalOverlay({ visible = true, onClose, children, overlayStyle, contentStyle }: ModalOverlayProps) {
  const [show, setShow] = useState(false);
  const slide = useRef(new Animated.Value(-300)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShow(true);
      slide.setValue(-300);
      fade.setValue(0);
      Animated.parallel([
        Animated.spring(slide, { toValue: 0, useNativeDriver: false, bounciness: 4, speed: 14 }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
    } else if (show) {
      Animated.parallel([
        Animated.timing(slide, { toValue: -300, duration: 180, useNativeDriver: false }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: false }),
      ]).start(() => setShow(false));
    }
  }, [visible]);

  if (!show) return null;

  return (
    <Animated.View style={[{ position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, justifyContent: 'center', alignItems: 'center', padding: 16 }, { opacity: fade }, overlayStyle]}>
      <TouchableOpacity activeOpacity={1} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', opacity: MODAL_BACKDROP_OPACITY }} onPress={onClose} />
      <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, contentStyle, { transform: [{ translateY: slide }] }]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}
