import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
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

/** Fixed height — generous enough for all 3 charts without dynamic measurement */
const CHART_HEIGHT = 1200;

export default function ChartWebView(props: Props) {
  const webViewRef = useRef<WebView>(null);

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

  // Track WebView load to post language updates
  const loadedRef = useRef(false);

  // When language changes, update via postMessage
  useEffect(() => {
    if (loadedRef.current && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'lang',
        labels: props.labels,
        monthName: props.monthName,
        monthNames: props.monthNames,
        catNames: props.categoryNames,
      }));
    }
  }, [props.labels, props.monthName, props.monthNames, props.categoryNames]);

  return (
    <View style={{ height: CHART_HEIGHT }}>
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
        onLoadEnd={() => { loadedRef.current = true; }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webview: {
    backgroundColor: 'transparent',
  },
});
