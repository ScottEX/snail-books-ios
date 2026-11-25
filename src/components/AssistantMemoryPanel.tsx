import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { type AssistantPreference, type AssistantPreferences } from '../api/client';
import { t } from '../i18n';
import { MODAL_CARD_RADIUS } from '../sharedStyles';
import { FONTS, useTheme } from '../theme';
import CloseButton from './CloseButton';
import ModalOverlay from './ModalOverlay';

export const preferenceLabel = {
  profit_basis: 'assistantMemoryProfit',
  default_period: 'assistantMemoryPeriod',
} as const;

export const preferenceValueLabel = {
  after_fees: 'assistantMemoryAfterFees',
  before_fees: 'assistantMemoryBeforeFees',
  today: 'assistantMemoryToday',
  this_month: 'ledgerAiThisMonth',
  last_month: 'ledgerAiLastMonth',
} as const;

const options = {
  profit_basis: ['after_fees', 'before_fees'],
  default_period: ['today', 'this_month', 'last_month'],
} as const;

export default function AssistantMemoryPanel({
  visible, onClose, values, busy, error, onEdit, onRetry,
}: {
  visible: boolean;
  onClose: () => void;
  values: AssistantPreferences | null;
  busy: boolean;
  error: string;
  onEdit: (key: AssistantPreference['key'], value: AssistantPreference['value'] | null) => void;
  onRetry: () => void;
}) {
  const { colors } = useTheme();

  return (
    <ModalOverlay visible={visible} onClose={onClose} animation="springScale">
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.surface }]}>{t('assistantMemory')}</Text>
          <CloseButton onPress={onClose} accessibilityLabel={t('assistantMemoryClose')} />
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={{ color: colors.textSub }}>{t('assistantMemoryDescription')}</Text>
          {!!error && (
            <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }} onPress={values ? undefined : onRetry}>
              {error}{!values && !busy ? ` · ${t('retry')}` : ''}
            </Text>
          )}
          {busy && !values && <ActivityIndicator size="small" color={colors.primary} />}
          {values && (Object.keys(options) as AssistantPreference['key'][]).map(key => (
            <View key={key} style={styles.group}>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.textMain }]}>
                {t(preferenceLabel[key])}
              </Text>
              {!values[key] && <Text style={{ color: colors.textSub }}>{t('assistantMemoryUnset')}</Text>}
              <View style={styles.options}>
                {options[key].map(value => {
                  const selected = values[key] === value;
                  return (
                    <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected, disabled: busy }}
                      disabled={busy || selected} onPress={() => onEdit(key, value)}
                      style={[styles.option, { backgroundColor: selected ? colors.primary : colors.bg }]}>
                      <Text style={{ color: selected ? colors.surface : colors.textMain }}>{t(preferenceValueLabel[value])}</Text>
                    </TouchableOpacity>
                  );
                })}
                {!!values[key] && (
                  <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => onEdit(key, null)} style={styles.option}>
                    <Text style={{ color: colors.danger }}>{t('assistantMemoryRemove')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </ModalOverlay>
  );
}

const styles = StyleSheet.create({
  card: { width: 360, maxWidth: '92%', maxHeight: '78%', borderRadius: MODAL_CARD_RADIUS, overflow: 'hidden' },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  title: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },
  body: { padding: 16, gap: 15 },
  group: { gap: 7 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: { minHeight: 44, justifyContent: 'center', borderRadius: 8, paddingHorizontal: 10 },
});
