import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { t } from '../i18n';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { api } from '../api/client';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface Props {
  batchId: number;
  invoiceNumber: number;
  onBack: () => void;
}

/**
 * iOS PDF Preview — placeholder.
 *
 * The web version renders PDFs via `react-pdf` plus a full gesture-driven
 * pinch-zoom/pan/momentum viewer. iOS has no equivalent library out of the box,
 * so this page shows file info and lets the user open the URL externally
 * (system browser / Quick Look) where the OS handles rendering.
 *
 * TODO(invoice): integrate `expo-document-viewer` or `WebView` with a PDF
 * shim if/when a richer in-app preview is required.
 */
export default function PdfPreviewPage({ batchId, invoiceNumber, onBack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const swipeBack = useSwipeBack(onBack);
  const styles = useMemo(() => getStyles(colors), [colors]);

  // The web version uses a backend route at /api/procurement-batches/{id}/pdf
  // We don't know the exact path on iOS — we can only surface what the caller
  // supplied. Display a best-effort URL anyway.
  const filePath = `procurement-${batchId}.pdf`;
  const fileUrl = api.getInvoiceFileUrl(filePath);

  const openExternal = async () => {
    try {
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert(t('toastLoadFailed' as any) as string || 'Error', fileUrl);
      }
    } catch (e: any) {
      Alert.alert(t('toastLoadFailed' as any) as string || 'Error', e?.message || String(e));
    }
  };

  return (
    <View style={styles.root} {...swipeBack}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backBtn}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textMain} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{(t('procPdfTitle' as any) as string || 'Invoice #{n}').replace('{n}', String(invoiceNumber))}</Text>
          <Text style={styles.subtitle}>#{invoiceNumber}</Text>
        </View>
        <TouchableOpacity
          onPress={openExternal}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.iconBtn}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMain} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <Path d="M7 10l5 5 5-5" />
            <Line x1="12" y1="15" x2="12" y2="3" />
          </Svg>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Placeholder card — mimics a "PDF page" sheet */}
        <View style={styles.sheet}>
          {/* Faux header bar */}
          <View style={styles.sheetBar}>
            <View style={[styles.sheetDot, { backgroundColor: withAlpha(colors.danger, 0.7) }]} />
            <View style={[styles.sheetDot, { backgroundColor: withAlpha(colors.warning, 0.7) }]} />
            <View style={[styles.sheetDot, { backgroundColor: withAlpha(colors.success, 0.7) }]} />
          </View>

          {/* Document icon + body */}
          <View style={styles.sheetBody}>
            <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <Path d="M14 2v6h6" />
              <Line x1="8" y1="13" x2="16" y2="13" />
              <Line x1="8" y1="17" x2="13" y2="17" />
            </Svg>
            <Text style={styles.sheetTitle}>PDF Preview</Text>
            <Text style={styles.sheetSubtitle}>{(t('pdfGenerating' as any) as string) || 'PDF preview not yet available on iOS — would render file here'}</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <InfoRow label="ID" value={String(batchId)} colors={colors} />
          <InfoRow label="Invoice" value={String(invoiceNumber)} colors={colors} />
          <InfoRow label="URL" value={fileUrl} colors={colors} monospace />
        </View>

        {/* Open externally */}
        <TouchableOpacity onPress={openExternal} activeOpacity={0.7} style={styles.primaryBtn}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <Path d="M15 3h6v6" />
            <Line x1="10" y1="14" x2="21" y2="3" />
          </Svg>
          <Text style={styles.primaryBtnText}>
            {(t('downloadPdf' as any) as string) || 'Open PDF'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          {(t('pdfPageInfo' as any) as string || 'Page {current} / {total}')
            .replace('{current}', '—')
            .replace('{total}', '—')}
        </Text>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, colors, monospace }: { label: string; value: string; colors: ThemeColors; monospace?: boolean }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 11, color: colors.textSub, marginBottom: 2 }}>{label}</Text>
      <Text
        style={{
          fontSize: 13,
          color: colors.textMain,
          fontWeight: '500',
          fontFamily: monospace ? 'Courier' : undefined,
        }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: withAlpha(colors.bg, 0.6),
    borderBottomWidth: 1,
    borderBottomColor: withAlpha(colors.textSub, 0.1),
  },
  backBtn: { padding: 4 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: withAlpha(colors.primary, 0.1),
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.textMain },
  subtitle: { fontSize: 11, color: colors.textSub, marginTop: 1 },
  content: { padding: 16, paddingBottom: 60 },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: withAlpha(colors.textSub, 0.1),
    marginBottom: 16,
  },
  sheetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: withAlpha(colors.textSub, 0.1),
    backgroundColor: withAlpha(colors.textSub, 0.04),
  },
  sheetDot: { width: 8, height: 8, borderRadius: 4 },
  sheetBody: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.textMain, marginTop: 8 },
  sheetSubtitle: {
    fontSize: 12,
    color: colors.textSub,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: withAlpha(colors.textSub, 0.1),
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    color: colors.textSub,
    textAlign: 'center',
  },
});
