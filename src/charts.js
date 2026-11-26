import {
  fuzzifyTemp,
  fuzzifyNoise,
  fuzzifyLight,
  membershipOutput,
  aggregatedMembershipAt
} from './fuzzyEngine.js';

function getPalette() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    return {
      text: '#F4EDE2', muted: '#C4B3A3', grid: 'rgba(196, 179, 163, 0.16)',
      accent: '#ED7D55', accentFill: 'rgba(237, 125, 85, 0.28)',
      low: '#F48687', mid: '#F2B84B', high: '#6BD496', badgeFg: '#17120F'
    };
  }
  return {
    text: '#211813', muted: '#5C473B', grid: 'rgba(92, 71, 59, 0.15)',
    accent: '#A63A1B', accentFill: 'rgba(166, 58, 27, 0.24)',
    low: '#9E2A2B', mid: '#804E00', high: '#1F5C3A', badgeFg: '#FFFDF8'
  };
}

// Draws the vertical marker for the crisp input value or the Z* centroid.
const verticalMarkerPlugin = {
  id: 'verticalMarker',
  afterDatasetsDraw(chart, _args, options) {
    if (!options || typeof options.value !== 'number') return;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    if (!xScale || !yScale) return;

    const xPos = xScale.getPixelForValue(options.value);
    if (xPos < xScale.left || xPos > xScale.right) return;

    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash(options.dash || [5, 4]);
    ctx.lineWidth = options.lineWidth || 2;
    ctx.strokeStyle = options.color || '#A63A1B';
    ctx.moveTo(xPos, yScale.top);
    ctx.lineTo(xPos, yScale.bottom);
    ctx.stroke();

    if (options.label) {
      ctx.setLineDash([]);
      ctx.font = '700 11px "Cascadia Mono", Consolas, monospace';
      const boxW = ctx.measureText(options.label).width + 12;
      const boxH = 20;
      let boxX = xPos - boxW / 2;
      if (boxX < xScale.left + 2) boxX = xScale.left + 2;
      if (boxX + boxW > xScale.right - 2) boxX = xScale.right - boxW - 2;
      const boxY = yScale.top + 4;

      ctx.fillStyle = options.badgeBg || options.color || '#A63A1B';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 4);
      ctx.fill();

      ctx.fillStyle = options.badgeFg || '#FFFDF8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.label, boxX + boxW / 2, boxY + boxH / 2);
    }
    ctx.restore();
  }
};

function generateRange(min, max, step = 1) {
  const pts = [];
  for (let v = min; v <= max + 1e-9; v += step) pts.push(Math.round(v * 100) / 100);
  return pts;
}

function reducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export class FuzzyChartsManager {
  constructor() {
    this.charts = {};
    this.ready = false;
  }

  init() {
    const ChartGlobal = window.Chart;
    if (!ChartGlobal) return false;
    ChartGlobal.register(verticalMarkerPlugin);
    this.ready = true;
    this.createLineCharts();
    return true;
  }

  baseOptions(minX, maxX, xTitle, palette, markerOpts) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion() ? false : { duration: 180 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: palette.text, boxWidth: 10, boxHeight: 10, padding: 8, font: { size: 10, weight: '600' } }
        },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(2).replace('.', ',')}` }
        },
        verticalMarker: markerOpts
      },
      scales: {
        x: {
          type: 'linear', min: minX, max: maxX,
          title: { display: true, text: xTitle, color: palette.muted, font: { size: 11, weight: '600' } },
          ticks: { color: palette.muted, font: { size: 10 } },
          grid: { color: palette.grid }
        },
        y: {
          min: 0, max: 1.05,
          ticks: {
            stepSize: 0.25, color: palette.muted, font: { size: 10 },
            callback: (val) => (val <= 1 ? val.toFixed(2).replace('.', ',') : '')
          },
          grid: { color: palette.grid }
        }
      }
    };
  }

  marker(palette, value, label, solid = false) {
    return {
      value, label,
      color: palette.accent, badgeBg: palette.accent, badgeFg: palette.badgeFg,
      dash: solid ? [] : undefined, lineWidth: solid ? 2.5 : 2
    };
  }

  inputChart(canvasId, key, range, sets, fuzzify, title, markerVal, markerPrefix) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const palette = getPalette();
    const colors = [sets[0][1], sets[1][1], sets[2][1]].map((c) => palette[c]);
    this.charts[key] = new window.Chart(canvas, {
      type: 'line',
      data: {
        datasets: sets.map(([name], i) => ({
          label: name,
          data: range.map((x) => ({ x, y: fuzzify(x)[name] })),
          borderColor: colors[i],
          borderWidth: 2,
          borderDash: i === 1 ? [6, 3] : [],
          pointRadius: 0,
          tension: 0
        }))
      },
      options: this.baseOptions(range[0], range[range.length - 1], title, palette, this.marker(palette, markerVal, `${markerPrefix} = ${markerVal}`))
    });
  }

  createLineCharts() {
    this.inputChart('temp-chart', 'temp', generateRange(16, 36, 0.5), [['Dingin', 'mid'], ['Nyaman', 'high'], ['Panas', 'low']], fuzzifyTemp, 'Suhu Ruangan (°C)', 25, 'x');
    this.inputChart('noise-chart', 'noise', generateRange(30, 100, 1), [['Tenang', 'high'], ['Sedang', 'mid'], ['Bising', 'low']], fuzzifyNoise, 'Kebisingan (dB)', 60, 'y');
    this.inputChart('light-chart', 'light', generateRange(0, 600, 5), [['Redup', 'low'], ['Cukup', 'mid'], ['Terang', 'high']], fuzzifyLight, 'Pencahayaan (Lux)', 300, 'z');

    const outCanvas = document.getElementById('output-chart');
    if (!outCanvas) return;
    const palette = getPalette();
    const ws = generateRange(0, 100, 1);
    const outSet = (label, color, order) => ({
      label,
      data: ws.map((w) => ({ x: w, y: membershipOutput(w)[label] })),
      borderColor: palette[color], borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0, fill: false, tension: 0, order
    });
    this.charts.output = new window.Chart(outCanvas, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Area Agregasi Centroid', data: ws.map((w) => ({ x: w, y: 0 })),
            borderColor: palette.accent, backgroundColor: palette.accentFill, borderWidth: 2.5, fill: true, pointRadius: 0, tension: 0, order: 1
          },
          outSet('Tidak Nyaman', 'low', 2),
          outSet('Cukup Nyaman', 'mid', 3),
          outSet('Sangat Ideal', 'high', 4)
        ]
      },
      options: this.baseOptions(0, 100, 'Skor Kenyamanan Ruang Kerja (w)', palette, this.marker(palette, 75, 'Z* = 75,00', true))
    });
  }

  updateAll(evalResult) {
    if (!this.ready || !evalResult) return;
    const palette = getPalette();
    const { temp, noise, light } = evalResult.inputs;
    const pairs = [['temp', temp, 'x'], ['noise', noise, 'y'], ['light', light, 'z']];
    for (const [key, val, prefix] of pairs) {
      const chart = this.charts[key];
      if (!chart) continue;
      chart.options.plugins.verticalMarker = this.marker(palette, val, `${prefix} = ${String(val).replace('.', ',')}`);
      chart.update();
    }

    const out = this.charts.output;
    if (out) {
      const zStar = evalResult.centroid.zStar;
      out.data.datasets[0].data = generateRange(0, 100, 1).map((w) => ({ x: w, y: aggregatedMembershipAt(w, evalResult.aggregation).mu }));
      out.options.plugins.verticalMarker = this.marker(palette, zStar, `Z* = ${zStar.toFixed(2).replace('.', ',')}`, true);
      out.update();
    }
  }

  renderComparisonChart(rankedItems) {
    const ChartGlobal = window.Chart;
    const canvas = document.getElementById('compare-bar-chart');
    if (!ChartGlobal || !canvas) return false;
    if (this.charts.compare) {
      this.charts.compare.destroy();
      delete this.charts.compare;
    }
    const palette = getPalette();
    const colorFor = (key) => (key === 'ideal' ? palette.high : key === 'cukup' ? palette.mid : palette.low);

    this.charts.compare = new ChartGlobal(canvas, {
      type: 'bar',
      data: {
        labels: rankedItems.map((item) => item.name),
        datasets: [{
          label: 'Skor Kenyamanan Z* (0-100)',
          data: rankedItems.map((item) => Number(item.calc.centroid.zStar.toFixed(2))),
          backgroundColor: rankedItems.map((item) => colorFor(item.calc.classification.key)),
          borderRadius: 6,
          maxBarThickness: 64
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reducedMotion() ? false : { duration: 180 },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => `Skor Z*: ${Number(c.parsed.y).toFixed(2).replace('.', ',')} / 100` } }
        },
        scales: {
          x: { ticks: { color: palette.text, font: { size: 11, weight: '600' } }, grid: { display: false } },
          y: { min: 0, max: 100, ticks: { stepSize: 20, color: palette.muted, font: { size: 10 } }, grid: { color: palette.grid } }
        }
      }
    });
    return true;
  }

  refreshTheme(evalResult, rankedItems) {
    Object.values(this.charts).forEach((ch) => ch.destroy());
    this.charts = {};
    if (this.ready) {
      this.createLineCharts();
      if (evalResult) this.updateAll(evalResult);
    }
    if (rankedItems && rankedItems.length >= 2) this.renderComparisonChart(rankedItems);
  }
}
