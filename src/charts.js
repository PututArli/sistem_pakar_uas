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
      text: '#F4EDE2',
      muted: '#C4B3A3',
      grid: 'rgba(196, 179, 163, 0.16)',
      accent: '#ED7D55',
      accentFill: 'rgba(237, 125, 85, 0.28)',
      low: '#F48687',
      mid: '#F2B84B',
      high: '#6BD496'
    };
  }
  return {
    text: '#211813',
    muted: '#5C473B',
    grid: 'rgba(92, 71, 59, 0.15)',
    accent: '#A63A1B',
    accentFill: 'rgba(166, 58, 27, 0.24)',
    low: '#9E2A2B',
    mid: '#804E00',
    high: '#1F5C3A'
  };
}

// Custom Chart.js plugin to draw vertical marker line for crisp input or Z* centroid
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
      const textWidth = ctx.measureText(options.label).width;
      const padX = 6;
      const boxW = textWidth + padX * 2;
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
  for (let v = min; v <= max + 1e-9; v += step) {
    pts.push(Math.round(v * 100) / 100);
  }
  return pts;
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
    this.createInputCharts();
    this.createOutputChart();
    return true;
  }

  baseOptions(minX, maxX, xTitle, palette, markerOpts) {
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : { duration: 180 },
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: palette.text,
            boxWidth: 10,
            boxHeight: 10,
            padding: 8,
            font: { size: 10, weight: '600' }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(2).replace('.', ',')}`
          }
        },
        verticalMarker: markerOpts
      },
      scales: {
        x: {
          type: 'linear',
          min: minX,
          max: maxX,
          title: {
            display: true,
            text: xTitle,
            color: palette.muted,
            font: { size: 11, weight: '600' }
          },
          ticks: {
            color: palette.muted,
            font: { size: 10 }
          },
          grid: {
            color: palette.grid
          }
        },
        y: {
          min: 0,
          max: 1.05,
          ticks: {
            stepSize: 0.25,
            color: palette.muted,
            font: { size: 10 },
            callback: (val) => (val <= 1 ? val.toFixed(2).replace('.', ',') : '')
          },
          grid: {
            color: palette.grid
          }
        }
      }
    };
  }

  createInputCharts() {
    const ChartGlobal = window.Chart;
    const palette = getPalette();
    const badgeFg = document.documentElement.getAttribute('data-theme') === 'dark' ? '#17120F' : '#FFFDF8';

    const tempXs = generateRange(16, 36, 0.5);
    const tempCtx = document.getElementById('temp-chart');
    if (tempCtx) {
      this.charts.temp = new ChartGlobal(tempCtx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Dingin',
              data: tempXs.map((x) => ({ x, y: fuzzifyTemp(x).Dingin })),
              borderColor: palette.mid,
              borderWidth: 2,
              pointRadius: 0,
              tension: 0
            },
            {
              label: 'Nyaman',
              data: tempXs.map((x) => ({ x, y: fuzzifyTemp(x).Nyaman })),
              borderColor: palette.high,
              borderWidth: 2,
              borderDash: [6, 3],
              pointRadius: 0,
              tension: 0
            },
            {
              label: 'Panas',
              data: tempXs.map((x) => ({ x, y: fuzzifyTemp(x).Panas })),
              borderColor: palette.low,
              borderWidth: 2,
              pointRadius: 0,
              tension: 0
            }
          ]
        },
        options: this.baseOptions(16, 36, 'Suhu Ruangan (°C)', palette, {
          value: 25,
          color: palette.accent,
          badgeBg: palette.accent,
          badgeFg,
          label: 'x = 25'
        })
      });
    }

    const noiseYs = generateRange(30, 100, 1);
    const noiseCtx = document.getElementById('noise-chart');
    if (noiseCtx) {
      this.charts.noise = new ChartGlobal(noiseCtx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Tenang',
              data: noiseYs.map((y) => ({ x: y, y: fuzzifyNoise(y).Tenang })),
              borderColor: palette.high,
              borderWidth: 2,
              pointRadius: 0,
              tension: 0
            },
            {
              label: 'Sedang',
              data: noiseYs.map((y) => ({ x: y, y: fuzzifyNoise(y).Sedang })),
              borderColor: palette.mid,
              borderWidth: 2,
              borderDash: [6, 3],
              pointRadius: 0,
              tension: 0
            },
            {
              label: 'Bising',
              data: noiseYs.map((y) => ({ x: y, y: fuzzifyNoise(y).Bising })),
              borderColor: palette.low,
              borderWidth: 2,
              pointRadius: 0,
              tension: 0
            }
          ]
        },
        options: this.baseOptions(30, 100, 'Kebisingan (dB)', palette, {
          value: 60,
          color: palette.accent,
          badgeBg: palette.accent,
          badgeFg,
          label: 'y = 60'
        })
      });
    }

    const lightZs = generateRange(0, 600, 5);
    const lightCtx = document.getElementById('light-chart');
    if (lightCtx) {
      this.charts.light = new ChartGlobal(lightCtx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Redup',
              data: lightZs.map((z) => ({ x: z, y: fuzzifyLight(z).Redup })),
              borderColor: palette.low,
              borderWidth: 2,
              pointRadius: 0,
              tension: 0
            },
            {
              label: 'Cukup',
              data: lightZs.map((z) => ({ x: z, y: fuzzifyLight(z).Cukup })),
              borderColor: palette.mid,
              borderWidth: 2,
              borderDash: [6, 3],
              pointRadius: 0,
              tension: 0
            },
            {
              label: 'Terang',
              data: lightZs.map((z) => ({ x: z, y: fuzzifyLight(z).Terang })),
              borderColor: palette.high,
              borderWidth: 2,
              pointRadius: 0,
              tension: 0
            }
          ]
        },
        options: this.baseOptions(0, 600, 'Pencahayaan (Lux)', palette, {
          value: 300,
          color: palette.accent,
          badgeBg: palette.accent,
          badgeFg,
          label: 'z = 300'
        })
      });
    }
  }

  createOutputChart() {
    const ChartGlobal = window.Chart;
    const palette = getPalette();
    const badgeFg = document.documentElement.getAttribute('data-theme') === 'dark' ? '#17120F' : '#FFFDF8';
    const ws = generateRange(0, 100, 1);
    const outCtx = document.getElementById('output-chart');
    if (!outCtx) return;

    this.charts.output = new ChartGlobal(outCtx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Area Agregasi Centroid',
            data: ws.map((w) => ({ x: w, y: 0 })),
            borderColor: palette.accent,
            backgroundColor: palette.accentFill,
            borderWidth: 2.5,
            fill: true,
            pointRadius: 0,
            tension: 0,
            order: 1
          },
          {
            label: 'Tidak Nyaman',
            data: ws.map((w) => ({ x: w, y: membershipOutput(w)['Tidak Nyaman'] })),
            borderColor: palette.low,
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
            order: 2
          },
          {
            label: 'Cukup Nyaman',
            data: ws.map((w) => ({ x: w, y: membershipOutput(w)['Cukup Nyaman'] })),
            borderColor: palette.mid,
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
            order: 3
          },
          {
            label: 'Sangat Ideal',
            data: ws.map((w) => ({ x: w, y: membershipOutput(w)['Sangat Ideal'] })),
            borderColor: palette.high,
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
            order: 4
          }
        ]
      },
      options: this.baseOptions(0, 100, 'Skor Kenyamanan Ruang Kerja (w)', palette, {
        value: 75,
        dash: [],
        lineWidth: 2.5,
        color: palette.accent,
        badgeBg: palette.accent,
        badgeFg,
        label: 'Z* = 75,00'
      })
    });
  }

  updateAll(evalResult) {
    if (!this.ready) return;
    const palette = getPalette();
    const badgeFg = document.documentElement.getAttribute('data-theme') === 'dark' ? '#17120F' : '#FFFDF8';
    const { temp, noise, light } = evalResult.inputs;
    const zStar = evalResult.centroid.zStar;

    if (this.charts.temp) {
      this.charts.temp.options.plugins.verticalMarker = {
        value: temp,
        color: palette.accent,
        badgeBg: palette.accent,
        badgeFg,
        label: `x = ${String(temp).replace('.', ',')}`
      };
      this.charts.temp.update();
    }

    if (this.charts.noise) {
      this.charts.noise.options.plugins.verticalMarker = {
        value: noise,
        color: palette.accent,
        badgeBg: palette.accent,
        badgeFg,
        label: `y = ${String(noise).replace('.', ',')}`
      };
      this.charts.noise.update();
    }

    if (this.charts.light) {
      this.charts.light.options.plugins.verticalMarker = {
        value: light,
        color: palette.accent,
        badgeBg: palette.accent,
        badgeFg,
        label: `z = ${String(light).replace('.', ',')}`
      };
      this.charts.light.update();
    }

    if (this.charts.output) {
      const ws = generateRange(0, 100, 1);
      this.charts.output.data.datasets[0].data = ws.map((w) => ({
        x: w,
        y: aggregatedMembershipAt(w, evalResult.aggregation).mu
      }));
      this.charts.output.options.plugins.verticalMarker = {
        value: zStar,
        dash: [],
        lineWidth: 2.5,
        color: palette.accent,
        badgeBg: palette.accent,
        badgeFg,
        label: `Z* = ${zStar.toFixed(2).replace('.', ',')}`
      };
      this.charts.output.update();
    }
  }

  refreshTheme(evalResult) {
    if (!this.ready) return;
    Object.values(this.charts).forEach((ch) => ch.destroy());
    this.charts = {};
    this.createInputCharts();
    this.createOutputChart();
    if (evalResult) {
      this.updateAll(evalResult);
    }
  }
}
