import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Share, PanResponder } from 'react-native';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import Svg, { Path, Polyline, Rect, Circle, Line } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { useTheme, ThemeColors, FONTS } from '../theme';
import { API_BASE } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

function BackArrowSvg() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function DownloadSvg() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="#2C2626" strokeWidth={2} fill="none" />
      <Polyline points="7 10 12 15 17 10" stroke="#2C2626" strokeWidth={2} fill="none" />
      <Line x1="12" y1="15" x2="12" y2="3" stroke="#2C2626" strokeWidth={2} />
    </Svg>
  );
}

function ImageDownloadSvg() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="#2C2626" strokeWidth={2} fill="none" />
      <Circle cx="8.5" cy="8.5" r="1.5" fill="#2C2626" />
      <Polyline points="21 15 16 10 5 21" stroke="#2C2626" strokeWidth={2} fill="none" />
      <Line x1="12" y1="18" x2="12" y2="12" stroke="#2C2626" strokeWidth={2} />
      <Polyline points="9 15 12 12 15 15" stroke="#2C2626" strokeWidth={2} fill="none" />
    </Svg>
  );
}

interface Props {
  batchId: number;
  batchNumber?: number;
  supplier?: string;
  /** If provided, preview this file URL directly instead of fetching by batchId */
  fileUrl?: string;
  /** Custom title (used with fileUrl mode) */
  title?: string;
  onBack: () => void;
}

export default function PdfPreviewPage({ batchId, batchNumber, supplier, fileUrl, title: customTitle, onBack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const safeTop = insets.top;
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<'download' | 'images' | null>(null);
  const [introSec, setIntroSec] = useState(0);
  const [pdfCached, setPdfCached] = useState(false);
  const cachedUriRef = useRef('');

  const title = customTitle || (t('procPdfTitle') as string).replace('{n}', String(batchNumber));
  useEffect(() => {
    if (!loading) { setIntroSec(0); return; }
    setIntroSec(0);
    const id = setInterval(() => setIntroSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const pdfUrl = fileUrl
    || (supplier
      ? `${API_BASE}/api/procurement-batches/${batchId}/pdf?supplier=${encodeURIComponent(supplier)}`
      : `${API_BASE}/api/procurement-batches/${batchId}/pdf`);
  const pngUrl = batchId > 0
    ? (supplier
      ? `${API_BASE}/api/procurement-batches/${batchId}/png?supplier=${encodeURIComponent(supplier)}`
      : `${API_BASE}/api/procurement-batches/${batchId}/png`)
    : (fileUrl && fileUrl.startsWith(API_BASE)) ? `${fileUrl}/png` : '';

  const lang = getLang();
  const isLocal = !pdfUrl.startsWith('http');
  const source = isLocal ? { uri: pdfUrl } : { uri: pdfUrl, headers: { 'X-Lang': lang } };

  // Swipe-to-back on header
  const headerPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => gs.dx > 10 && Math.abs(gs.dy) < 5,
    onPanResponderRelease: (_, gs) => {
      if (gs.dx > 60) onBack();
    },
  })).current;

  // Skip initial loading spinner for local files (blob URIs, etc.)
  useEffect(() => {
    if (!pdfUrl.startsWith('http')) { setLoading(false); }
  }, [pdfUrl]);

  const headerHeight = safeTop + 42;

  // Pre-cache PDF on mount so download/share reuses the local file (matches web behavior)
  // Timeout at 15s to avoid hanging gunicorn workers like before
  // Cache key includes lang so switching languages re-downloads
  useEffect(() => {
    let cancelled = false;
    const fileName = batchId ? `procurement_${batchId}_${lang}.pdf` : `${title}.pdf`;
    const localUri = `${FileSystem.cacheDirectory}${fileName}`;
    (async () => {
      try {
        const info = await FileSystem.getInfoAsync(localUri);
        if (info.exists) {
          if (!cancelled) { cachedUriRef.current = localUri; setPdfCached(true); }
          return;
        }
        const dl = FileSystem.createDownloadResumable(pdfUrl, localUri, { headers: { 'X-Lang': lang } }, (progress) => {
          // progress callback — can be used for timeout detection
        });
        const timeout = setTimeout(() => {
          if (!cancelled) dl.cancelAsync();
        }, 15000);
        const result = await dl.downloadAsync();
        clearTimeout(timeout);
        if (result && !cancelled) {
          cachedUriRef.current = result.uri;
          setPdfCached(true);
        }
      } catch (e) {
        if (!cancelled) {
          // Cache failed silently — download/share will fall back to direct download
          console.warn('PDF pre-cache failed:', e);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [pdfUrl, batchId]);

  // Download PDF — for invoice (batchId=0) always re-download to ensure correct filename;
  // for procurement (batchId>0) reuse cached file (matches web: no extra request)
  const handleDownload = useCallback(async () => {
    setActionLoading('download');
    try {
      const fileName = batchId ? `procurement_${batchId}_${lang}.pdf` : `${title}.pdf`;
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;
      const useCache = batchId > 0 && pdfCached;
      if (!useCache) {
        const dl = FileSystem.createDownloadResumable(pdfUrl, localUri, { headers: { 'X-Lang': lang } });
        const timeout = setTimeout(() => dl.cancelAsync(), 15000);
        const result = await dl.downloadAsync();
        clearTimeout(timeout);
        if (!result) throw new Error('下载超时');
        await Share.share({ url: result.uri, title: fileName });
      } else {
        await Share.share({ url: cachedUriRef.current, title: fileName });
      }
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        setError(err?.message || '下载失败');
      }
    } finally {
      setActionLoading(null);
    }
  }, [pdfUrl, batchId, pdfCached]);

  // Export image — downloads PNG from server (backend converts first PDF page to PNG)
  const handleExportImage = useCallback(async () => {
    setActionLoading('images');
    try {
      const fileName = batchId ? `procurement_${batchId}.png` : `${title}.png`;
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;
      const dl = FileSystem.createDownloadResumable(pngUrl, localUri, { headers: { 'X-Lang': lang } });
      const timeout = setTimeout(() => dl.cancelAsync(), 15000);
      const result = await dl.downloadAsync();
      clearTimeout(timeout);
      if (!result) throw new Error('导出超时');
      await Share.share({ url: result.uri, title: fileName });
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        setError(err?.message || '导出失败');
      }
    } finally {
      setActionLoading(null);
    }
  }, [pngUrl, batchId, lang]);

  const isActionLoading = actionLoading !== null;

  return (
    <View style={styles.root}>
      <BlurView
        intensity={24}
        tint="light"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
        }}
      />
      <StatusBar barStyle="dark-content" />
      <View
        {...headerPan.panHandlers}
        style={{
          position: 'absolute',
          top: safeTop - 5,
          left: 0,
          right: 0,
          zIndex: 90,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingTop: 0,
          paddingBottom: 6,
          paddingHorizontal: 16,
          backgroundColor: 'transparent',
        }}
      >
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} disabled={isActionLoading}>
          <View style={styles.backBtn}>
            <BackArrowSvg />
          </View>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <TouchableOpacity onPress={handleDownload} activeOpacity={0.7} disabled={isActionLoading}>
          <View style={styles.shareBtn}>
            {actionLoading === 'download' ? (
              <LoadingSpinner label={false} size={16} color="#2C2626" />
            ) : (
              <DownloadSvg />
            )}
          </View>
        </TouchableOpacity>
        {pngUrl !== '' && (
          <TouchableOpacity onPress={handleExportImage} activeOpacity={0.7} disabled={isActionLoading}>
            <View style={styles.shareBtn}>
              {actionLoading === 'images' ? (
                <LoadingSpinner label={false} size={16} color="#2C2626" />
              ) : (
                <ImageDownloadSvg />
              )}
            </View>
          </TouchableOpacity>
        )}
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
            opaque={false}
            allowFileAccess={true}
            allowingReadAccessToURL={isLocal ? pdfUrl.substring(0, pdfUrl.lastIndexOf('/')) : undefined}
            originWhitelist={['*']}
            javaScriptEnabled={!isLocal}
            onLoadEnd={() => setLoading(false)}
            onError={(e) => { setError(e.nativeEvent.description || '加载失败'); setLoading(false); }}
            scalesPageToFit
            startInLoadingState={false}
          />
        )}
        {loading && !error && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <LoadingSpinner
              labelText={batchId > 0 ? t('pdfGenerating') : t('loading')}
              footer={<Text style={styles.loadingSec}>{introSec}s</Text>}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const getStyles = (c: ThemeColors) => {
  const btnBg = (op: number) => {
    const r = parseInt(c.bg.slice(1,3), 16);
    const g = parseInt(c.bg.slice(3,5), 16);
    const b = parseInt(c.bg.slice(5,7), 16);
    return `rgba(${r},${g},${b},${op})`;
  };
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: btnBg(0.30),
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: FONTS.sub.size,
    color: '#000',
  },
  webviewWrap: { flex: 1, backgroundColor: 'transparent' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    zIndex: 5,
  },
  loadingSec: {
    fontSize: FONTS.sub.size,
    fontWeight: '800' as const,
    color: c.primary,
    marginTop: 4,
  },
  errorWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, gap: 12,
  },
  errorTitle: { fontSize: FONTS.body.size, fontWeight: '600', color: c.textMain },
  errorMsg: { fontSize: FONTS.small.size, color: c.textSub, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 28, paddingVertical: 10,
    borderRadius: 8, backgroundColor: c.primary,
  },
  retryBtnText: { fontSize: FONTS.small.size, fontWeight: '600', color: '#fff' },
});
};
