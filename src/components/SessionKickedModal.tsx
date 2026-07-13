import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { THEMES, DEFAULT_THEME_ID, getThemeKey, ThemeColors, withAlpha, FONTS } from '../theme';
import { t } from '../i18n';
import { onSessionKicked } from '../api/client';
import ModalOverlay from './ModalOverlay';
import CloseButton from './CloseButton';
import { useEffect, useState } from 'react';

/**
 * Read the per-user theme id from localStorage and resolve it to
 * ThemeColors. Falls back to DEFAULT_THEME_ID ('burgundy-warm') if
 * the stored id is missing or unknown — same fallback ThemeProvider
 * uses internally, so the modal and the rest of the app agree on
 * what "no theme set" looks like.
 */
function readStoredColors(): ThemeColors {
  try {
    const key = getThemeKey();
    const id = localStorage.getItem(key) || DEFAULT_THEME_ID;
    return THEMES[id]?.colors ?? THEMES[DEFAULT_THEME_ID].colors;
  } catch {
    return THEMES[DEFAULT_THEME_ID].colors;
  }
}

/** Standardized "your account was signed in elsewhere" modal.
 *  Triggered by the api client when a 401 with code=session_kicked is received.
 *  Single confirm button + ✕ close. */
export default function SessionKickedModal() {
  const [colors, setColors] = useState<ThemeColors>(readStoredColors);
  const styles = getStyles(colors);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return onSessionKicked(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (visible) {
      setColors(readStoredColors());
    }
  }, [visible]);

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <ModalOverlay visible={visible} onClose={handleClose}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('sessionKickedTitle') || '账号已退出'}</Text>
          <CloseButton onPress={handleClose} />
        </View>
        <View style={styles.body}>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>{t('sessionKickedToast') || '你的账号已在其他设备登录'}</Text>
          </View>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleClose}>
            <Text style={styles.confirmBtnText}>{t('sessionKickedButton') || '我知道了'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalOverlay>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.surface, borderRadius: 16,
    width: 340, maxWidth: '90%', overflow: 'hidden',
  },
  header: {
    backgroundColor: c.primary,
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.surface },
  body: { padding: 24, alignItems: 'center', gap: 18 },
  warningBox: {
    backgroundColor: withAlpha(c.primary, 0.1), borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  warningText: { fontSize: FONTS.micro.size, color: c.textSub, textAlign: 'center' },
  confirmBtn: {
    width: '100%', paddingVertical: 13, borderRadius: 10,
    backgroundColor: c.primary, alignItems: 'center',
  },
  confirmBtnText: { fontSize: FONTS.sub.size, fontWeight: '600', color: c.surface },
});
