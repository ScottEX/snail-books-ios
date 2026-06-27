import { Animated } from 'react-native';
import { useEffect, useRef } from 'react';

/** Fade-in + slide-up animation wrapper (300ms). */
export default function FadeInView({ children, style }: {
  children: React.ReactNode; style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
