import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, ThemeColors, withAlpha } from '../theme';
import { FONTS } from '../theme';
import { t } from '../i18n';
import ModalOverlay from './ModalOverlay';
import CloseButton from './CloseButton';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  confirmColor?: string;
  cancelLabel?: string;
  headerColor?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  animation?: 'slide' | 'springScale' | 'blurMorph';
}

/** Standardized confirmation modal with blurMorph animation, used for all delete/confirm dialogs. */
export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  confirmColor,
  cancelLabel,
  headerColor,
  loading,
  onConfirm,
  onCancel,
  animation = 'blurMorph',
}: ConfirmModalProps) {
  const { colors: c } = useTheme();
  const styles = getStyles(c);
  const hdr = headerColor || c.primary;
  const btn = confirmColor || c.primary;

  return (
    <ModalOverlay visible={visible} onClose={onCancel} animation={animation}>
      <View style={styles.card}>
        <View style={[styles.header, { backgroundColor: hdr }]}>
          <Text style={styles.title}>{title}</Text>
          <CloseButton onPress={onCancel} />
        </View>
        <View style={styles.body}>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>{message}</Text>
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.cancelBtn, loading && styles.btnDisabled]} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelText}>{cancelLabel || t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: btn }, loading && styles.btnDisabled]} onPress={onConfirm} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={c.surface} />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel || t('delete')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ModalOverlay>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.surface, borderRadius: 24,
    width: 340, maxWidth: '100%', overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.surface },
  body: { padding: 24, gap: 18 },
  warningBox: {
    backgroundColor: withAlpha(c.primary, 0.1), borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  warningText: { fontSize: FONTS.micro.size, color: c.textSub, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: withAlpha(c.textMain, 0.06), alignItems: 'center',
    borderWidth: 1, borderColor: c.secondary,
  },
  cancelText: { fontSize: FONTS.sub.size, fontWeight: '600', color: c.textMain },
  confirmBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
  },
  confirmText: { fontSize: FONTS.sub.size, fontWeight: '600', color: c.surface },
  btnDisabled: { opacity: 0.5 },
});
