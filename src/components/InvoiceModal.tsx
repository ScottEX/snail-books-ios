import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useTheme, withAlpha } from '../theme';
import { t } from '../i18n';
import { api } from '../api/client';
import ModalOverlay from './ModalOverlay';
import CloseButton from './CloseButton';
import { FONTS } from '../theme';
import { useEffect, useRef, useState } from 'react';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface InvoiceData {
  company_name: string;
  tax_id: string;
  bank_name: string;
  bank_account: string;
  address: string;
  phone: string;
}

const EMPTY: InvoiceData = {
  company_name: '', tax_id: '', bank_name: '', bank_account: '', address: '', phone: '',
};

const FIELDS: { key: keyof InvoiceData; labelKey: string }[] = [
  { key: 'company_name', labelKey: 'companyName' },
  { key: 'tax_id', labelKey: 'taxId' },
  { key: 'bank_name', labelKey: 'bankName' },
  { key: 'bank_account', labelKey: 'bankAccount' },
  { key: 'address', labelKey: 'addressPhone' },
  { key: 'phone', labelKey: 'companyPhone' },
];

export default function InvoiceModal({ visible, onClose }: Props) {
  const { colors: c } = useTheme();
  const [data, setData] = useState<InvoiceData>(EMPTY);
  const [original, setOriginal] = useState<InvoiceData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup close timer on unmount
  useEffect(() => {
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);

  useEffect(() => {
    if (!visible) return;
    // Reset states when opening
    setSaved(false);
    (async () => {
      try {
        const invData: any = await api.getInvoice();
        if (invData.status === 'ok' && invData.data) {
          const d = { ...EMPTY, ...invData.data };
          setData(d);
          setOriginal(d);
        }
        const admResp = await api.admin.check();
        if (admResp) {
          setIsAdmin((admResp as any).is_admin === true);
        }
      } catch {}
    })();
  }, [visible]);

  const hasChanged = JSON.stringify(data) !== JSON.stringify(original);

  const handleSave = async () => {
    if (!hasChanged || saving) return;
    setSaving(true);
    try {
      const json: any = await api.updateInvoice(data as any);
      if (json.status === 'ok') {
        setSaved(true);
        setOriginal({ ...data });
        closeTimer.current = setTimeout(() => onClose(), 800);
      }
    } catch {}
    setSaving(false);
  };

  const btnDisabled = saving || saved || !hasChanged;
  const btnText = saved ? t('invoiceSaved') : saving ? t('invoiceSaving') : t('invoiceSave');

  return (
    <ModalOverlay visible={visible} onClose={onClose}>
      <View style={[s.card, { backgroundColor: c.surface }]}>
        <View style={[s.header, { backgroundColor: c.primary }]}>
          <Text style={[s.title, { color: c.surface }]}>{t('invoiceTitle')}</Text>
          <CloseButton onPress={onClose} />
        </View>
        <View style={s.body}>
          {FIELDS.map((f) => (
            <View key={f.key} style={s.fieldRow}>
              <Text style={[s.label, { color: c.textSub }]}>{t(f.labelKey as any)}</Text>
              <TextInput
                style={[s.input, {
                  color: c.textMain,
                  borderColor: withAlpha(c.textMain, 0.1),
                  backgroundColor: isAdmin ? 'transparent' : c.bg,
                }] as any}
                value={data[f.key]}
                onChangeText={(v) => setData((d) => ({ ...d, [f.key]: v }))}
                placeholder={t(f.labelKey as any)}
                placeholderTextColor={c.textSub}
                editable={isAdmin && !saved}
              />
            </View>
          ))}
          {isAdmin && (
            <TouchableOpacity
              style={[s.saveBtn, {
                backgroundColor: c.primary,
                opacity: btnDisabled ? 0.45 : 1,
              }]}
              onPress={handleSave}
              disabled={btnDisabled}
              activeOpacity={0.7}
            >
              <Text style={[s.saveBtnText, { color: c.surface }]}>{btnText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ModalOverlay>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    width: 340, maxWidth: '100%', overflow: 'hidden' as any,
  } as any,
  header: {
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },
  body: { padding: 24, gap: 14 },
  fieldRow: { gap: 4 },
  label: { fontSize: 12, fontWeight: '500' },
  input: {
    fontSize: 14, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1,
  } as any,
  saveBtn: {
    marginTop: 6, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '600' },
});
