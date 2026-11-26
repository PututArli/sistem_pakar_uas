import { evaluateMamdani, DEFAULT_CENTROID_SAMPLES, DENSE_CENTROID_SAMPLES } from './fuzzyEngine.js';
import { FuzzyChartsManager } from './charts.js';
import {
  fmtNum, fmtVal, statusMeta, outputShortKey, createEl, announce,
  loadActiveSpot, saveActiveSpot, loadComparisonList
} from './store.js';
import { initShell } from './shell.js';

const charts = new FuzzyChartsManager();
let spot = loadActiveSpot();
let result = null;
let switcherSpots = [];

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function samplePoints() {
  return spot.sampleMode === '101' ? DENSE_CENTROID_SAMPLES : DEFAULT_CENTROID_SAMPLES;
}

function buildSwitcher() {
  const select = document.getElementById('active-spot-switcher');
  if (!select) return;
  const { list } = loadComparisonList();
  switcherSpots = list.map((s) => ({ name: s.name, temp: s.temp, noise: s.noise, light: s.light }));
  if (!switcherSpots.some((s) => s.name === spot.name)) {
    switcherSpots.unshift({ name: spot.name, temp: spot.temp, noise: spot.noise, light: spot.light });
  }
  select.replaceChildren(...switcherSpots.map((s, i) => {
    const opt = createEl('option', '', `${s.name} (${fmtVal(s.temp)} °C, ${fmtVal(s.noise)} dB, ${fmtVal(s.light)} Lux)`);
    opt.value = String(i);
    return opt;
  }));
  select.value = String(Math.max(0, switcherSpots.findIndex((s) => s.name === spot.name)));
}

function renderContext() {
  setText('context-name', spot.name);
  setText('context-params', `${fmtVal(spot.temp)} °C · ${fmtVal(spot.noise)} dB · ${fmtVal(spot.light)} Lux`);
  setText('context-score', fmtNum(result.centroid.zStar));
  const meta = statusMeta(result.classification.key);
  const badge = document.getElementById('context-badge');
  if (badge) {
    badge.className = `status-tag ${meta.cls}`;
    badge.textContent = `${meta.symbol} ${result.classification.shortLabel}`;
  }
  setText('temp-chart-val', `${fmtVal(spot.temp)} °C`);
  setText('noise-chart-val', `${fmtVal(spot.noise)} dB`);
  setText('light-chart-val', `${fmtVal(spot.light)} Lux`);
}

function renderRecommendations() {
  const grid = document.getElementById('ergonomic-recommendations-grid');
  grid.replaceChildren(...result.recommendations.map((rec) => {
    const meta = statusMeta(rec.statusKey);
    const card = createEl('article', 'surface-card p-4 space-y-2');
    const head = createEl('div', 'flex items-center justify-between gap-2');
    head.appendChild(createEl('h3', 'font-bold text-sm', rec.param));
    head.appendChild(createEl('span', 'font-formula text-sm font-bold', rec.valueText));
    card.appendChild(head);
    const row = createEl('div', 'flex flex-wrap items-center justify-between gap-2 text-xs');
    row.appendChild(createEl('span', `status-tag ${meta.cls}`, `${meta.symbol} ${rec.statusLabel}`));
    row.appendChild(createEl('span', 'font-formula text-[11px] text-muted-custom', `Standar: ${rec.standardText}`));
    card.appendChild(row);
    card.appendChild(createEl('p', 'text-sm text-muted-custom', rec.advice));
    return card;
  }));
}

function renderSteps() {
  const groups = [
    [`Suhu (${fmtVal(spot.temp)} °C)`, result.fuzzification.temp],
    [`Kebisingan (${fmtVal(spot.noise)} dB)`, result.fuzzification.noise],
    [`Cahaya (${fmtVal(spot.light)} Lux)`, result.fuzzification.light]
  ];
  document.getElementById('step1-fuzzification-cards').replaceChildren(...groups.map(([title, entries]) => {
    const card = createEl('div', 'surface-subtle p-3.5 space-y-2');
    card.appendChild(createEl('h4', 'font-bold text-xs', title));
    const ul = createEl('ul', 'space-y-1 font-formula text-xs');
    for (const [term, mu] of Object.entries(entries)) {
      const li = createEl('li', 'flex justify-between gap-2');
      li.appendChild(createEl('span', 'text-muted-custom', term));
      const val = createEl('span', mu > 0 ? 'font-bold' : 'text-muted-custom', fmtNum(mu));
      if (mu > 0) val.style.color = 'var(--accent)';
      li.appendChild(val);
      ul.appendChild(li);
    }
    card.appendChild(ul);
    return card;
  }));

  document.getElementById('active-rules-tbody').replaceChildren(...result.activeRules.map((rule) => {
    const tr = createEl('tr', 'border-b last:border-b-0');
    tr.style.borderColor = 'var(--border-soft)';
    tr.appendChild(createEl('td', 'py-2 px-3 font-formula font-bold', rule.id));
    tr.appendChild(createEl('td', 'py-2 px-3 text-xs sm:text-sm', `${rule.temp}, ${rule.noise}, ${rule.light}`));
    const tdOut = createEl('td', 'py-2 px-3');
    const meta = statusMeta(outputShortKey(rule.output));
    tdOut.appendChild(createEl('span', `status-tag ${meta.cls}`, `${meta.symbol} ${rule.output}`));
    tr.appendChild(tdOut);
    tr.appendChild(createEl('td', 'py-2 px-3 font-formula text-xs text-muted-custom', `min(${fmtNum(rule.muTemp)}; ${fmtNum(rule.muNoise)}; ${fmtNum(rule.muLight)})`));
    tr.appendChild(createEl('td', 'py-2 px-3 font-formula font-bold text-right', fmtNum(rule.alpha)));
    return tr;
  }));

  document.getElementById('step3-aggregation-cards').replaceChildren(...['Sangat Ideal', 'Cukup Nyaman', 'Tidak Nyaman'].map((term) => {
    const meta = statusMeta(outputShortKey(term));
    const contributors = result.activeRules.filter((r) => r.output === term).map((r) => r.id);
    const row = createEl('div', 'surface-subtle px-3.5 py-2.5 space-y-1');
    const top = createEl('div', 'flex items-center justify-between gap-2');
    top.appendChild(createEl('span', `status-tag ${meta.cls}`, `${meta.symbol} ${term}`));
    top.appendChild(createEl('span', 'font-formula font-bold text-sm', fmtNum(result.aggregation[term])));
    row.appendChild(top);
    row.appendChild(createEl('p', 'font-formula text-[11px] text-muted-custom', contributors.length ? `Dari ${contributors.join(', ')}` : 'Tidak ada aturan aktif'));
    return row;
  }));

  const nonZero = result.centroid.samples.filter((s) => s.mu > 0);
  const numTerms = spot.sampleMode === '10' && nonZero.length
    ? nonZero.map((s) => `(${s.w}×${fmtNum(s.mu)})`).join(' + ')
    : `${result.centroid.samples.length} titik sampel`;
  const finalLine = createEl('p', 'font-bold pt-0.5', `Z* = ${fmtNum(result.centroid.numerator)} / ${fmtNum(result.centroid.denominator)} = ${fmtNum(result.centroid.zStar)}`);
  finalLine.style.color = 'var(--accent)';
  document.getElementById('step4-formula-box').replaceChildren(
    createEl('p', '', `Pembilang = ${numTerms} = ${fmtNum(result.centroid.numerator)}`),
    createEl('p', '', `Penyebut = ∑μ(wᵢ) = ${fmtNum(result.centroid.denominator)}`),
    finalLine
  );

  document.getElementById('centroid-samples-tbody').replaceChildren(...result.centroid.samples.map((s) => {
    const tr = createEl('tr', 'border-b last:border-b-0');
    tr.style.borderColor = 'var(--border-soft)';
    tr.appendChild(createEl('td', 'py-1.5 px-3 font-bold', `w = ${s.w}`));
    tr.appendChild(createEl('td', 'py-1.5 px-3 text-muted-custom', `${fmtNum(s.clipped['Tidak Nyaman'])} / ${fmtNum(s.clipped['Cukup Nyaman'])} / ${fmtNum(s.clipped['Sangat Ideal'])}`));
    tr.appendChild(createEl('td', 'py-1.5 px-3 text-right', fmtNum(s.mu)));
    tr.appendChild(createEl('td', 'py-1.5 px-3 text-right font-bold', fmtNum(s.product)));
    return tr;
  }));
}

function renderAll() {
  result = evaluateMamdani(spot.temp, spot.noise, spot.light, samplePoints());
  renderContext();
  renderRecommendations();
  renderSteps();
  charts.updateAll(result);
}

function bootstrap() {
  initShell(() => charts.refreshTheme(result));
  buildSwitcher();

  const sampleSelect = document.getElementById('sample-mode-select');
  sampleSelect.value = spot.sampleMode;
  sampleSelect.addEventListener('change', () => {
    spot.sampleMode = sampleSelect.value;
    saveActiveSpot(spot);
    renderAll();
    announce(spot.sampleMode === '101' ? 'Memakai 101 titik sampel.' : 'Memakai 10 titik sampel Bab 4.');
  });

  document.getElementById('active-spot-switcher').addEventListener('change', (e) => {
    const chosen = switcherSpots[Number(e.target.value)];
    if (!chosen) return;
    spot = { ...chosen, sampleMode: spot.sampleMode };
    saveActiveSpot(spot);
    renderAll();
    announce(`Menampilkan perhitungan ${spot.name}, skor ${fmtNum(result.centroid.zStar)}.`);
  });

  const ok = charts.init();
  setText('chart-loading-status', ok ? 'Real-time' : 'Mode angka');
  document.getElementById('chart-error-box').hidden = ok;

  renderAll();
}

bootstrap();
