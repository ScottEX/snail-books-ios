import { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';

interface ToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ message, visible, onDismiss, duration = 3000 }: ToastProps) {
  const [show, setShow] = useState(false);
  const { colors } = useTheme();
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hold latest onDismiss in a ref so the show/hide effect can stay keyed on
  // [visible, message, duration] without re-creating the dismiss timer every
  // time the parent re-renders.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    if (visible && message) {
      setShow(true);
      const outer = setTimeout(() => {
        setShow(false);
        const inner = setTimeout(() => onDismissRef.current?.(), 300); // wait for fade-out
        fadeRef.current = inner;
      }, duration);
      dismissRef.current = outer;
      return () => { clearTimeout(outer); if (fadeRef.current) clearTimeout(fadeRef.current); };
    } else {
      setShow(false);
    }
  }, [visible, message, duration]);

  const styles = useMemo(() => getStyles(colors), [colors]);

  if (!show && !visible) return null;

  return (
    <View style={[styles.overlay, { opacity: show ? 1 : 0 }]}>
      <View style={styles.box}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    position: 'absolute' as any,
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  box: {
    backgroundColor: withAlpha(colors.textMain, 0.88),
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    maxWidth: 320,
  },
  text: {
    color: colors.surface,
    fontSize: FONTS.sub.size,
    fontWeight: FONTS.sub.weight,
    textAlign: 'center',
  },
});
