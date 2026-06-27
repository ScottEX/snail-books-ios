import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { t } from '../i18n';
import { api } from '../api/client';
import ModalOverlay from './ModalOverlay';
import CloseButton from './CloseButton';

interface LogoutConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function LogoutConfirmModal({ visible, onClose, onLogout }: LogoutConfirmModalProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <ModalOverlay visible={visible} onClose={onClose}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('logout')}</Text>
          <CloseButton onPress={onClose} />
        </View>
        <View style={styles.body}>
          <Text style={styles.confirmText}>
            {t('logoutConfirm') || '确定要退出登录吗？'}
          </Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={async () => {
              await api.logout();
              onLogout();
            }}>
              <Text style={styles.confirmBtnText}>{t('confirmLogout') || '确定退出'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ModalOverlay>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
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
