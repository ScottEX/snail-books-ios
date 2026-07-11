import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  StyleSheet, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../theme';

export interface ActionItem {
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  title?: string;
  actions: ActionItem[];
  onClose: () => void;
}

export default function CustomActionSheet({
  visible, title, actions, onClose,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const st = getStyles(colors);

  useEffect(() => {
    if (visible) {
      Animated.spring(anim, {
        toValue: 1,
        tension: 65, friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0, duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose]);

  const sheetY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const paddingBottom = insets.bottom > 0 ? insets.bottom : 16;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View style={[st.overlay, { opacity: anim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>

      <View style={st.sheetOuter} pointerEvents="box-none">
        <Animated.View style={[st.sheet, { transform: [{ translateY: sheetY }], paddingBottom }]}>
          {title && <Text style={st.title}>{title}</Text>}

          {actions.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[st.action, i === actions.length - 1 && st.actionLast]}
              onPress={() => { handleClose(); setTimeout(item.onPress, 200); }}
              disabled={item.disabled}
              activeOpacity={0.6}
            >
              <Text style={[st.actionText, item.destructive && st.actionDanger, item.disabled && st.actionDisabled]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetOuter: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textMain,
    textAlign: 'center',
    paddingVertical: 12,
  },
  action: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
    alignItems: 'center',
  },
  actionLast: {
    marginBottom: 12,
  },
  actionText: {
    fontSize: 16,
    color: c.textMain,
  },
  actionDanger: {
    color: c.danger,
  },
  actionDisabled: {
    opacity: 0.4,
  },
});
