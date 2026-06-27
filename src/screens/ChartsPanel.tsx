import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect, Line, Circle, G, Text as SvgText } from 'react-native-svg';
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

// ── Category → fixed color mapping (matches web light theme) ──
const CAT_COLORS_LIGHT: Record<string, string> = {
  daily:      '#4A7299', // blue
  rent:       '#7D2329', // burgundy
  salary:     '#D59A53', // gold
  goods:      '#4C7A5D', // green
  other:      '#8C8583', // grey
  eleme:      '#B34149', // light red
  meituan:    '#C5A880', // sand
  wages:      '#9B6B9E', // purple
};
const CAT_COLORS_DARK: Record<string, string> = {
  daily:      '#6B9AC7',
  rent:       '#A8454D',
  salary:     '#E8B86D',
  goods:      '#6BA87A',
  other:      '#A8A3A0',
  eleme:      '#D46B73',
  meituan:    '#D9C4A0',
  wages:      '#B88DB8',
};
const FALLBACK_COLORS = ['#4A7299','#7D2329','#D59A53','#4C7A5D','#8C8583','#B34149','#C5A880','#9B6B9E'];

function getCatColor(key: string, isLight: boolean, idx: number): string {
  const map = isLight ? CAT_COLORS_LIGHT : CAT_COLORS_DARK;
  if (map[key]) return map[key];
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

/** Compact ¥ formatter (used for axis ticks) */
const fmtY = (v: number) => {
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + 'w';
  return String(Math.round(v));
};

const monthName = (n: number) => {
  // Fall back to number when i18n key is missing in iOS
  try { return (t(('month' + n) as any) as string) || String(n); } catch { return String(n); }
};

// ── SVG icons for month/day toggle ──
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

// ────────────────────────────────────────────────────────────
// LineChart — simple SVG line + dots, no axes (labels overlaid manually)
// ────────────────────────────────────────────────────────────
interface LineChartProps {
  labels: string[];
  series: { key: string; color: string; values: number[] }[];
  width: number;
  height: number;
  isLight: boolean;
  axisColor: string;
  tickColor: string;
}
function SimpleLineChart({ labels, series, width, height, isLight, axisColor, tickColor }: LineChartProps) {
  const padL = 36, padR = 12, padT = 12, padB = 22;
  const w = width - padL - padR;
  const h = height - padT - padB;
  if (labels.length === 0 || w <= 0 || h <= 0) return null;

  // Y range across all series
  const allVals = series.flatMap(s => s.values);
  const minV = Math.min(0, ...allVals);
  const maxV = Math.max(1, ...allVals);
  const range = maxV - minV || 1;

  const xFor = (i: number) => padL + (labels.length === 1 ? w / 2 : (i * w) / (labels.length - 1));
  const yFor = (v: number) => padT + h - ((v - minV) / range) * h;

  // Y grid lines (4 ticks)
  const yTicks = 4;
  const gridLines: number[] = [];
  for (let i = 0; i <= yTicks; i++) gridLines.push(padT + (h * i) / yTicks);

  // Build path strings per series
  const seriesPaths = series.map(s => {
    if (s.values.length === 0) return '';
    const pts = s.values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' L ');
    return `M ${pts}`;
  });

  // X labels — thin out if many
  const labelStep = labels.length > 8 ? Math.ceil(labels.length / 6) : 1;

  return (
    <Svg width={width} height={height}>
      {/* Grid */}
      {gridLines.map((y, i) => (
        <Line key={'g' + i} x1={padL} y1={y} x2={padL + w} y2={y} stroke={axisColor} strokeWidth={1} strokeDasharray="3,3" />
      ))}
      {/* Y tick labels (5 ticks) */}
      {gridLines.map((y, i) => {
        const v = maxV - ((y - padT) / h) * range;
        return (
          <SvgText key={'yt' + i} x={padL - 4} y={y + 3} fontSize={9} fill={tickColor} textAnchor="end">
            {fmtY(v)}
          </SvgText>
        );
      })}
      {/* X axis line */}
      <Line x1={padL} y1={padT + h} x2={padL + w} y2={padT + h} stroke={axisColor} strokeWidth={1} />
      {/* X labels */}
      {labels.map((lbl, i) => i % labelStep === 0 ? (
        <SvgText key={'xl' + i} x={xFor(i)} y={padT + h + 14} fontSize={9} fill={tickColor} textAnchor="middle">
          {lbl}
        </SvgText>
      ) : null)}
      {/* Series paths */}
      {seriesPaths.map((d, i) => (
        <Path key={'s' + i} d={d} stroke={series[i].color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {/* Dots for last point of each series */}
      {series.map((s, si) => s.values.length > 0 ? (
        <Circle key={'d' + si} cx={xFor(s.values.length - 1)} cy={yFor(s.values[s.values.length - 1])} r={3} fill={s.color} />
      ) : null)}
    </Svg>
  );
}

// ────────────────────────────────────────────────────────────
// AreaLineChart — line with translucent fill below it
// ────────────────────────────────────────────────────────────
interface AreaLineProps {
  labels: string[];
  values: number[];
  color: string;
  width: number;
  height: number;
  axisColor: string;
  tickColor: string;
}
function SimpleAreaLineChart({ labels, values, color, width, height, axisColor, tickColor }: AreaLineProps) {
  const padL = 36, padR = 12, padT = 12, padB = 22;
  const w = width - padL - padR;
  const h = height - padT - padB;
  if (labels.length === 0 || w <= 0 || h <= 0) return null;

  const minV = Math.min(0, ...values);
  const maxV = Math.max(1, ...values);
  const range = maxV - minV || 1;

  const xFor = (i: number) => padL + (labels.length === 1 ? w / 2 : (i * w) / (labels.length - 1));
  const yFor = (v: number) => padT + h - ((v - minV) / range) * h;

  const yTicks = 4;
  const gridLines: number[] = [];
  for (let i = 0; i <= yTicks; i++) gridLines.push(padT + (h * i) / yTicks);

  const linePts = values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' L ');
  const linePath = `M ${linePts}`;
  // Area: line down to baseline, then across, then back up
  const areaPath = `M ${xFor(0)},${padT + h} L ${linePts} L ${xFor(values.length - 1)},${padT + h} Z`;

  const labelStep = labels.length > 8 ? Math.ceil(labels.length / 6) : 1;

  return (
    <Svg width={width} height={height}>
      {gridLines.map((y, i) => (
        <Line key={'g' + i} x1={padL} y1={y} x2={padL + w} y2={y} stroke={axisColor} strokeWidth={1} strokeDasharray="3,3" />
      ))}
      {gridLines.map((y, i) => {
        const v = maxV - ((y - padT) / h) * range;
        return (
          <SvgText key={'yt' + i} x={padL - 4} y={y + 3} fontSize={9} fill={tickColor} textAnchor="end">
            {fmtY(v)}
          </SvgText>
        );
      })}
      <Line x1={padL} y1={padT + h} x2={padL + w} y2={padT + h} stroke={axisColor} strokeWidth={1} />
      {labels.map((lbl, i) => i % labelStep === 0 ? (
        <SvgText key={'xl' + i} x={xFor(i)} y={padT + h + 14} fontSize={9} fill={tickColor} textAnchor="middle">
          {lbl}
        </SvgText>
      ) : null)}
      <Path d={areaPath} fill={withAlpha(color, 0.15)} />
      <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {values.length > 0 ? (
        <Circle cx={xFor(values.length - 1)} cy={yFor(values[values.length - 1])} r={3} fill={color} />
      ) : null}
    </Svg>
  );
}

// ────────────────────────────────────────────────────────────
// DonutChart — SVG arc slices
// ────────────────────────────────────────────────────────────
interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  size: number;
}
function SimpleDonutChart({ data, size }: DonutChartProps) {
  if (data.length === 0) return null;
  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) return null;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.62;
  let startAngle = -Math.PI / 2;

  const polar = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  return (
    <Svg width={size} height={size}>
      {data.map((d, i) => {
        const sweep = (d.value / total) * Math.PI * 2;
        const endAngle = startAngle + sweep;
        const largeArc = sweep > Math.PI ? 1 : 0;
        const oStart = polar(startAngle, outerR);
        const oEnd = polar(endAngle, outerR);
        const iStart = polar(startAngle, innerR);
        const iEnd = polar(endAngle, innerR);
        const path = `M ${oStart.x} ${oStart.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${oEnd.x} ${oEnd.y} L ${iEnd.x} ${iEnd.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${iStart.x} ${iStart.y} Z`;
        startAngle = endAngle;
        return <Path key={i} d={path} fill={d.color} />;
      })}
      {/* Center text */}
      <SvgText x={cx} y={cy - 4} fontSize={11} fill="#888" textAnchor="middle">{t('total' as any) || 'Total'}</SvgText>
      <SvgText x={cx} y={cy + 12} fontSize={13} fontWeight="700" fill="#333" textAnchor="middle">{fmtY(total)}</SvgText>
    </Svg>
  );
}

// ────────────────────────────────────────────────────────────
// BarChart — horizontal or vertical bars
// ────────────────────────────────────────────────────────────
interface BarChartProps {
  data: { name: string; value: number; color: string }[];
  width: number;
  height: number;
  axisColor: string;
  tickColor: string;
}
function SimpleBarChart({ data, width, height, axisColor, tickColor }: BarChartProps) {
  const padL = 80, padR = 16, padT = 8, padB = 8;
  const w = width - padL - padR;
  const h = height - padT - padB;
  if (data.length === 0 || w <= 0 || h <= 0) return null;

  const maxV = Math.max(1, ...data.map(d => d.value));
  const rowH = h / data.length;
  const barH = Math.min(20, rowH * 0.55);

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const cy = padT + rowH * i + rowH / 2;
        const bw = (d.value / maxV) * w;
        return (
          <G key={i}>
            <SvgText x={padL - 6} y={cy + 3} fontSize={10} fill={tickColor} textAnchor="end">{d.name}</SvgText>
            <Rect x={padL} y={cy - barH / 2} width={Math.max(1, bw)} height={barH} fill={d.color} rx={3} />
            <SvgText x={padL + bw + 4} y={cy + 3} fontSize={9} fill={tickColor} textAnchor="start">{fmtY(d.value)}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────
export default function ChartsPanel({
  months, income, expense, profit, categories,
  dailyDates, dailyIncome, dailyExpense,
  dailyProfitDates, dailyProfitValues,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [showBar, setShowBar] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [showDailyProfit, setShowDailyProfit] = useState(false);
  const hasDaily = !!(dailyDates?.length);
  const hasDailyProfit = !!(dailyProfitDates?.length);

  // Current month number from the data
  const currentMonth = months.length > 0 ? parseInt(months[months.length - 1].slice(5), 10) : new Date().getMonth() + 1;

  // Theme/axis colors
  const isLight = colors.surface?.toLowerCase?.() !== '#141416';
  const axisColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const tickColor = isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
  const subTextColor = colors.textSub;
  const cardBg = colors.surface;
  const cardBorder = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

  // Chart 1 data: monthly OR daily income/expense
  const incomeLabel = t('income');
  const expenseLabel = t('expense');
  const profitLabel = t('profit');

  const monthlyLabels = months.map(m => monthName(parseInt(m.slice(5), 10)));
  const dailyLabels = (dailyDates || []).map(d => String(parseInt(d.slice(8), 10)));

  // Chart 3 data: donut / bar — translate category keys
  const donutData = useMemo(() => Object.entries(categories)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ key, name: (t(key as any) as string) || key, value }))
    .sort((a, b) => b.value - a.value), [categories]);

  const CHART_W = 320; // fixed width — the parent is centered
  const CHART_H = 200;

  return (
    <View style={{ gap: 12, marginTop: 0 }}>
      {/* ── 收支趋势（月度 / 每日切换） ── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.titleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.title, { color: subTextColor }]}>
              {showDaily ? (t('dailyTrend') as string) : (t('monthlyTrend') as string)}
            </Text>
            {hasDaily && (
              <TouchableOpacity
                onPress={() => setShowDaily(!showDaily)}
                activeOpacity={0.7}
                style={[styles.toggleBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }]}
              >
                {showDaily ? <MonthIcon size={15} color={colors.primary} /> : <DayIcon size={15} color={colors.primary} />}
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.axisHint, { color: tickColor }]}>
            {(showDaily && hasDaily ? (t('chartXAxisDay') as string) : (t('chartXAxis') as string)) + ' · ' + (t('chartYAxis') as string)}
          </Text>
        </View>
        <View style={styles.chartWrap}>
          <SimpleLineChart
            labels={showDaily && hasDaily ? dailyLabels : monthlyLabels}
            series={[
              { key: incomeLabel, color: colors.primary, values: showDaily && hasDaily ? (dailyIncome || []) : income },
              { key: expenseLabel, color: colors.warning, values: showDaily && hasDaily ? (dailyExpense || []) : expense },
            ]}
            width={CHART_W} height={CHART_H} isLight={isLight} axisColor={axisColor} tickColor={tickColor}
          />
          <View style={styles.legendRow}>
            <LegendDot color={colors.primary} label={incomeLabel} subTextColor={subTextColor} />
            <LegendDot color={colors.warning} label={expenseLabel} subTextColor={subTextColor} />
          </View>
        </View>
      </View>

      {/* ── 月度利润趋势 ── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.titleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.title, { color: subTextColor }]}>
              {showDailyProfit ? ((t('dailyProfit') as string) || (t('dailyTrend') as string)) : (t('monthlyProfit') as string)}
            </Text>
            {hasDailyProfit && (
              <TouchableOpacity
                onPress={() => setShowDailyProfit(!showDailyProfit)}
                activeOpacity={0.7}
                style={[styles.toggleBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }]}
              >
                {showDailyProfit ? <MonthIcon size={15} color={colors.primary} /> : <DayIcon size={15} color={colors.primary} />}
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.axisHint, { color: tickColor }]}>
            {(showDailyProfit ? (t('chartXAxisDay') as string) : (t('chartXAxis') as string)) + ' · ' + (t('chartYAxis') as string)}
          </Text>
        </View>
        <View style={styles.chartWrap}>
          <SimpleAreaLineChart
            labels={showDailyProfit && hasDailyProfit
              ? (dailyProfitDates || []).map(d => String(parseInt(d.slice(8), 10)))
              : monthlyLabels}
            values={showDailyProfit && hasDailyProfit
              ? (dailyProfitValues || [])
              : profit}
            color={colors.accent}
            width={CHART_W} height={CHART_H} axisColor={axisColor} tickColor={tickColor}
          />
          <View style={styles.legendRow}>
            <LegendDot color={colors.accent} label={profitLabel} subTextColor={subTextColor} />
          </View>
        </View>
      </View>

      {/* ── 支出分类占比（环形图 / 柱状图切换） ── */}
      {donutData.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { marginBottom: 0 }]}>
              {monthName(currentMonth) + (t('expenseBreakdownOfMonth') as string)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: tickColor, fontSize: 10 }}>{t('chartSwitchHint' as any) as string}</Text>
              <TouchableOpacity
                onPress={() => setShowBar(!showBar)}
                activeOpacity={0.7}
                style={[styles.toggleBtnLg, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }]}
              >
                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>
                  {showBar ? (t('chartSwitchPie') as string) : (t('chartSwitchBar') as string)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.chartWrap, { alignItems: 'center' }]}>
            {showBar ? (
              <SimpleBarChart
                data={donutData.map((d, i) => ({ name: d.name, value: d.value, color: getCatColor(d.key, isLight, i) }))}
                width={CHART_W} height={240} axisColor={axisColor} tickColor={tickColor}
              />
            ) : (
              <SimpleDonutChart
                data={donutData.map((d, i) => ({ name: d.name, value: d.value, color: getCatColor(d.key, isLight, i) }))}
                size={180}
              />
            )}
            {/* Color legend */}
            <View style={styles.colorLegend}>
              {donutData.map((d, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getCatColor(d.key, isLight, i) }} />
                  <Text style={{ color: subTextColor, fontSize: 11, fontWeight: '500' }}>{d.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function LegendDot({ color, label, subTextColor }: { color: string; label: string; subTextColor: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 10, height: 3, backgroundColor: color, borderRadius: 1 }} />
      <Text style={{ color: subTextColor, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: withAlpha(colors.textSub, 0.1),
    backgroundColor: colors.surface,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    ...FONTS.subBold,
    color: colors.textSub,
  },
  axisHint: {
    fontSize: 10,
    color: colors.textSub,
  },
  toggleBtn: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  toggleBtnLg: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
  },
  chartWrap: {
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  colorLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 8,
  },
});
