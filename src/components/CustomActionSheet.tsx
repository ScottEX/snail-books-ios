import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Animated,
  StyleSheet, Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme, ThemeColors, FONTS, withAlpha, BACKDROP_COLOR } from '../theme';

export interface ActionItem {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  selected?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  title?: string;
  message?: string;
  actions: ActionItem[];
  onClose: () => void;
  offsetY?: number;
  offsetX?: number;
  /** Dark BlurView style — matches 对账人 dropdown */
  dark?: boolean;
  /** Hide backdrop overlay */
  noOverlay?: boolean;
}

export default function CustomActionSheet({
  visible, title, message, actions, onClose, offsetY = 0, offsetX = 0, dark = false, noOverlay = false,
}: Props) {
  const { colors: c } = useTheme();
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
      Animated.timing(anim, {
        toValue: 0, duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0, duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View
          style={[st.overlay, { opacity: anim, backgroundColor: noOverlay ? 'transparent' : undefined }]}
        />
      </TouchableOpacity>

      <View
        style={st.sheetOuter}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            dark ? { width: 180, alignSelf: 'flex-start' as const } : st.sheet,
            {
              marginTop: offsetY,
              marginLeft: offsetX,
              transform: [{ scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }) }],
              opacity: anim,
            },
          ]}
        >
          {dark ? (
            <BlurView intensity={80} tint="dark" style={{ borderRadius: 10, overflow: 'hidden' as any }}>
              <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                {actions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[{
                      paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 4,
                      marginTop: index === 0 ? 4 : 0,
                      marginBottom: index === actions.length - 1 ? 4 : 0,
                      borderRadius: 8,
                      backgroundColor: action.selected ? 'rgba(10,132,255,0.25)' : 'transparent',
                      flexDirection: 'row' as any, alignItems: 'center' as any, gap: 8,
                    }]}
                    onPress={() => { if (action.disabled) return; handleClose(); setTimeout(action.onPress, 250); }}
                    activeOpacity={0.6}
                  >
                    {action.icon && <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>{action.icon}</View>}
                    <Text style={{
                      fontSize: FONTS.sub.size,
                      color: action.selected ? '#0A84FF' : action.destructive ? '#FF453A' : '#FFFFFF',
                      fontWeight: action.selected ? '700' : FONTS.sub.weight as any,
                    }}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </BlurView>
          ) : (
            <>
              {(title || message) && (
                <View style={st.titleWrap}>
                  {title && <Text style={st.title}>{title}</Text>}
                  {message && <Text style={st.message}>{message}</Text>}
                </View>
              )}

              <ScrollView style={{ maxHeight: 240 }} bounces={false}>
                {actions.map((action, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <View style={st.divider} />}
                    <TouchableOpacity
                      style={[
                        st.actionRow,
                        action.selected && { backgroundColor: withAlpha(c.primary, 0.12), borderRadius: 8, marginHorizontal: 4 },
                        action.disabled && st.actionDisabled,
                      ]}
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
              </ScrollView>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BACKDROP_COLOR,
  },
  sheetOuter: {
    flex: 1,
    justifyContent: 'flex-start' as any,
    alignItems: 'flex-start' as any,
  },
  sheet: {
    width: 140,
    maxWidth: 140,
    backgroundColor: c.surface,
    borderRadius: 14,
    overflow: 'hidden' as any,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  titleWrap: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: FONTS.sub.size,
    fontWeight: '600',
    color: c.textMain,
  },
  message: {
    fontSize: FONTS.micro.size,
    color: c.textSub,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginLeft: 48,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 40,
    backgroundColor: c.surface,
  },
  actionDisabled: { opacity: 0.4 },
  actionIcon: {
    width: 18, height: 18,
    borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  actionBody: { flex: 1 },
  actionLabel: {
    fontSize: FONTS.sub.size,
    color: c.textMain,
    fontWeight: FONTS.sub.weight as any,
  },
  actionSublabel: {
    fontSize: FONTS.micro.size,
    color: c.textSub,
    marginTop: 1,
  },
  actionDanger: { color: c.danger },
  actionDisabledText: { color: c.textSub },
});
