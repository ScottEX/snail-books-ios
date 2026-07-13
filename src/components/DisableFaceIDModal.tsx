import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useTheme, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { MODAL_CARD_RADIUS } from '../sharedStyles';
import { t } from '../i18n';
import { clearCredential } from '../utils/biometric';
import ModalOverlay from './ModalOverlay';
import CloseButton from './CloseButton';
import LoadingSpinner from './LoadingSpinner';

interface DisableFaceIDModalProps {
  visible: boolean;
  onClose: () => void;
  onDisabled: () => void;
  username: string;
}

export default function DisableFaceIDModal({ visible, onClose, onDisabled, username }: DisableFaceIDModalProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [loading, setLoading] = useState(false);

  const handleDisable = async () => {
    setLoading(true);
    try {
      await clearCredential(username || undefined);
      onDisabled();
    } catch {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay visible={visible} onClose={onClose} animation="blurMorph">
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('faceIDLabel')}</Text>
          <CloseButton onPress={onClose} />
        </View>
        <View style={styles.body}>
          <Text style={styles.confirmText}>
            {t('disableFaceIDConfirm')}
          </Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.cancelBtn, loading && { opacity: 0.5 }]} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, loading && { opacity: 0.5 }]} onPress={handleDisable} disabled={loading}>
              {loading ? (
                <LoadingSpinner label={false} size={20} color={colors.surface} />
              ) : (
                <Text style={styles.confirmBtnText}>{t('confirmDisable')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ModalOverlay>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: MODAL_CARD_RADIUS,
    width: 340, maxWidth: '90%', overflow: 'hidden',
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.surface },
  body: { padding: 24, alignItems: 'center', gap: 18 } as any,
  confirmText: { fontSize: FONTS.body.size, color: colors.textMain, textAlign: 'center' as any },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: (colors as any).secondary || '#e0e0e0',
    justifyContent: 'center', alignItems: 'center',
  },
  cancelText: { fontSize: FONTS.sub.size, fontWeight: '500', color: colors.textSub },
  confirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  confirmBtnText: { fontSize: FONTS.sub.size, fontWeight: '600', color: colors.surface },
});
