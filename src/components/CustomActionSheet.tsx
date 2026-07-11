import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  StyleSheet, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../theme';

export interface ActionItem {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  title?: string;
  message?: string;
  actions: ActionItem[];
  onClose: () => void;
  width?: number | string;
  position?: 'bottom' | 'center';
  cancelText?: string;
}

export default function CustomActionSheet({
  visible, title, message, actions, onClose,
  width, position = 'bottom', cancelText,
}: Props) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const st = getStyles(c);

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[st.overlay, { opacity: anim }]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      <View
        style={[
          st.sheetOuter,
          position === 'center' && st.sheetOuterCenter,
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            st.sheet,
            { width: width ?? '100%' as any, alignSelf: 'center' as const },
            {
              transform: position === 'bottom'
                ? [{ translateY: sheetY }]
                : [{ scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }) }],
              opacity: position === 'center' ? anim : 1,
            },
          ]}
        >
          {position === 'bottom' && <View style={st.handle} />}

          {(title || message) && (
            <View style={st.titleWrap}>
              {title && <Text style={st.title}>{title}</Text>}
              {message && <Text style={st.message}>{message}</Text>}
            </View>
          )}

          {actions.map((action, index) => (
            <React.Fragment key={index}>
              {index > 0 && <View style={st.divider} />}
              <TouchableOpacity
                style={[st.actionRow, action.disabled && st.actionDisabled]}
                onPress={() => {
                  if (action.disabled) return;
                  handleClose();
                  setTimeout(action.onPress, 250);
                }}
                activeOpacity={0.6}
              >
                {action.icon && <View style={st.actionIcon}>{action.icon}</View>}
                <View style={st.actionBody}>
                  <Text style={[
                    st.actionLabel,
                    action.destructive && st.actionDanger,
                    action.disabled && st.actionDisabledText,
                  ]}>
                    {action.label}
                  </Text>
                  {action.sublabel && (
                    <Text style={st.actionSublabel}>{action.sublabel}</Text>
                  )}
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}

          <View style={st.cancelGap} />
          <TouchableOpacity
            style={st.cancelBtn}
            onPress={handleClose}
            activeOpacity={0.6}
          >
            <Text style={st.cancelText}>{cancelText || '取消'}</Text>
          </TouchableOpacity>

          {insets.bottom > 0 && <View style={{ height: insets.bottom }} />}
        </Animated.View>
      </View>
    </Modal>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetOuter: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    alignItems: 'center',
  },
  sheetOuterCenter: {
    top: 0,
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: 'hidden',
  },
  handle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginTop: 8, marginBottom: 4,
  },
  titleWrap: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 13, fontWeight: '600',
    color: c.textSub,
    textAlign: 'center',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: c.textSub,
    textAlign: 'center',
    lineHeight: 17,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginLeft: 56,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
    backgroundColor: c.surface,
  },
  actionDisabled: { opacity: 0.4 },
  actionIcon: {
    width: 28, height: 28,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  actionBody: { flex: 1 },
  actionLabel: {
    fontSize: 16,
    color: c.textMain,
    fontWeight: '400',
  },
  actionSublabel: {
    fontSize: 12,
    color: c.textSub,
    marginTop: 1,
  },
  actionDanger: { color: c.danger },
  actionDisabledText: { color: c.textSub },
  cancelGap: {
    height: 8,
    backgroundColor: c.bg,
  },
  cancelBtn: {
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: c.primary,
  },
});
