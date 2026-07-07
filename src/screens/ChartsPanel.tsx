import React, { useMemo } from 'react';
import { t } from '../i18n';
import { useTheme } from '../theme';
import ChartWebView from '../components/ChartWebView';

interface Props {
  months: string[];
  income: number[];
  expense: number[];
  profit: number[];
  categories: Record<string, number>;
  dailyDates?: string[];
  dailyIncome?: number[];
  dailyExpense?: number[];
  dailyProfitDates?: string[];
  dailyProfitValues?: number[];
}

export default function ChartsPanel({
  months, income, expense, profit, categories,
  dailyDates, dailyIncome, dailyExpense,
  dailyProfitDates, dailyProfitValues,
}: Props) {
  const { colors } = useTheme();

  const isLight = colors.surface?.toLowerCase?.() !== '#141416';

  const currentMonth = months.length > 0
    ? parseInt(months[months.length - 1].slice(5), 10)
    : new Date().getMonth() + 1;

  const monthNameLabel = useMemo(() => {
    try {
      const r = t(('month' + currentMonth) as any);
      return typeof r === 'string' ? r : String(currentMonth);
    } catch {
      return String(currentMonth);
    }
  }, [currentMonth]);

  const categoryNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const key of Object.keys(categories)) {
      map[key] = t(key as any) || key;
    }
    return map;
  }, [categories]);

  return (
    <ChartWebView
      months={months}
      income={income}
      expense={expense}
      profit={profit}
      categories={categories}
      categoryNames={categoryNames}
      dailyDates={dailyDates}
      dailyIncome={dailyIncome}
      dailyExpense={dailyExpense}
      dailyProfitDates={dailyProfitDates}
      dailyProfitValues={dailyProfitValues}
      isLight={isLight}
      primary={colors.primary}
      accent={colors.accent}
      warning={colors.warning}
      surface={colors.surface}
      textSub={colors.textSub}
      monthName={monthNameLabel}
      labels={{
        income: t('income'),
        expense: t('expense'),
        profit: t('profit'),
        monthlyTrend: t('monthlyTrend'),
        dailyTrend: t('dailyTrend'),
        monthlyProfit: t('monthlyProfit'),
        dailyProfit: t('dailyProfit') || t('dailyTrend'),
        expenseBreakdown: t('expenseBreakdownOfMonth'),
        chartSwitchPie: t('chartSwitchPie'),
        chartSwitchBar: t('chartSwitchBar'),
        chartSwitchHint: t('chartSwitchHint'),
        chartXAxis: t('chartXAxis'),
        chartXAxisDay: t('chartXAxisDay'),
        chartYAxis: t('chartYAxis'),
      }}
    />
  );
}
