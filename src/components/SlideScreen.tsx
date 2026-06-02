import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Dimensions, Easing } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: (close: () => void) => React.ReactNode;
}

/**
 * iOS-style push/pop wrapper — slides in from right, slides out to left.
 * Usage:
 *   <SlideScreen visible={show} onClose={() => setShow(false)}>
 *     {(onBack) => <SomeScreen onBack={onBack} />}
 *   </SlideScreen>
 */
export default function SlideScreen({ visible, onClose, children }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [render, setRender] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  // In / Out
  useEffect(() => {
    if (visible) {
      setRender(true);
      translateX.setValue(screenWidth);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (render) {
      // Animate out when parent sets visible=false
      Animated.timing(translateX, {
        toValue: screenWidth,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setRender(false);
        onClose();
      });
    }
  }, [visible, screenWidth]);

  // Out
  const close = useCallback(() => {
    Animated.timing(translateX, {
      toValue: screenWidth,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setRender(false);
      onClose();
    });
  }, [onClose, screenWidth]);

  if (!render) return null;

  return (
    <Animated.View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      transform: [{ translateX }],
      zIndex: 100,
    }}>
      {children(close)}
    </Animated.View>
  );
}
