import { ENTER_DURATION, EXIT_DURATION } from '../theme';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, View } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: (close: () => void) => React.ReactNode;
  top?: number;
  /** Position in page stack — used for zIndex layering */
  stackIndex?: number;
  /** True for topmost page — pointer-events: none when false */
  isTop?: boolean;
  /** Optional background color. Omit for transparent. */
  backgroundColor?: string;
}

type Phase = 'enter' | 'idle' | 'exit' | 'hidden';

/**
 * iOS-style push/pop wrapper — slides in from right, slides out to right.
 * Mirrors the web SlideScreen semantics (CSS keyframes -> Animated.timing).
 * Usage:
 *   <SlideScreen visible={show} onClose={() => setShow(false)}>
 *     {(onBack) => <SomeScreen onBack={onBack} />}
 *   </SlideScreen>
 */
export default function SlideScreen({
  visible, onClose, children,
  top = 0, stackIndex = 0, isTop = true,
  backgroundColor,
}: Props) {
  const screenWidth = Dimensions.get('window').width;
  const [phase, setPhase] = useState<Phase>('hidden');
  const translateX = useRef(new Animated.Value(screenWidth)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const zIndex = 100 + stackIndex * 10;

  // ── visible → enter / !visible → exit ──
  useEffect(() => {
    if (visible) {
      setPhase('enter');
      translateX.setValue(screenWidth);
      Animated.timing(translateX, {
        toValue: 0,
        duration: ENTER_DURATION,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => setPhase(p => (p === 'enter' ? 'idle' : p)), ENTER_DURATION);
      return () => clearTimeout(timer.current);
    }
    if (phase === 'enter' || phase === 'idle') {
      setPhase('exit');
      translateX.setValue(0);
      Animated.timing(translateX, {
        toValue: screenWidth,
        duration: EXIT_DURATION,
        easing: Easing.bezier(0.55, 0.055, 0.675, 0.19),
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => {
        setPhase('hidden');
        onClose();
      }, EXIT_DURATION);
      return () => clearTimeout(timer.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = useCallback(() => {
    if (phase === 'exit' || phase === 'hidden') return;
    setPhase('exit');
    translateX.setValue(0);
    Animated.timing(translateX, {
      toValue: screenWidth,
      duration: EXIT_DURATION,
      easing: Easing.bezier(0.55, 0.055, 0.675, 0.19),
      useNativeDriver: true,
    }).start();
    timer.current = setTimeout(() => {
      setPhase('hidden');
      onClose();
    }, EXIT_DURATION);
  }, [phase, onClose, translateX, screenWidth]);

  if (phase === 'hidden') return null;

  return (
    <Animated.View
      pointerEvents={isTop ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex,
        backgroundColor: backgroundColor || 'transparent',
        transform: [{ translateX }],
      }}
    >
      <View style={{ flex: 1, flexDirection: 'column' }}>
        {children(close)}
      </View>
    </Animated.View>
  );
}
