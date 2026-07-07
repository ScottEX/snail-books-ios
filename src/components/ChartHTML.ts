// Generates a self-contained HTML page with Recharts (CDN) that renders
// income/expense line chart, profit area chart, and category donut/bar chart.
// All chart data is embedded as JSON; toggles (daily/monthly, pie/bar) are handled
// entirely inside the WebView via JavaScript — no postMessage needed.

interface ChartData {
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
  dailyProfitValues?: number[];
  theme: {
    isLight: boolean;
    primary: string;
    accent: string;
    warning: string;
    surface: string;
    textSub: string;
  };
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
    monthName: string;
  };
}

export function generateChartHTML(data: ChartData): string {
  const {
    months, income, expense, profit, categories, categoryNames, monthNames,
    dailyDates, dailyIncome, dailyExpense,
    dailyProfitDates, dailyProfitValues,
    theme, labels,
  } = data;

  const hasDaily = !!(dailyDates?.length);
  const hasDailyProfit = !!(dailyProfitDates?.length);

  // Build data arrays
  const lineData = months.map((m, i) => ({
    month: monthNames[String(parseInt(m.slice(5), 10))] || String(parseInt(m.slice(5), 10)),
    income: income[i],
    expense: expense[i],
  }));
  const dailyLineData = hasDaily
    ? (dailyDates || []).map((d, i) => ({
        day: String(parseInt(d.slice(8), 10)),
        income: (dailyIncome || [])[i] || 0,
        expense: (dailyExpense || [])[i] || 0,
      }))
    : [];
  const profitData = months.map((m, i) => ({
    month: monthNames[String(parseInt(m.slice(5), 10))] || String(parseInt(m.slice(5), 10)),
    profit: profit[i],
  }));
  const dailyProfitData = hasDailyProfit
    ? (dailyProfitDates || []).map((d, i) => ({
        day: String(parseInt(d.slice(8), 10)),
        profit: (dailyProfitValues || [])[i] || 0,
      }))
    : [];
  const donutData = Object.entries(categories)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ key, name: categoryNames[key] || key, value }))
    .sort((a, b) => b.value - a.value);

  const catColorLight: Record<string, string> = {
    daily: '#4A7299', rent: '#7D2329', salary: '#D59A53',
    goods: '#4C7A5D', other: '#8C8583', eleme: '#B34149',
    meituan: '#C5A880', wages: '#9B6B9E',
  };
  const catColorDark: Record<string, string> = {
    daily: '#6B9AC7', rent: '#A8454D', salary: '#E8B86D',
    goods: '#6BA87A', other: '#A8A3A0', eleme: '#D46B73',
    meituan: '#D9C4A0', wages: '#B88DB8',
  };
  const catColorFallback = ['#4A7299','#7D2329','#D59A53','#4C7A5D','#8C8583','#B34149','#C5A880','#9B6B9E'];

  // SVG icons for day/month toggle buttons
  const sunSVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="${theme.primary}" stroke-width="1.5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="${theme.primary}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const calendarSVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="${theme.primary}" stroke-width="1.5"/><path d="M3 10h18" stroke="${theme.primary}" stroke-width="1.5"/><path d="M8 2v4M16 2v4" stroke="${theme.primary}" stroke-width="1.5" stroke-linecap="round"/></svg>`;

  const json = JSON.stringify({
    lineData,
    dailyLineData,
    profitData,
    dailyProfitData,
    donutData,
    catColorMap: theme.isLight ? catColorLight : catColorDark,
    catColorFallback,
    hasDaily,
    hasDailyProfit,
    theme,
    labels,
    monthNames,
  });

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { background: transparent; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 0;
    -webkit-text-size-adjust: 100%;
  }
  .card {
    background: ${theme.surface};
    border-radius: 14px;
    padding: 16px;
    margin-top: 12px;
    border: 1px solid ${theme.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'};
  }
  .card:first-child { margin-top: 0; }
  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
  }
  .title {
    font-size: 13px;
    font-weight: 600;
    color: ${theme.textSub};
  }
  .axis-hint {
    font-size: 10px;
    color: ${theme.isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'};
  }
  .toggle-btn {
    padding: 3px 8px;
    border-radius: 6px;
    background: ${theme.isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'};
    border: none;
    cursor: pointer;
    font-size: 11px;
    color: ${theme.primary};
    font-weight: 600;
  }
  .chart-wrap { margin-top: 4px; width: 100%; }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    margin-top: 8px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .legend-dot {
    width: 8px; height: 8px;
    border-radius: 4px;
  }
  .legend-name {
    font-size: 11px;
    font-weight: 500;
    color: ${theme.textSub};
  }
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  [class*="recharts"]:focus { outline: none !important; }
</style>
</head>
<body>
<div id="line-chart" class="card">
  <div class="title-row">
    <div class="toggle-row">
      <span class="title" id="line-title">${labels.monthlyTrend}</span>
      ${hasDaily ? '<button class="toggle-btn" id="toggle-daily">' + sunSVG + '</button>' : ''}
    </div>
    <span class="axis-hint" id="line-axis-hint">${labels.chartXAxis} · ${labels.chartYAxis}</span>
  </div>
  <div class="chart-wrap" id="line-container"></div>
</div>

<div id="profit-chart" class="card">
  <div class="title-row">
    <div class="toggle-row">
      <span class="title" id="profit-title">${labels.monthlyProfit}</span>
      ${hasDailyProfit ? '<button class="toggle-btn" id="toggle-daily-profit">' + sunSVG + '</button>' : ''}
    </div>
    <span class="axis-hint" id="profit-axis-hint">${labels.chartXAxis} · ${labels.chartYAxis}</span>
  </div>
  <div class="chart-wrap" id="profit-container"></div>
</div>

<div id="cat-chart" class="card">
  <div class="title-row">
    <span class="title" id="cat-title">${labels.monthName}${labels.expenseBreakdown}</span>
    <div style="display:flex;align-items:center;gap:6px">
      <span id="cat-switch-hint" style="font-size:10px;color:${theme.isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'}">${labels.chartSwitchHint}</span>
      <button class="toggle-btn" id="toggle-pie-bar">${labels.chartSwitchBar}</button>
    </div>
  </div>
  <div class="chart-wrap" id="cat-container" style="display:flex;flex-direction:column;align-items:center"></div>
  <div class="legend" id="cat-legend"></div>
</div>

<div id="__end"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prop-types/15.8.1/prop-types.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/recharts@2/umd/Recharts.js"></script>
<script>
const DATA = ${json};

const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
        ComposedChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend } = Recharts;

const isLight = DATA.theme.isLight;
const AXIS = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
const TICK = isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';

const fmtY = (v) => Math.abs(v) >= 10000 ? (v/10000).toFixed(1)+'w' : String(Math.round(v));

const SUN_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="' + DATA.theme.primary + '" stroke-width="1.5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="' + DATA.theme.primary + '" stroke-width="1.5" stroke-linecap="round"/></svg>';
const CALENDAR_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="' + DATA.theme.primary + '" stroke-width="1.5"/><path d="M3 10h18" stroke="' + DATA.theme.primary + '" stroke-width="1.5"/><path d="M8 2v4M16 2v4" stroke="' + DATA.theme.primary + '" stroke-width="1.5" stroke-linecap="round"/></svg>';

const CustomTooltip = ({ active, payload, label, monthLabel, accentFallback }) => {
  if (!active || !payload?.length) return null;
  const items = [];
  const seen = new Set();
  for (const p of payload) {
    if (seen.has(p.name)) continue;
    seen.add(p.name);
    items.push(p);
  }
  // Web-style dedup: prefer colored entry when first is colorless
  for (let i = 0; i < items.length; i++) {
    if (!items[i].color) {
      const colored = payload.find(function(q) { return q.name === items[i].name && q.color; });
      if (colored) items[i] = colored;
    }
  }
  return React.createElement('div', {
    style: {
      background: 'rgba(20,20,22,0.95)',
      padding: '8px 12px',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.08)',
    }
  }, [
    monthLabel ? React.createElement('div', { key:'ml', style: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, marginBottom: 6 } }, monthLabel) : null,
    React.createElement('div', { key:'l', style: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginBottom: 4, fontWeight: '500' } }, label),
    ...items.map((p, i) => React.createElement('div', {
      key: i,
      style: { color: accentFallback || p.color || DATA.theme.primary, fontSize: 12, fontWeight: 600 }
    }, p.name + ': ¥' + Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2 })))
  ]);
};

// ── Create roots once ──
const lineRoot = ReactDOM.createRoot(document.getElementById('line-container'));
const profitRoot = ReactDOM.createRoot(document.getElementById('profit-container'));

// ── Income / Expense line chart ──
let showDaily = false;
function renderLine() {
  const src = showDaily ? DATA.dailyLineData : DATA.lineData;
  const dk = showDaily ? 'day' : 'month';
  lineRoot.render(React.createElement(ResponsiveContainer, { width: '100%', height: 200 },
    React.createElement(LineChart, { data: src, margin: { top:8, right:8, left:0, bottom:0 } },
      React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: AXIS }),
      React.createElement(XAxis, { dataKey: dk, tick: { fill: TICK, fontSize: 11 }, axisLine: false, tickLine: false, interval: 0 }),
      React.createElement(YAxis, { tick: { fill: TICK, fontSize: 10 }, axisLine: false, tickLine: false, tickFormatter: fmtY, width: 40 }),
      React.createElement(Tooltip, { content: CustomTooltip }),
      React.createElement(Legend, { wrapperStyle: { fontSize: 11, color: DATA.theme.textSub }, iconType: 'line' }),
      React.createElement(Line, { type: 'monotone', dataKey: 'income', name: DATA.labels.income, stroke: DATA.theme.primary, strokeWidth: 2, dot: false, activeDot: { r: 4, fill: DATA.theme.primary } }),
      React.createElement(Line, { type: 'monotone', dataKey: 'expense', name: DATA.labels.expense, stroke: DATA.theme.warning, strokeWidth: 2, dot: false, activeDot: { r: 4, fill: DATA.theme.warning } }),
    )
  ));
}
function reportHeight() {
  setTimeout(function() {
    var end = document.getElementById('__end');
    var h = end ? end.getBoundingClientRect().top : document.body.scrollHeight;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', height: Math.ceil(h) }));
  }, 300);
}
renderLine();
if (DATA.hasDaily) {
  document.getElementById('toggle-daily').onclick = function() {
    showDaily = !showDaily;
    this.innerHTML = showDaily ? CALENDAR_SVG : SUN_SVG;
    document.getElementById('line-title').textContent = showDaily ? DATA.labels.dailyTrend : DATA.labels.monthlyTrend;
    document.getElementById('line-axis-hint').textContent = showDaily ? DATA.labels.chartXAxisDay + ' · ' + DATA.labels.chartYAxis : DATA.labels.chartXAxis + ' · ' + DATA.labels.chartYAxis;
    renderLine();
    reportHeight();
  };
}

// ── Profit chart ──
let showDailyProfit = false;
function renderProfit() {
  const src = showDailyProfit ? DATA.dailyProfitData : DATA.profitData;
  const dk = showDailyProfit ? 'day' : 'month';
  profitRoot.render(React.createElement(ResponsiveContainer, { width: '100%', height: 200 },
    React.createElement(ComposedChart, { data: src, margin: { top:8, right:8, left:0, bottom:0 } },
      React.createElement('defs', null,
        React.createElement('linearGradient', { id: 'profitGrad', x1:0, y1:0, x2:0, y2:1 },
          React.createElement('stop', { offset: '0%', stopColor: DATA.theme.accent, stopOpacity: 0.15 }),
          React.createElement('stop', { offset: '100%', stopColor: DATA.theme.accent, stopOpacity: 0 }),
        )
      ),
      React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: AXIS }),
      React.createElement(XAxis, { dataKey: dk, tick: { fill: TICK, fontSize: 11 }, axisLine: false, tickLine: false, interval: 0 }),
      React.createElement(YAxis, { tick: { fill: TICK, fontSize: 10 }, axisLine: false, tickLine: false, tickFormatter: fmtY, width: 40 }),
      React.createElement(Tooltip, { content: function(props) { return CustomTooltip({ ...props, accentFallback: DATA.theme.primary }); } }),
      React.createElement(Area, { type: 'monotone', dataKey: 'profit', name: DATA.labels.profit, stroke: 'none', fill: 'url(#profitGrad)' }),
      React.createElement(Line, { type: 'monotone', dataKey: 'profit', name: DATA.labels.profit, stroke: DATA.theme.accent, strokeWidth: 2, dot: false, activeDot: { r: 4, fill: DATA.theme.accent } }),
    )
  ));
}
renderProfit();
if (DATA.hasDailyProfit) {
  document.getElementById('toggle-daily-profit').onclick = function() {
    showDailyProfit = !showDailyProfit;
    this.innerHTML = showDailyProfit ? CALENDAR_SVG : SUN_SVG;
    document.getElementById('profit-title').textContent = showDailyProfit ? DATA.labels.dailyProfit : DATA.labels.monthlyProfit;
    document.getElementById('profit-axis-hint').textContent = showDailyProfit ? DATA.labels.chartXAxisDay + ' · ' + DATA.labels.chartYAxis : DATA.labels.chartXAxis + ' · ' + DATA.labels.chartYAxis;
    renderProfit();
    reportHeight();
  };
}

// ── Category donut / bar chart ──
let showBar = false;
if (DATA.donutData.length > 0) {
  const catColorMap = DATA.catColorMap || {};
  const catColorFallback = DATA.catColorFallback || [];
  function getCatColor(key, i) {
    return catColorMap[key] || catColorFallback[i % catColorFallback.length] || '#888';
  }
  const catRoot = ReactDOM.createRoot(document.getElementById('cat-container'));
  function renderCat() {
    const src = DATA.donutData;
    if (showBar) {
      catRoot.render(React.createElement(ResponsiveContainer, { width: '100%', height: 240 },
        React.createElement(BarChart, { data: src, margin: { top:8, right:8, left:0, bottom:0 } },
          React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: AXIS }),
          React.createElement(XAxis, { dataKey: 'name', tick: { fill: TICK, fontSize: 10 }, axisLine: false, tickLine: false }),
          React.createElement(YAxis, { tick: { fill: TICK, fontSize: 10 }, axisLine: false, tickLine: false, tickFormatter: fmtY, width: 40 }),
          React.createElement(Tooltip, { content: function(props) { return CustomTooltip({ ...props, monthLabel: DATA.labels.monthName }); } }),
          React.createElement(Bar, { dataKey: 'value', radius: [6,6,0,0], maxBarSize: 48 },
            src.map(function(d, i) { return React.createElement(Cell, { key: i, fill: getCatColor(d.key, i) }); })
          ),
        )
      ));
    } else {
      catRoot.render(React.createElement(ResponsiveContainer, { width: '100%', height: 240 },
        React.createElement(PieChart, null,
          React.createElement(Pie, { data: src, cx: '50%', cy: '50%', innerRadius: 55, outerRadius: 85, paddingAngle: 2, dataKey: 'value', stroke: 'none' },
            src.map(function(d, i) { return React.createElement(Cell, { key: i, fill: getCatColor(d.key, i) }); })
          ),
          React.createElement(Tooltip, { content: function(props) { return CustomTooltip({ ...props, monthLabel: DATA.labels.monthName }); } }),
        )
      ));
    }
  }
  renderCat();
  reportHeight();
  document.getElementById('toggle-pie-bar').onclick = function() {
    showBar = !showBar;
    this.textContent = showBar ? DATA.labels.chartSwitchPie : DATA.labels.chartSwitchBar;
    renderCat();
    reportHeight();
  };

  // Color legend
  var leg = document.getElementById('cat-legend');
  DATA.donutData.forEach(function(d, i) {
    var div = document.createElement('div');
    div.className = 'legend-item';
    div.innerHTML = '<div class="legend-dot" style="background:' + getCatColor(d.key, i) + '"></div><span class="legend-name">' + d.name + '</span>';
    leg.appendChild(div);
  });
}

// Language update via postMessage
window.addEventListener('message', function(e) {
  var d;
  try { d = JSON.parse(e.data); } catch(ignore) { return; }
  if (d.type !== 'lang') return;

  if (d.labels) {
    for (var k in d.labels) {
      if (d.labels.hasOwnProperty(k)) DATA.labels[k] = d.labels[k];
    }
  }
  if (d.monthName) DATA.labels.monthName = d.monthName;

  if (d.catNames) {
    DATA.donutData.forEach(function(item) {
      if (d.catNames[item.key]) item.name = d.catNames[item.key];
    });
  }

  if (d.monthNames) {
    DATA.monthNames = d.monthNames;
    function updateMonthLabels(arr) {
      if (!arr) return;
      arr.forEach(function(item) {
        var num = String(item.month).match(/\d+/);
        if (num && DATA.monthNames[num[0]]) item.month = DATA.monthNames[num[0]];
      });
    }
    updateMonthLabels(DATA.lineData);
    updateMonthLabels(DATA.profitData);
  }

  document.getElementById('line-title').textContent = showDaily ? DATA.labels.dailyTrend : DATA.labels.monthlyTrend;
  document.getElementById('profit-title').textContent = showDailyProfit ? DATA.labels.dailyProfit : DATA.labels.monthlyProfit;
  document.getElementById('line-axis-hint').textContent = (showDaily ? DATA.labels.chartXAxisDay : DATA.labels.chartXAxis) + ' · ' + DATA.labels.chartYAxis;
  document.getElementById('profit-axis-hint').textContent = (showDailyProfit ? DATA.labels.chartXAxisDay : DATA.labels.chartXAxis) + ' · ' + DATA.labels.chartYAxis;
  document.getElementById('cat-title').textContent = DATA.labels.monthName + DATA.labels.expenseBreakdown;

  var hint = document.getElementById('cat-switch-hint');
  if (hint) hint.textContent = DATA.labels.chartSwitchHint;
  var toggleBtn = document.getElementById('toggle-pie-bar');
  if (toggleBtn) toggleBtn.textContent = showBar ? DATA.labels.chartSwitchPie : DATA.labels.chartSwitchBar;

  var legendNames = document.querySelectorAll('.legend-name');
  DATA.donutData.forEach(function(item, i) {
    if (legendNames[i]) legendNames[i].textContent = item.name;
  });

  renderLine();
  renderProfit();
  renderCat();
  reportHeight();
});

</script>
</body>
</html>`;
}
