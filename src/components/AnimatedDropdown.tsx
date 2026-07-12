import React, { useEffect, useRef } from 'react';
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
 * Animation matches ModalOverlay springScale:
 *   spring(bounciness:8, speed:14), scale 0.85→1, slide 12→0, fade 250ms in / 180ms out.
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
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const slide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      fade.setValue(0);
      scale.setValue(0.85);
      slide.setValue(12);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 8, speed: 14 }),
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 8, speed: 14 }),
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.85, duration: 180, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 12, duration: 180, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const animatedTransform = {
    opacity: fade,
    transform: [
      { scale },
      { translateY: slide },
    ],
  };

  const panel = (
    <Animated.View
      style={[
        style,
        { position: 'absolute' as const },
        animatedTransform,
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
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
          opacity: fade,
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
              opacity: fade,
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
