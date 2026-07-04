import React, { useState, useEffect, useRef } from 'react';
import { Animated, Modal, TouchableOpacity, ViewStyle } from 'react-native';
import { BACKDROP_COLOR } from '../theme';

interface AnimatedDropdownProps {
  /** Whether the dropdown is visible */
  visible: boolean;
  /** Called when backdrop is tapped or Modal is dismissed */
  onClose: () => void;
  /** Dropdown content */
  children: React.ReactNode;
  /**
   * Position and sizing for the dropdown panel.
   * Applied to the outer Animated.View — must include `top`/`left` for positioning
   * (e.g. { top: 120, left: 16, width: 200 }).
   * The component adds `position: 'absolute'` automatically.
   */
  style?: ViewStyle;
  /**
   * If true, renders inline (position: absolute + zIndex) instead of wrapping in a <Modal>.
   * Use this when the dropdown is already inside another Modal to avoid nested Modal issues.
   * Default: false (standalone Modal).
   */
  inline?: boolean;
  /** Backdrop background color. Default: 'rgba(0,0,0,0.08)' */
  backdropColor?: string;
}

/**
 * Shared animated dropdown wrapper.
 *
 * Provides: Modal (or inline) backdrop + spring-in/timing-out animation
 * (scale 0.9→1, translateY -8→0, opacity fade).
 *
 * Used by: UserManagementScreen (status/date filters), MonthPicker.
 */
export default function AnimatedDropdown({
  visible,
  onClose,
  children,
  style,
  inline = false,
  backdropColor = BACKDROP_COLOR,
}: AnimatedDropdownProps) {
  const [mounted, setMounted] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 24,
      }).start();
    } else if (mounted) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  const animatedTransform = {
    opacity: anim,
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
          extrapolate: 'clamp',
        }),
      },
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  };

  const panel = (
    <Animated.View
      style={[
        style,
        { position: 'absolute' as const },
        animatedTransform,
      ]}
    >
      {children}
    </Animated.View>
  );

  const backdrop = (
    <TouchableOpacity
      style={{ flex: 1 }}
      activeOpacity={1}
      onPress={onClose}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: backdropColor,
          opacity: anim,
        }}
      />
    </TouchableOpacity>
  );

  if (inline) {
    return (
      <>
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99998,
          }}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: backdropColor,
              opacity: anim,
            }}
          />
        </TouchableOpacity>
        {panel}
      </>
    );
  }

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {backdrop}
      {panel}
    </Modal>
  );
}
