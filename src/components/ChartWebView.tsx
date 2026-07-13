import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { generateChartHTML } from './ChartHTML';

interface Props {
  months: string[];
  income: number[];
  expense: number[];
  profit: number[];
  categories: Record<string, number>;
  categoryNames: Record<string, string>;
  dailyDates?: string[];
  dailyIncome?: number[];
  dailyExpense?: number[];
  dailyProfitDates?: string[];
  dailyProfitValues?: number[];
  isLight: boolean;
  primary: string;
  accent: string;
  warning: string;
  surface: string;
  textSub: string;
  monthNames: Record<string, string>;
  monthName: string;
  labels: {
    income: string;
    expense: string;
    profit: string;
    monthlyTrend: string;
    dailyTrend: string;
    monthlyProfit: string;
    dailyProfit: string;
    expenseBreakdown: string;
    chartSwitchPie: string;
    chartSwitchBar: string;
    chartSwitchHint: string;
  };
}

const SKELETON_HEIGHT = 400;

export default function ChartWebView(props: Props) {
  const [webViewHeight, setWebViewHeight] = useState(SKELETON_HEIGHT);
  const [loaded, setLoaded] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // ── skeleton pulse animation ──
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (loaded) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [loaded, pulse]);

  // HTML only rebuilds when data/theme changes, NOT when language changes
  const html = useMemo(() => generateChartHTML({
    months: props.months,
    income: props.income,
    expense: props.expense,
    profit: props.profit,
    categories: props.categories,
    categoryNames: props.categoryNames,
    monthNames: props.monthNames,
    dailyDates: props.dailyDates,
    dailyIncome: props.dailyIncome,
    dailyExpense: props.dailyExpense,
    dailyProfitDates: props.dailyProfitDates,
    dailyProfitValues: props.dailyProfitValues,
    theme: {
      isLight: props.isLight,
      primary: props.primary,
      accent: props.accent,
      warning: props.warning,
      surface: props.surface,
      textSub: props.textSub,
    },
    labels: {
      ...props.labels,
      monthName: props.monthName,
    },
  }), [
    props.months, props.income, props.expense, props.profit,
    props.categories, props.dailyDates, props.dailyIncome,
    props.dailyExpense, props.dailyProfitDates, props.dailyProfitValues,
    props.isLight, props.primary, props.accent, props.warning,
    props.surface, props.textSub,
  ]);

  // When language changes (labels/monthName/categoryNames), update via postMessage
  useEffect(() => {
    if (loaded && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'lang',
        labels: props.labels,
        monthName: props.monthName,
        monthNames: props.monthNames,
        catNames: props.categoryNames,
      }));
    }
  }, [loaded, props.labels, props.monthName, props.monthNames, props.categoryNames]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'height' && data.height > 0) {
        setWebViewHeight(data.height);
      }
    } catch {}
  }, []);

  return (
    <View style={[styles.container, { height: webViewHeight }]}>
      {/* skeleton overlay — shown until WebView finishes loading */}
      {!loaded && (
        <Animated.View style={[styles.skeleton, { opacity: pulse }]}>
          {/* line chart placeholder */}
          <View style={styles.skLine} />
          <View style={styles.skLine2} />
          <View style={styles.skLine} />
          {/* pie chart placeholder */}
          <View style={styles.skPie} />
        </Animated.View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={[styles.webview, loaded ? {} : styles.webviewHidden]}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        originWhitelist={['*']}
        opaque={false}
        injectedJavaScript={`document.querySelector('html').style.backgroundColor='transparent';true;`}
        onLoadEnd={() => setLoaded(true)}
        onMessage={onMessage}
        onError={(e) => console.log('[ChartWebView] error:', e.nativeEvent)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  webview: {
    backgroundColor: 'transparent',
  },
  webviewHidden: {
    opacity: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // ── skeleton ──
  skeleton: {
    height: SKELETON_HEIGHT,
    padding: 16,
    gap: 14,
  },
  skLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(128,128,128,0.12)',
    width: '100%',
  },
  skLine2: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(128,128,128,0.08)',
    width: '70%',
  },
  skPie: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(128,128,128,0.10)',
    alignSelf: 'center',
    marginTop: 24,
  },
});
