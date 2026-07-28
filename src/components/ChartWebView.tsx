import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
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
    chartXAxis: string;
    chartXAxisDay: string;
    chartYAxis: string;
  };
}

const SKELETON_HEIGHT = 400;

export default function ChartWebView(props: Props) {
  const [webViewHeight, setWebViewHeight] = useState(SKELETON_HEIGHT);
  const [loaded, setLoaded] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const [lastUrl, setLastUrl] = useState('');

  const [navCount, setNavCount] = useState(0);
  const [intUrl, setIntUrl] = useState('');
  const [errMsg, setErrMsg] = useState('');

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

  // When language changes, update via postMessage
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

  const onNavChange = useCallback((navState: WebViewNavigation) => {
    setNavCount(c => c + 1);
    setLastUrl(navState.url || '');
    // Parse height from history.replaceState: /h885
    if (navState.url) {
      const m = navState.url.match(/\/h(\d+)/);
      if (m) {
        const h = parseInt(m[1], 10);
        if (h > 100) setWebViewHeight(h);
      }
    }
  }, []);

  return (
    <View style={{ height: webViewHeight }}>
      {!loaded && <View style={styles.skeleton} />}
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        originWhitelist={['*']}
        injectedJavaScript={`document.querySelector('html').style.backgroundColor='transparent';true;`}
        onLoadEnd={() => setLoaded(true)}
        onMessage={onMessage}
        onNavigationStateChange={onNavChange}
        onShouldStartLoadWithRequest={(req: any) => {
          setIntUrl(req.url ? req.url.slice(-30) : '-');
          if (req.url && req.url.startsWith('chartheight://ERR_')) {
            setErrMsg(req.url.replace('chartheight://ERR_', ''));
            return false;
          }
          if (req.url && req.url.startsWith('chartheight://')) {
            const h = parseInt(req.url.split('chartheight://')[1], 10);
            if (h > 100) setWebViewHeight(h);
            return false;
          }
          return true;
        }}
        onError={(e) => console.log('[ChartWebView] error:', e.nativeEvent)}
      />
      {/* DEBUG: show current WebView container height */}
      <Text style={styles.debug}>{'H:' + webViewHeight + ' I:' + (intUrl ? intUrl.slice(-25) : '-')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  skeleton: {
    height: SKELETON_HEIGHT,
  },
  debug: {
    position: 'absolute',
    top: 4,
    right: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#FF0000',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 999,
  },
});
