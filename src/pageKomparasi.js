import { evaluateMamdani, DEFAULT_CENTROID_SAMPLES, DENSE_CENTROID_SAMPLES } from './fuzzyEngine.js';
import { FuzzyChartsManager } from './charts.js';
import {
  PRESET_SPOTS, fmtNum, fmtVal, statusMeta, createEl, announce,
  loadActiveSpot, saveActiveSpot, loadComparisonList, saveComparisonList
} from './store.js';
import { initShell, updateNavCompareBadge } from './shell.js';

const active = loadActiveSpot();
const samplePts = active.sampleMode === '101' ? DENSE_CENTROID_SAMPLES : DEFAULT_CENTROID_SAMPLES;
const charts = new FuzzyChartsManager();

let list = [];
let ranked = [];

function persist(message) {
  if (!saveComparisonList(list)) {
    const banner = document.getElementById('storage-error-banner');
    if (banner) banner.hidden = false;
  }
  render();
  if (message) announce(message);
}

function openSpotIn(item, page) {
  saveActiveSpot({ name: item.name, temp: item.temp, noise: item.noise, light: item.light, sampleMode: active.sampleMode });
  window.location.href = page;
}

function buildCard(item, idx) {
  const isTop = idx === 0 && ranked.length >= 2;
  const card = createEl('article', `${isTop ? 'surface-elevated' : 'surface-card'} p-5 flex flex-col justify-between gap-4`);
  if (isTop) {
    card.style.borderColor = 'var(--accent)';
    card.style.borderWidth = '2px';
  }

  const top = createEl('div', 'space-y-3');
  const rankRow = createEl('div', 'flex items-center justify-between gap-2');
  rankRow.appendChild(createEl('span', 'rank-badge', isTop ? 'Peringkat 1 · Terbaik' : `Peringkat ${idx + 1}`));
  if (item.isSampleNote) rankRow.appendChild(createEl('span', 'text-xs text-muted-custom', item.isSampleNote));
  top.appendChild(rankRow);
  top.appendChild(createEl('h2', 'text-lg font-bold leading-snug break-words', item.name));

  const scoreRow = createEl('div', 'flex flex-wrap items-baseline justify-between gap-2');
  const score = createEl('span', 'font-editorial text-3xl sm:text-4xl font-bold tabular-nums', fmtNum(item.calc.centroid.zStar));
  score.style.color = 'var(--accent)';
  scoreRow.appendChild(score);
  const meta = statusMeta(item.calc.classification.key);
  scoreRow.appendChild(createEl('span', `status-tag ${meta.cls}`, `${meta.symbol} ${item.calc.classification.shortLabel}`));
  top.appendChild(scoreRow);

  const metrics = createEl('dl', 'grid grid-cols-3 gap-2 surface-subtle p-2.5 text-center font-formula text-xs');
  for (const [label, val] of [['Suhu', `${fmtVal(item.temp)} °C`], ['Bising', `${fmtVal(item.noise)} dB`], ['Cahaya', `${fmtVal(item.light)} Lux`]]) {
    const cell = createEl('div', 'space-y-0.5');
    cell.appendChild(createEl('dt', 'text-[11px] text-muted-custom font-sans', label));
    cell.appendChild(createEl('dd', 'font-bold truncate', val));
    metrics.appendChild(cell);
  }
  top.appendChild(metrics);

  const k3 = createEl('ul', 'space-y-1 text-xs');
  for (const rec of item.calc.recommendations) {
    const rMeta = statusMeta(rec.statusKey);
    const li = createEl('li', 'flex items-center justify-between gap-2');
    li.appendChild(createEl('span', 'text-muted-custom', rec.param));
    li.appendChild(createEl('span', `status-tag ${rMeta.cls} text-[11px]`, `${rMeta.symbol} ${rec.statusLabel}`));
    k3.appendChild(li);
  }
  top.appendChild(k3);
  card.appendChild(top);

  const actions = createEl('div', 'grid grid-cols-2 gap-2 pt-1');
  const editBtn = createEl('button', 'btn-secondary text-xs', 'Ubah di Evaluasi');
  editBtn.type = 'button';
  editBtn.addEventListener('click', () => openSpotIn(item, './index.html'));
  const calcBtn = createEl('button', 'btn-secondary text-xs', 'Lihat Hitungan');
  calcBtn.type = 'button';
  calcBtn.addEventListener('click', () => openSpotIn(item, './perhitungan.html'));
  const removeBtn = createEl('button', 'btn-secondary text-xs col-span-2', 'Hapus dari Komparasi');
  removeBtn.type = 'button';
  removeBtn.setAttribute('aria-label', `Hapus ${item.name} dari komparasi`);
  removeBtn.addEventListener('click', () => {
    list = list.filter((c) => c.id !== item.id);
    persist(`${item.name} dihapus dari komparasi.`);
  });
  actions.append(editBtn, calcBtn, removeBtn);
  card.appendChild(actions);
  return card;
}

function render() {
  const count = list.length;
  updateNavCompareBadge(count);
  const clearBtn = document.getElementById('clear-comparison-btn');
  if (clearBtn) clearBtn.disabled = count === 0;

  const empty = document.getElementById('comparison-empty-state');
  const single = document.getElementById('comparison-single-notice');
  const grid = document.getElementById('comparison-cards-grid');
  const chartSection = document.getElementById('compare-chart-section');

  ranked = list
    .map((spot) => ({ ...spot, calc: evaluateMamdani(spot.temp, spot.noise, spot.light, samplePts) }))
    .sort((a, b) => b.calc.centroid.zStar - a.calc.centroid.zStar);

  empty.hidden = count !== 0;
  single.hidden = count !== 1;
  grid.hidden = count === 0;
  grid.replaceChildren(...ranked.map(buildCard));

  const showChart = count >= 2;
  chartSection.hidden = !showChart;
  if (showChart) {
    charts.renderComparisonChart(ranked);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    const gap = best.calc.centroid.zStar - worst.calc.centroid.zStar;
    document.getElementById('compare-chart-summary').textContent =
      `${best.name} unggul dengan skor ${fmtNum(best.calc.centroid.zStar)}, selisih ${fmtNum(gap)} poin dari ${worst.name}.`;
  }
}

function loadPresets() {
  list = PRESET_SPOTS.map((item) => ({ ...item }));
  persist('Tiga sampel uji dimuat.');
}

function bootstrap() {
  initShell(() => charts.refreshTheme(null, ranked));
  const loaded = loadComparisonList();
  list = loaded.list;
  document.getElementById('storage-error-banner').hidden = !loaded.error;

  document.getElementById('load-preset-comparison-btn')?.addEventListener('click', loadPresets);
  document.getElementById('empty-load-preset-btn')?.addEventListener('click', loadPresets);
  document.getElementById('clear-comparison-btn')?.addEventListener('click', () => {
    list = [];
    persist('Papan komparasi dikosongkan.');
  });
  document.getElementById('reset-storage-btn')?.addEventListener('click', () => {
    list = [{ ...PRESET_SPOTS[0] }, { ...PRESET_SPOTS[1] }];
    document.getElementById('storage-error-banner').hidden = true;
    persist('Data komparasi dipulihkan.');
  });

  render();
}

bootstrap();
