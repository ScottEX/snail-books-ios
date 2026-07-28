import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useLanguage } from '../contexts/LanguageContext';
import { generateChartHTML } from './ChartHTML';

interface Props {
  months: string[];
  income: number[];
  expense: number[];
  profit: number[];
  categories: Record<string, number>;
  categoryNames: Record<string, string>;
  monthNames: Record<string, string>;
  dailyDates?: string[];
  dailyIncome?: number[];
  dailyExpense?: number[];
  dailyProfitDates?: string[];
  dailyProfitValues?: string[];
  isLight: boolean;
  primary: string;
  accent: string;
  warning: string;
  surface: string;
  textSub: string;
}

const SKELETON_HEIGHT = 400;

export default function ChartWebView(props: Props) {
  const [webViewHeight, setWebViewHeight] = useState(SKELETON_HEIGHT);
  const [loaded, setLoaded] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const { language } = useLanguage();

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
      income: language === 'zh' ? '收入' : 'Income',
      expense: language === 'zh' ? '支出' : 'Expense',
      profit: language === 'zh' ? '利润摘要' : 'Profit Summary',
      monthlyTrend: language === 'zh' ? '月度趋势' : 'Monthly Trend',
      dailyTrend: language === 'zh' ? '日趋势' : 'Daily Trend',
      monthlyProfit: language === 'zh' ? '月度利润' : 'Monthly Profit',
      dailyProfit: language === 'zh' ? '日利润' : 'Daily Profit',
      expenseBreakdown: language === 'zh' ? '支出分类' : 'Expense Breakdown',
      chartSwitchPie: language === 'zh' ? '饼图' : 'Pie',
      chartSwitchBar: language === 'zh' ? '柱状图' : 'Bar',
      chartSwitchHint: language === 'zh' ? '点击切换' : 'Tap to switch',
      chartXAxis: language === 'zh' ? '月份' : 'Month',
      chartXAxisDay: language === 'zh' ? '日期' : 'Day',
      chartYAxis: language === 'zh' ? '金额' : 'Amount',
      monthName: language === 'zh' ? '月' : '',
    },
  }), [
    props.months, props.income, props.expense, props.profit,
    props.categories, props.categoryNames, props.monthNames,
    props.dailyDates, props.dailyIncome, props.dailyExpense,
    props.dailyProfitDates, props.dailyProfitValues,
    props.isLight, props.primary, props.accent, props.warning,
    props.surface, props.textSub,
    // Intentionally exclude language to avoid WebView reload on language switch
  ]);

  // Update language via postMessage without regenerating HTML
  useEffect(() => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'lang', lang: language }));
  }, [language]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'height' && data.height > 0) {
        setWebViewHeight(data.height);
      }
    } catch {}
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
        onError={(e) => console.log('[ChartWebView] error:', e.nativeEvent)}
      />
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
    width: '100%',
  },
});
