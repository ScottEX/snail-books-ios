import { View, TouchableOpacity, Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { BACKDROP_COLOR } from '../theme';

interface FilterPanelProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function FilterPanel({ visible, onClose, children, style }: FilterPanelProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const st = getStyles();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 170,
        friction: 26,
      }).start();
    } else if (mounted) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible, anim, mounted]);

  const close = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setMounted(false);
      onClose();
    });
  };

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[st.backdrop, { opacity: anim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={{
          position: 'absolute' as any,
          top: 100,
          left: 12,
          right: 12,
          zIndex: 9999,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        }}
      >
        <BlurView intensity={45} tint="dark" style={[st.panel, style]}>
          <View style={st.content}>
            {children}
          </View>
        </BlurView>
      </Animated.View>
    </>
  );
}

const getStyles = () =>
  StyleSheet.create({
    backdrop: {
      position: 'absolute' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: BACKDROP_COLOR,
      zIndex: 9998,
    },
    panel: {
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    content: {
      padding: 16,
      gap: 8,
    },
  });
