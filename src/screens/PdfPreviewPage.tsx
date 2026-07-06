import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { useTheme, ThemeColors } from '../theme';
import { API_BASE } from '../api/client';
import { useSwipeBack } from '../hooks/useSwipeBack';

function BackArrowSvg() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

interface Props {
  batchId: number;
  batchNumber: number;
  supplier?: string;
  onBack: () => void;
}

export default function PdfPreviewPage({ batchId, batchNumber, supplier, onBack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const safeTop = insets.top;
  const swipeBack = useSwipeBack(onBack);
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const title = (t('procPdfTitle') as string).replace('{n}', String(batchNumber));
  const pdfUrl = supplier
    ? `${API_BASE}/api/procurement-batches/${batchId}/pdf?supplier=${encodeURIComponent(supplier)}`
    : `${API_BASE}/api/procurement-batches/${batchId}/pdf`;

  const lang = getLang();
  const source = { uri: pdfUrl, headers: { 'X-Lang': lang } };

  const headerHeight = safeTop + 42;

  return (
    <View style={styles.root} {...swipeBack}>
      <BlurView
        intensity={70}
        tint="regular"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
        }}
      />
      <StatusBar barStyle="light-content" />
      <View
        style={{
          position: 'absolute',
          top: safeTop - 5,
          left: 0,
          right: 0,
          zIndex: 90,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingTop: 0,
          paddingBottom: 6,
          paddingHorizontal: 16,
          backgroundColor: 'transparent',
          pointerEvents: 'box-none' as const,
        }}
      >
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <View style={styles.backBtn}>
            <BackArrowSvg />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* WebView PDF preview */}
      <View style={[styles.webviewWrap, { marginTop: headerHeight }]}>
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

const getStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  webviewWrap: { flex: 1, backgroundColor: c.bg },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    zIndex: 5,
  },
  loadingText: { fontSize: 13, color: c.textSub, marginTop: 10 },
  errorWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, gap: 12,
  },
  errorTitle: { fontSize: 16, fontWeight: '600', color: c.textMain },
  errorMsg: { fontSize: 13, color: c.textSub, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 28, paddingVertical: 10,
    borderRadius: 8, backgroundColor: c.primary,
  },
  retryBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});
