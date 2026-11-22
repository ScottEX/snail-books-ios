import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api, type LedgerAnswer, type LedgerTotal } from '../api/client';
import { t } from '../i18n';
import { FONTS, useTheme, withAlpha } from '../theme';
import { fmtAmtFull, formatDate } from '../utils/format';
import AppTextInput from './AppTextInput';
import ButtonPair from './ButtonPair';
import CloseButton from './CloseButton';
import ModalOverlay from './ModalOverlay';

const examples = ['ledgerAiSalaryExample', 'ledgerAiTurnoverExample', 'ledgerAiGoodsExample'];
const knownErrors = ['ledgerAiUnavailable', 'ledgerAiUnclear', 'expenseAiRateLimit'];

function periodLabel(total: LedgerTotal) {
  const start = formatDate(total.start_date);
  return total.start_date === total.end_date ? start : `${start} – ${formatDate(total.end_date)}`;
}

function LedgerResult({ answer }: { answer: LedgerAnswer }) {
  const { colors } = useTheme();
  const isExpense = answer.metric === 'expense';
  const label = isExpense ? answer.category ?? 'expense'
    : answer.metric === 'received' ? 'actualReceived' : 'revTurnover';
  const basis = isExpense
    ? answer.category === 'goods' ? 'ledgerAiGoodsBasis' : 'ledgerAiExpenseBasis'
    : answer.metric === 'received' ? 'ledgerAiReceivedBasis' : 'ledgerAiTurnoverBasis';
  return (
    <View style={[styles.result, { backgroundColor: withAlpha(colors.primary, 0.08) }]} accessibilityLiveRegion="polite">
      <Text style={[styles.title, { color: colors.textMain }]}>{t(label)}</Text>
      {[answer.current, answer.comparison].map((total, index) => total && (
        <View key={index} style={styles.totalRow}>
          <Text style={[styles.period, { color: colors.textSub }]}>{periodLabel(total)}</Text>
          <Text style={{ color: colors.textMain, fontWeight: '600' }}>
            {total.records ? fmtAmtFull(total.amount) : t('ledgerAiNoRecords')}
          </Text>
        </View>
      ))}
      {answer.difference !== null && (
        <Text style={{ color: colors.primary, fontWeight: '600' }}>
          {t('ledgerAiDifference')} {answer.difference > 0 ? '+' : ''}{fmtAmtFull(answer.difference)}
        </Text>
      )}
      <Text style={{ color: colors.textSub }}>{t(basis)}</Text>
    </View>
  );
}

export default function LedgerQueryModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<LedgerAnswer | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const close = () => {
    Keyboard.dismiss();
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setQuestion('');
    setAnswer(null);
    setError('');
    onClose();
  };

  const changeQuestion = (text: string) => {
    setQuestion(text);
    setAnswer(null);
    setError('');
  };

  const ask = async () => {
    const text = question.trim();
    if (!text || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    setAnswer(null);
    Keyboard.dismiss();
    try {
      const result = await api.askLedger(text, controller.signal);
      if (!controller.signal.aborted) setAnswer(result.answer);
    } catch (failure) {
      if (controller.signal.aborted) return;
      const message = failure instanceof Error ? failure.message : '';
      setError(t(knownErrors.includes(message) ? message : 'ledgerAiFailed'));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  };

  return (
    <ModalOverlay visible={visible} onClose={close} animation="springScale" avoidKeyboard>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={[styles.title, { color: colors.surface }]}>{t('ledgerAiTitle')}</Text>
          <CloseButton onPress={close} />
        </View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <Text style={{ color: colors.textSub }}>{t('ledgerAiPrivacy')}</Text>
          <AppTextInput
            accessibilityLabel={t('ledgerAiTitle')}
            placeholder={t('ledgerAiTurnoverExample')}
            placeholderTextColor={colors.textSub}
            value={question}
            onChangeText={changeQuestion}
            editable={!busy}
            multiline
            maxLength={300}
            style={[styles.input, { color: colors.textMain, borderColor: withAlpha(colors.textSub, 0.35) }]}
          />
          {!answer && !busy && examples.map(key => (
            <TouchableOpacity key={key} accessibilityRole="button" onPress={() => changeQuestion(t(key))}>
              <Text style={{ color: colors.primary, paddingVertical: 4 }}>{t(key)}</Text>
            </TouchableOpacity>
          ))}
          {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{error}</Text>}
          {answer && <LedgerResult answer={answer} />}
        </ScrollView>
        <View style={styles.actions}>
          <ButtonPair
            leftLabel={t('cancel')}
            leftOnPress={close}
            rightLabel={t('ledgerAiAsk')}
            rightOnPress={ask}
            rightDisabled={!question.trim() || busy}
            rightLoading={busy}
          />
        </View>
      </View>
    </ModalOverlay>
  );
}

const styles = StyleSheet.create({
  card: { width: 360, maxWidth: '100%', flexShrink: 1, borderRadius: 16, overflow: 'hidden' },
  header: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: FONTS.subBold.size, fontWeight: '700' },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { padding: 18, paddingBottom: 12, gap: 8 },
  input: { minHeight: 66, maxHeight: 110, padding: 10, borderWidth: 1, borderRadius: 8 },
  result: { borderRadius: 10, padding: 12, gap: 10 },
  totalRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  period: { flex: 1 },
  actions: { paddingHorizontal: 18, paddingBottom: 18 },
});
