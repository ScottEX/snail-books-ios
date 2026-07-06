import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { useTheme, withAlpha, ThemeColors, ENTER_DURATION, EXIT_DURATION } from '../theme';
import { API_BASE } from '../api/client';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface Props {
  batchId: number;
  batchNumber: number;
  supplier?: string;
  onBack: () => void;
}

export default function PdfPreviewPage({ batchId, batchNumber, supplier, onBack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const swipeBack = useSwipeBack(onBack);
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const title = (t('procPdfTitle') as string).replace('{n}', String(batchNumber));
  const pdfUrl = supplier
    ? `${API_BASE}/api/procurement-batches/${batchId}/pdf?supplier=${encodeURIComponent(supplier)}`
    : `${API_BASE}/api/procurement-batches/${batchId}/pdf`;

  const lang = getLang();
  // Inject X-Lang via custom headers in source prop — WebView on iOS supports
  // custom HTTP headers through the `source` object with `headers`.
  const source = { uri: pdfUrl, headers: { 'X-Lang': lang } };

  return (
    <View style={styles.root} {...swipeBack}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.backBtn}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textMain} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
      </View>

      {/* WebView PDF — Safari renders PDFs natively on iOS */}
      <View style={styles.webviewWrap}>
        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorTitle}>{t('pdfLoadFailed')}</Text>
            <Text style={styles.errorMsg}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setError(''); setLoading(true); }}>
              <Text style={styles.retryBtnText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            source={source}
            style={styles.webview}
            onLoadEnd={() => setLoading(false)}
            onError={(e) => { setError(e.nativeEvent.description || '加载失败'); setLoading(false); }}
            javaScriptEnabled={false}
            scalesPageToFit
            startInLoadingState={false}
          />
        )}
        {loading && !error && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('pdfGenerating')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: withAlpha(colors.bg, 0.85),
    borderBottomWidth: 0.5,
    borderBottomColor: withAlpha(colors.textSub, 0.12),
    zIndex: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: withAlpha(colors.bg, 0.30),
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '600', color: colors.textMain },
  webviewWrap: { flex: 1, backgroundColor: '#F9F7F4' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    zIndex: 5,
  },
  loadingText: { fontSize: 13, color: colors.textSub, marginTop: 10 },
  errorWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, gap: 12,
  },
  errorTitle: { fontSize: 16, fontWeight: '600', color: colors.textMain },
  errorMsg: { fontSize: 13, color: colors.textSub, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 28, paddingVertical: 10,
    borderRadius: 8, backgroundColor: colors.primary,
  },
  retryBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});
