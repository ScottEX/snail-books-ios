import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { t } from '../i18n';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';

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

const CAT_COLORS_LIGHT: Record<string, string> = {
  daily: '#4A7299', rent: '#7D2329', salary: '#D59A53',
  goods: '#4C7A5D', other: '#8C8583', eleme: '#B34149',
  meituan: '#C5A880', wages: '#9B6B9E',
};
const CAT_COLORS_DARK: Record<string, string> = {
  daily: '#6B9AC7', rent: '#A8454D', salary: '#E8B86D',
  goods: '#6BA87A', other: '#A8A3A0', eleme: '#D46B73',
  meituan: '#D9C4A0', wages: '#B88DB8',
};
const FALLBACK = ['#4A7299','#7D2329','#D59A53','#4C7A5D','#8C8583','#B34149','#C5A880','#9B6B9E'];

function catColor(key: string, isLight: boolean, i: number) {
  const map = isLight ? CAT_COLORS_LIGHT : CAT_COLORS_DARK;
  return map[key] || FALLBACK[i % FALLBACK.length];
}

const monthName = (s: string) => {
  const m = parseInt(s.slice(5), 10);
  try { const r = t(('month' + m) as any); return typeof r === 'string' ? r : String(m); } catch { return String(m); }
};

const fmtK = (v: number) => {
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + 'w';
  return String(Math.round(v));
};

const MonthIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" />
    <Path d="M3 10h18" stroke={color} strokeWidth="1.5" />
    <Path d="M8 2v4M16 2v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const DayIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.5" />
    <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

function ToggleBtn({ on, onPress, colors, isLight }: { on: boolean; onPress: () => void; colors: ThemeColors; isLight: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={{
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
        backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
      }}>
      {on ? <MonthIcon size={15} color={colors.primary} /> : <DayIcon size={15} color={colors.primary} />}
    </TouchableOpacity>
  );
}

export default function ChartsPanel({
  months, income, expense, profit, categories,
  dailyDates, dailyIncome, dailyExpense,
  dailyProfitDates, dailyProfitValues,
}: Props) {
  const { colors } = useTheme();
  const [showDaily, setShowDaily] = useState(false);
  const [showDailyProfit, setShowDailyProfit] = useState(false);
  const [showPie, setShowPie] = useState(true);
  const hasDaily = !!(dailyDates?.length);
  const hasDailyProfit = !!(dailyProfitDates?.length);
  const currentMonth = months.length > 0 ? parseInt(months[months.length - 1].slice(5), 10) : new Date().getMonth() + 1;
  const w = Dimensions.get('window').width - 64;

  // ── Theme detection (matching web) ──
  const isLight = colors.surface?.toLowerCase?.() !== '#141416';
  const axisColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const tickColor = isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
  const cardBorder = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

  const monthlyLabels = months.map(monthName);
  const dailyLabels = (dailyDates || []).map(d => String(parseInt(d.slice(8), 10)));

  // ── Line chart data (income + expense) ──
  const lineLabels = showDaily && hasDaily ? dailyLabels : monthlyLabels;
  const incomeVals = showDaily && hasDaily ? (dailyIncome || []) : income;
  const expenseVals = showDaily && hasDaily ? (dailyExpense || []) : expense;

  const lineData = lineLabels.map((lbl, i) => ({
    value: incomeVals[i] || 0,
    label: i % Math.max(1, Math.floor(lineLabels.length / 3)) === 0 ? lbl : '',
    dataPointText: '',
  }));

  const lineData2 = lineLabels.map((lbl, i) => ({
    value: expenseVals[i] || 0,
    dataPointText: '',
  }));

  // ── Profit line data ──
  const profitLabels = showDailyProfit && hasDailyProfit
    ? (dailyProfitDates || []).map(d => String(parseInt(d.slice(8), 10)))
    : monthlyLabels;
  const profitVals = showDailyProfit && hasDailyProfit ? (dailyProfitValues || []) : profit;

  const profitData = profitLabels.map((lbl, i) => ({
    value: profitVals[i] || 0,
    label: i % Math.max(1, Math.floor(profitLabels.length / 3)) === 0 ? lbl : '',
    dataPointText: '',
  }));

  // ── Category pie/bar data ──
  const catEntries = useMemo(() =>
    Object.entries(categories)
      .filter(([, v]) => v > 0)
      .map(([key, value], i) => ({
        key,
        name: (t(key as any) as string) || key,
        value,
        color: catColor(key, isLight, i),
      }))
      .sort((a, b) => b.value - a.value),
  [categories, isLight]);

  const pieData = catEntries.map(d => ({ value: d.value, color: d.color, text: d.name }));
  const barData = catEntries.map(d => ({
    value: d.value,
    label: d.name,
    frontColor: d.color,
    topLabelComponent: () => (
      <Text style={{ color: colors.textSub, fontSize: 9 }}>{fmtK(d.value)}</Text>
    ),
  }));

  // ── Axis hints ──
  const xLabel = t('chartXAxis');
  const yLabel = t('chartYAxis');

  return (
    <View style={{ gap: 12, marginTop: 0 }}>
      {/* ── 收支趋势 ── */}
      <View style={[st.card, { backgroundColor: colors.surface, borderColor: cardBorder }]}>
        <View style={[st.titleRow, { alignItems: 'baseline' as any }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[st.title, { color: colors.textSub }]}>{showDaily ? t('dailyTrend') : t('monthlyTrend')}</Text>
            {hasDaily && <ToggleBtn on={showDaily} onPress={() => setShowDaily(!showDaily)} colors={colors} isLight={isLight} />}
          </View>
          <Text style={[st.hint, { fontSize: 10, fontWeight: '400', color: tickColor }]}>
            {(showDaily && hasDaily ? t('chartXAxisDay') : xLabel) + ' · ' + yLabel}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <LineChart
            data={lineData}
            data2={lineData2}
            width={w}
            height={180}
            color={colors.primary}
            color2={colors.warning}
            isAnimated
            thickness={2}
            noOfSections={4}
            yAxisTextStyle={{ color: colors.textSub, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: colors.textSub, fontSize: 9 }}
            yAxisLabelSuffix=""
            hideRules
            initialSpacing={8}
            endSpacing={8}
            spacing={Math.max(20, w / Math.max(1, lineLabels.length + 1))}
            curved
            areaChart
            startFillColor={withAlpha(colors.primary, 0.08)}
            startFillColor2={withAlpha(colors.warning, 0.08)}
            startOpacity={0.7}
            endOpacity={0}
            rulesColor={axisColor}
            dataPointsColor={colors.primary}
            dataPointsColor2={colors.warning}
            textColor={colors.textSub}
            yAxisColor="transparent"
            xAxisColor={axisColor}
          />
          <View style={st.legend}>
            <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: colors.primary }]} /><Text style={st.legendText}>{t('income')}</Text></View>
            <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: colors.warning }]} /><Text style={st.legendText}>{t('expense')}</Text></View>
          </View>
        </View>
      </View>

      {/* ── 月度利润 ── */}
      <View style={[st.card, { backgroundColor: colors.surface, borderColor: cardBorder }]}>
        <View style={[st.titleRow, { alignItems: 'baseline' as any }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[st.title, { color: colors.textSub }]}>{showDailyProfit ? (t('dailyProfit') || t('dailyTrend')) : t('monthlyProfit')}</Text>
            {hasDailyProfit && <ToggleBtn on={showDailyProfit} onPress={() => setShowDailyProfit(!showDailyProfit)} colors={colors} isLight={isLight} />}
          </View>
          <Text style={[st.hint, { fontSize: 10, fontWeight: '400', color: tickColor }]}>
            {(showDailyProfit ? t('chartXAxisDay') : xLabel) + ' · ' + yLabel}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <LineChart
            data={profitData}
            width={w}
            height={180}
            color={colors.accent}
            isAnimated
            thickness={2}
            noOfSections={4}
            yAxisTextStyle={{ color: colors.textSub, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: colors.textSub, fontSize: 9 }}
            hideRules
            initialSpacing={8}
            endSpacing={8}
            spacing={Math.max(20, w / Math.max(1, profitLabels.length + 1))}
            curved
            areaChart
            startFillColor={withAlpha(colors.accent, 0.12)}
            startOpacity={0.8}
            endOpacity={0}
            rulesColor={axisColor}
            dataPointsColor={colors.accent}
            textColor={colors.textSub}
            yAxisColor="transparent"
            xAxisColor={axisColor}
          />
        </View>
      </View>

      {/* ── 分类占比 ── */}
      {catEntries.length > 0 && (
        <View style={[st.card, { backgroundColor: colors.surface, borderColor: cardBorder }]}>
          <View style={[st.titleRow, { alignItems: 'baseline' as any }]}>
            <Text style={[st.title, { color: colors.textSub }]}>{monthName(months[months.length - 1] || '')}{t('expenseBreakdownOfMonth')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: tickColor, fontSize: 10 }}>{t('chartSwitchHint')}</Text>
              <TouchableOpacity onPress={() => setShowPie(!showPie)} activeOpacity={0.7}
                style={{
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                  backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                }}>
                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>
                  {showPie ? (t('chartSwitchBar') as string) : (t('chartSwitchPie') as string)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ alignItems: 'center' }}>
            {showPie ? (
              <PieChart
                data={pieData}
                donut
                radius={90}
                innerRadius={55}
                innerCircleColor={colors.surface}
                isAnimated
                strokeWidth={2}
                strokeColor={colors.surface}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: colors.textSub }}>{t('total')}</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMain }}>
                      {fmtK(catEntries.reduce((s, d) => s + d.value, 0))}
                    </Text>
                  </View>
                )}
              />
            ) : (
              <BarChart
                data={barData}
                width={w}
                height={200}
                isAnimated
                noOfSections={4}
                yAxisTextStyle={{ color: colors.textSub, fontSize: 9 }}
                xAxisLabelTextStyle={{ color: colors.textSub, fontSize: 9 }}
                yAxisLabelSuffix=""
                hideRules
                initialSpacing={12}
                endSpacing={12}
                barWidth={Math.min(32, w / catEntries.length - 8)}
                spacing={8}
                rulesColor={axisColor}
                yAxisColor="transparent"
                xAxisColor={axisColor}
              />
            )}
            <View style={st.colorLegend}>
              {catEntries.map((d, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color }} />
                  <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '500' }}>{d.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    borderRadius: 14, padding: 16, borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  title: { fontSize: 13, fontWeight: '600' },
  hint: { fontSize: 10, fontWeight: '400' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 3, borderRadius: 1 },
  legendText: { fontSize: 11 },
  colorLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
});
