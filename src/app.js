import {
  evaluateMamdani,
  validateInputs,
  DEFAULT_CENTROID_SAMPLES,
  DENSE_CENTROID_SAMPLES
} from './fuzzyEngine.js';
import { FuzzyChartsManager } from './charts.js';

const STORAGE_KEY_SPOTS = 'wfc_k3_mamdani_comparison_v2';
const STORAGE_KEY_THEME = 'wfc_theme';

const PRESET_SPOTS = [
  {
    id: 'preset-spot-a',
    name: 'Studi Kasus: Spot WFC A',
    temp: 25,
    noise: 60,
    light: 300,
    isSampleNote: 'Bab 4 Laporan'
  },
  {
    id: 'preset-spot-b',
    name: 'Sampel: Ruang Baca Tenang',
    temp: 24,
    noise: 42,
    light: 400,
    isSampleNote: 'Simulasi'
  },
  {
    id: 'preset-spot-c',
    name: 'Sampel: Teras Kafe Sore',
    temp: 29,
    noise: 74,
    light: 160,
    isSampleNote: 'Simulasi'
  }
];

function fmtNum(val, decimals = 2) {
  return Number(val).toFixed(decimals).replace('.', ',');
}

function statusMeta(key) {
  if (key === 'ideal') return { cls: 'status-ideal', symbol: '[+]' };
  if (key === 'cukup') return { cls: 'status-santai', symbol: '[~]' };
  return { cls: 'status-tidak', symbol: '[-]' };
}

function outputShortKey(outputLabel) {
  if (outputLabel === 'Sangat Ideal') return 'ideal';
  if (outputLabel === 'Cukup Nyaman') return 'cukup';
  return 'tidak';
}

function announce(message, type = 'polite') {
  const el = document.getElementById(type === 'assertive' ? 'assertive-announcer' : 'polite-announcer');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

const state = {
  spotName: 'Studi Kasus: Spot WFC A',
  temp: 25,
  noise: 60,
  light: 300,
  sampleMode: '10',
  currentResult: null,
  comparisonList: [],
  ruleFilterOutput: 'ALL',
  ruleFilterStatus: 'ALL'
};

const chartsManager = new FuzzyChartsManager();

function getSamplePoints() {
  return state.sampleMode === '101' ? DENSE_CENTROID_SAMPLES : DEFAULT_CENTROID_SAMPLES;
}

function loadSavedComparison() {
  const errorBanner = document.getElementById('storage-error-banner');
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SPOTS);
    if (!raw) {
      state.comparisonList = [{ ...PRESET_SPOTS[0] }, { ...PRESET_SPOTS[1] }];
      saveComparison();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid format');
    const sanitized = [];
    for (const item of parsed.slice(0, 3)) {
      if (!item || typeof item.name !== 'string') continue;
      const check = validateInputs(item.temp, item.noise, item.light);
      if (!check.valid) continue;
      sanitized.push({
        id: String(item.id || `spot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        name: item.name.trim().slice(0, 60) || 'Ruang Tanpa Nama',
        temp: check.values.temp,
        noise: check.values.noise,
        light: check.values.light,
        isSampleNote: typeof item.isSampleNote === 'string' ? item.isSampleNote : ''
      });
    }
    state.comparisonList = sanitized;
    if (errorBanner) errorBanner.hidden = true;
  } catch (_err) {
    state.comparisonList = [{ ...PRESET_SPOTS[0] }];
    if (errorBanner) errorBanner.hidden = false;
  }
}

function saveComparison() {
  try {
    localStorage.setItem(STORAGE_KEY_SPOTS, JSON.stringify(state.comparisonList));
  } catch (_err) {
    const errorBanner = document.getElementById('storage-error-banner');
    if (errorBanner) errorBanner.hidden = false;
  }
}

function renderCompactMu(containerId, muMap) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const active = Object.entries(muMap)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k} ${fmtNum(v)}`);
  el.textContent = active.join(' · ');
}

function syncPresetSelect(selectId, value) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const match = Array.from(sel.options).some((opt) => opt.value === String(value));
  sel.value = match ? String(value) : '';
}

function renderPrimaryResult(res) {
  const titleEl = document.getElementById('result-spot-title');
  const scoreEl = document.getElementById('result-score-value');
  const catBadge = document.getElementById('result-category-badge');
  const catSymbol = document.getElementById('result-category-symbol');
  const catText = document.getElementById('result-category-text');
  const catSummary = document.getElementById('result-category-summary');
  const activeCountEl = document.getElementById('summary-active-rules');
  const aggEl = document.getElementById('summary-aggregation');
  const fracEl = document.getElementById('summary-centroid-fraction');
  const quickGrid = document.getElementById('k3-quick-grid');

  if (titleEl) titleEl.textContent = state.spotName.trim() || 'Ruang sedang dievaluasi';
  if (scoreEl) scoreEl.textContent = fmtNum(res.centroid.zStar);

  const meta = statusMeta(res.classification.key);
  if (catBadge) catBadge.className = `status-tag ${meta.cls} shrink-0`;
  if (catSymbol) catSymbol.textContent = meta.symbol;
  if (catText) catText.textContent = res.classification.shortLabel;
  if (catSummary) catSummary.textContent = res.classification.summary;

  if (activeCountEl) activeCountEl.textContent = `${res.activeRules.length}/27`;
  if (aggEl) {
    aggEl.textContent = `${fmtNum(res.aggregation['Tidak Nyaman'])} / ${fmtNum(res.aggregation['Cukup Nyaman'])} / ${fmtNum(res.aggregation['Sangat Ideal'])}`;
  }
  if (fracEl) {
    fracEl.textContent = `Z* = ${fmtNum(res.centroid.numerator)} / ${fmtNum(res.centroid.denominator)}`;
  }

  if (quickGrid) {
    quickGrid.replaceChildren();
    const shortParamNames = {
      'Suhu Ruangan': 'Suhu',
      'Tingkat Kebisingan': 'Kebisingan',
      'Intensitas Pencahayaan': 'Pencahayaan'
    };
    const shortStatusNames = {
      'Ambang Maksimal K3': 'Ambang K3',
      'Perlu Penyesuaian': 'Sesuaikan',
      'Melebihi Batas K3': 'Melebihi K3',
      'Di Luar Standar': 'Luar Standar'
    };
    for (const rec of res.recommendations) {
      const rMeta = statusMeta(rec.statusKey);
      const chip = createEl('div', 'surface-subtle px-3 py-2 space-y-1');
      const top = createEl('div', 'flex items-center justify-between gap-1 text-[11px]');
      top.appendChild(createEl('span', 'text-muted-custom font-semibold', shortParamNames[rec.param] || rec.param));
      top.appendChild(createEl('span', 'font-formula font-bold shrink-0', rec.valueText));
      chip.appendChild(top);
      const chipLabel = shortStatusNames[rec.statusLabel] || rec.statusLabel;
      chip.appendChild(createEl('span', `status-tag ${rMeta.cls} text-[11px]`, `${rMeta.symbol} ${chipLabel}`));
      quickGrid.appendChild(chip);
    }
  }

  const tempChartVal = document.getElementById('temp-chart-val');
  const noiseChartVal = document.getElementById('noise-chart-val');
  const lightChartVal = document.getElementById('light-chart-val');

  if (tempChartVal) tempChartVal.textContent = `${String(res.inputs.temp).replace('.', ',')} °C`;
  if (noiseChartVal) noiseChartVal.textContent = `${String(res.inputs.noise).replace('.', ',')} dB`;
  if (lightChartVal) lightChartVal.textContent = `${String(res.inputs.light).replace('.', ',')} Lux`;

  renderCompactMu('temp-mu-summary', res.fuzzification.temp);
  renderCompactMu('noise-mu-summary', res.fuzzification.noise);
  renderCompactMu('light-mu-summary', res.fuzzification.light);

  syncPresetSelect('temp-preset', res.inputs.temp);
  syncPresetSelect('noise-preset', res.inputs.noise);
  syncPresetSelect('light-preset', res.inputs.light);
}

function renderTransparencyPanels(res) {
  const recGrid = document.getElementById('ergonomic-recommendations-grid');
  if (recGrid) {
    recGrid.replaceChildren();
    for (const rec of res.recommendations) {
      const rMeta = statusMeta(rec.statusKey);
      const card = createEl('div', 'surface-subtle p-3.5 space-y-2');
      const head = createEl('div', 'flex items-center justify-between gap-2');
      head.appendChild(createEl('h4', 'font-bold text-xs sm:text-sm', rec.param));
      head.appendChild(createEl('span', 'font-formula text-xs font-bold', rec.valueText));
      card.appendChild(head);

      const badgeRow = createEl('div', 'flex flex-wrap items-center justify-between gap-2 text-xs');
      badgeRow.appendChild(createEl('span', `status-tag ${rMeta.cls}`, `${rMeta.symbol} ${rec.statusLabel}`));
      badgeRow.appendChild(createEl('span', 'font-formula text-[11px] text-muted-custom', `K3: ${rec.standardText}`));
      card.appendChild(badgeRow);

      card.appendChild(createEl('p', 'text-xs text-muted-custom', rec.advice));
      recGrid.appendChild(card);
    }
  }

  const step1Container = document.getElementById('step1-fuzzification-cards');
  if (step1Container) {
    step1Container.replaceChildren();
    const groups = [
      { title: `Suhu (${String(res.inputs.temp).replace('.', ',')} °C)`, entries: res.fuzzification.temp },
      { title: `Kebisingan (${String(res.inputs.noise).replace('.', ',')} dB)`, entries: res.fuzzification.noise },
      { title: `Pencahayaan (${String(res.inputs.light).replace('.', ',')} Lux)`, entries: res.fuzzification.light }
    ];

    for (const grp of groups) {
      const card = createEl('div', 'surface-subtle p-3.5 space-y-2');
      card.appendChild(createEl('h4', 'font-bold text-xs', grp.title));
      const list = createEl('ul', 'space-y-1 font-formula text-xs');
      for (const [term, mu] of Object.entries(grp.entries)) {
        const li = createEl('li', 'flex justify-between gap-2');
        li.appendChild(createEl('span', 'text-muted-custom', term));
        const valSpan = createEl('span', mu > 0 ? 'font-bold' : 'text-muted-custom', fmtNum(mu));
        if (mu > 0) valSpan.style.color = 'var(--accent)';
        li.appendChild(valSpan);
        list.appendChild(li);
      }
      card.appendChild(list);
      step1Container.appendChild(card);
    }
  }

  const activeTbody = document.getElementById('active-rules-tbody');
  if (activeTbody) {
    activeTbody.replaceChildren();
    for (const rule of res.activeRules) {
      const tr = createEl('tr', 'border-b last:border-b-0');
      tr.style.borderColor = 'var(--border-soft)';
      tr.appendChild(createEl('td', 'py-2 px-3 font-formula font-bold', rule.id));
      tr.appendChild(createEl('td', 'py-2 px-3 text-xs sm:text-sm', `${rule.temp}, ${rule.noise}, ${rule.light}`));

      const tdOut = createEl('td', 'py-2 px-3');
      const meta = statusMeta(outputShortKey(rule.output));
      tdOut.appendChild(createEl('span', `status-tag ${meta.cls}`, `${meta.symbol} ${rule.output}`));
      tr.appendChild(tdOut);

      tr.appendChild(
        createEl('td', 'py-2 px-3 font-formula text-xs text-muted-custom', `min(${fmtNum(rule.muTemp)}; ${fmtNum(rule.muNoise)}; ${fmtNum(rule.muLight)})`)
      );
      tr.appendChild(createEl('td', 'py-2 px-3 font-formula font-bold text-right', fmtNum(rule.alpha)));
      activeTbody.appendChild(tr);
    }
  }

  const step3Container = document.getElementById('step3-aggregation-cards');
  if (step3Container) {
    step3Container.replaceChildren();
    for (const term of ['Sangat Ideal', 'Cukup Nyaman', 'Tidak Nyaman']) {
      const maxVal = res.aggregation[term];
      const meta = statusMeta(outputShortKey(term));
      const row = createEl('div', 'surface-subtle px-3.5 py-2.5 flex items-center justify-between gap-2');
      row.appendChild(createEl('span', `status-tag ${meta.cls}`, `${meta.symbol} ${term}`));
      row.appendChild(createEl('span', 'font-formula font-bold text-sm', fmtNum(maxVal)));
      step3Container.appendChild(row);
    }
  }

  const formulaBox = document.getElementById('step4-formula-box');
  if (formulaBox) {
    formulaBox.replaceChildren();
    const nonZero = res.centroid.samples.filter((s) => s.mu > 0);
    const numTerms =
      state.sampleMode === '10' && nonZero.length > 0
        ? nonZero.map((s) => `(${s.w}×${fmtNum(s.mu)})`).join(' + ')
        : `${res.centroid.samples.length} sampel dievaluasi`;
    formulaBox.appendChild(createEl('p', '', `Pembilang = ${numTerms} = ${fmtNum(res.centroid.numerator)}`));
    formulaBox.appendChild(createEl('p', '', `Penyebut = ∑μ(wᵢ) = ${fmtNum(res.centroid.denominator)}`));
    const finalLine = createEl('p', 'font-bold pt-0.5', `Z* = ${fmtNum(res.centroid.numerator)} / ${fmtNum(res.centroid.denominator)} = ${fmtNum(res.centroid.zStar)}`);
    finalLine.style.color = 'var(--accent)';
    formulaBox.appendChild(finalLine);
  }

  const samplesTbody = document.getElementById('centroid-samples-tbody');
  if (samplesTbody) {
    samplesTbody.replaceChildren();
    for (const s of res.centroid.samples) {
      const tr = createEl('tr', 'border-b last:border-b-0');
      tr.style.borderColor = 'var(--border-soft)';
      tr.appendChild(createEl('td', 'py-1.5 px-3 font-bold', `w = ${s.w}`));
      tr.appendChild(
        createEl(
          'td',
          'py-1.5 px-3 text-muted-custom',
          `${fmtNum(s.clipped['Tidak Nyaman'])} / ${fmtNum(s.clipped['Cukup Nyaman'])} / ${fmtNum(s.clipped['Sangat Ideal'])}`
        )
      );
      tr.appendChild(createEl('td', 'py-1.5 px-3 text-right', fmtNum(s.mu)));
      tr.appendChild(createEl('td', 'py-1.5 px-3 text-right font-bold', fmtNum(s.product)));
      samplesTbody.appendChild(tr);
    }
  }
}

function renderAllRulesTable(res) {
  const tbody = document.getElementById('all-rules-tbody');
  const mobileList = document.getElementById('all-rules-mobile-list');
  const emptyBox = document.getElementById('rules-filter-empty');
  const tableWrap = document.getElementById('rules-table-wrapper');
  if (!tbody || !mobileList || !emptyBox || !tableWrap) return;

  const filtered = res.evaluatedRules.filter((rule) => {
    if (state.ruleFilterOutput !== 'ALL' && rule.output !== state.ruleFilterOutput) return false;
    if (state.ruleFilterStatus === 'ACTIVE' && !rule.active) return false;
    return true;
  });

  if (filtered.length === 0) {
    emptyBox.hidden = false;
    tableWrap.classList.add('hidden');
    tableWrap.classList.remove('sm:block');
    mobileList.hidden = true;
    return;
  }

  emptyBox.hidden = true;
  tableWrap.classList.add('hidden', 'sm:block');
  mobileList.hidden = false;

  tbody.replaceChildren();
  mobileList.replaceChildren();

  for (const rule of filtered) {
    const meta = statusMeta(outputShortKey(rule.output));
    const statusText = rule.active ? `Aktif (${fmtNum(rule.alpha)})` : '0,00';

    const tr = createEl('tr', 'border-b last:border-b-0');
    tr.style.borderColor = 'var(--border-soft)';
    if (rule.active) tr.style.backgroundColor = 'var(--accent-tint)';

    tr.appendChild(createEl('td', 'py-2 px-3.5 font-formula font-bold', rule.id));
    tr.appendChild(createEl('td', 'py-2 px-3.5', rule.temp));
    tr.appendChild(createEl('td', 'py-2 px-3.5', rule.noise));
    tr.appendChild(createEl('td', 'py-2 px-3.5', rule.light));

    const tdOut = createEl('td', 'py-2 px-3.5');
    tdOut.appendChild(createEl('span', `status-tag ${meta.cls}`, `${meta.symbol} ${rule.output}`));
    tr.appendChild(tdOut);

    tr.appendChild(
      createEl('td', `py-2 px-3.5 font-formula text-right ${rule.active ? 'font-bold' : 'text-muted-custom'}`, statusText)
    );
    tbody.appendChild(tr);

    // Mobile rule cards keep each rule legible without horizontal scrolling.
    const mCard = createEl('div', 'p-3 rounded-lg border space-y-1.5 text-xs');
    mCard.style.borderColor = rule.active ? 'var(--accent)' : 'var(--border-soft)';
    mCard.style.backgroundColor = rule.active ? 'var(--accent-tint)' : 'var(--bg-subtle)';

    const topRow = createEl('div', 'flex items-center justify-between gap-2');
    topRow.appendChild(createEl('span', 'font-formula font-bold text-sm', rule.id));
    topRow.appendChild(createEl('span', `status-tag ${meta.cls}`, `${meta.symbol} ${rule.output}`));
    mCard.appendChild(topRow);

    const bottomRow = createEl('div', 'flex items-center justify-between gap-2 text-muted-custom');
    bottomRow.appendChild(createEl('span', '', `Suhu ${rule.temp} · ${rule.noise} · ${rule.light}`));
    bottomRow.appendChild(createEl('span', 'font-formula font-bold', `α = ${fmtNum(rule.alpha)}`));
    mCard.appendChild(bottomRow);

    mobileList.appendChild(mCard);
  }
}

function renderComparisonSection() {
  const navCount = document.getElementById('nav-compare-count');
  const slotFeedback = document.getElementById('compare-slot-feedback');
  const emptyState = document.getElementById('comparison-empty-state');
  const singleNotice = document.getElementById('comparison-single-notice');
  const grid = document.getElementById('comparison-cards-grid');
  const clearBtn = document.getElementById('clear-comparison-btn');

  const count = state.comparisonList.length;
  if (navCount) navCount.textContent = `${count}/3`;
  if (slotFeedback) slotFeedback.textContent = `${count}/3 slot komparasi`;
  if (clearBtn) clearBtn.disabled = count === 0;

  if (!emptyState || !singleNotice || !grid) return;

  if (count === 0) {
    emptyState.hidden = false;
    singleNotice.hidden = true;
    grid.hidden = true;
    grid.replaceChildren();
    return;
  }

  emptyState.hidden = true;
  singleNotice.hidden = count !== 1;
  grid.hidden = false;
  grid.replaceChildren();

  const samplePts = getSamplePoints();
  const ranked = state.comparisonList
    .map((spot) => ({
      ...spot,
      calc: evaluateMamdani(spot.temp, spot.noise, spot.light, samplePts)
    }))
    .sort((a, b) => b.calc.centroid.zStar - a.calc.centroid.zStar);

  ranked.forEach((item, idx) => {
    const isTop = idx === 0 && ranked.length >= 2;
    const card = createEl(
      'article',
      isTop ? 'surface-elevated p-5 flex flex-col justify-between gap-4' : 'surface-card p-5 flex flex-col justify-between gap-4'
    );
    if (isTop) {
      card.style.borderColor = 'var(--accent)';
      card.style.borderWidth = '2px';
    }

    const topBlock = createEl('div', 'space-y-3');

    const rankRow = createEl('div', 'flex items-center justify-between gap-2');
    rankRow.appendChild(createEl('span', 'rank-badge', isTop ? 'Peringkat 1 · Terbaik' : `Peringkat ${idx + 1}`));
    if (item.isSampleNote) {
      rankRow.appendChild(createEl('span', 'text-xs text-muted-custom', item.isSampleNote));
    }
    topBlock.appendChild(rankRow);

    topBlock.appendChild(createEl('h3', 'text-lg font-bold leading-snug break-words', item.name));

    const scoreRow = createEl('div', 'flex flex-wrap items-baseline justify-between gap-2');
    const scoreBig = createEl('span', 'font-editorial text-3xl sm:text-4xl font-bold tabular-nums', fmtNum(item.calc.centroid.zStar));
    scoreBig.style.color = 'var(--accent)';
    scoreRow.appendChild(scoreBig);

    const meta = statusMeta(item.calc.classification.key);
    scoreRow.appendChild(createEl('span', `status-tag ${meta.cls}`, `${meta.symbol} ${item.calc.classification.shortLabel}`));
    topBlock.appendChild(scoreRow);

    const metricsRow = createEl('div', 'grid grid-cols-3 gap-2 surface-subtle p-2.5 text-center font-formula text-xs');
    const mItems = [
      ['Suhu', `${String(item.temp).replace('.', ',')} °C`],
      ['Bising', `${String(item.noise).replace('.', ',')} dB`],
      ['Cahaya', `${String(item.light).replace('.', ',')} Lux`]
    ];
    for (const [lbl, val] of mItems) {
      const cell = createEl('div', 'space-y-0.5');
      cell.appendChild(createEl('div', 'text-[11px] text-muted-custom font-sans', lbl));
      cell.appendChild(createEl('div', 'font-bold truncate', val));
      metricsRow.appendChild(cell);
    }
    topBlock.appendChild(metricsRow);
    card.appendChild(topBlock);

    const actionRow = createEl('div', 'flex gap-2 pt-1');
    const loadBtn = createEl('button', 'btn-secondary text-xs flex-1', 'Muat ke Evaluasi');
    loadBtn.type = 'button';
    loadBtn.addEventListener('click', () => {
      applyInputValues(item.name, item.temp, item.noise, item.light);
      document.getElementById('evaluasi')?.scrollIntoView({ behavior: 'smooth' });
      announce(`Parameter ${item.name} dimuat.`);
    });

    const removeBtn = createEl('button', 'btn-secondary text-xs px-3', 'Hapus');
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', `Hapus ${item.name} dari papan komparasi`);
    removeBtn.addEventListener('click', () => {
      state.comparisonList = state.comparisonList.filter((c) => c.id !== item.id);
      saveComparison();
      renderComparisonSection();
      announce(`${item.name} dihapus.`);
    });

    actionRow.appendChild(loadBtn);
    actionRow.appendChild(removeBtn);
    card.appendChild(actionRow);
    grid.appendChild(card);
  });
}

function clearFieldErrors() {
  const summary = document.getElementById('form-error-summary');
  if (summary) {
    summary.hidden = true;
    summary.textContent = '';
  }
  for (const [inputId, errId] of [
    ['spot-name', 'spot-name-error'],
    ['temp-number', 'temp-error'],
    ['noise-number', 'noise-error'],
    ['light-number', 'light-error']
  ]) {
    document.getElementById(inputId)?.setAttribute('aria-invalid', 'false');
    const err = document.getElementById(errId);
    if (err) {
      err.hidden = true;
      err.textContent = '';
    }
  }
}

function showFieldErrors(errorMap) {
  const mapping = {
    spotName: ['spot-name', 'spot-name-error'],
    temp: ['temp-number', 'temp-error'],
    noise: ['noise-number', 'noise-error'],
    light: ['light-number', 'light-error']
  };
  const messages = [];
  let firstInvalidEl = null;

  for (const [key, msg] of Object.entries(errorMap)) {
    const pair = mapping[key];
    if (!pair) continue;
    const inp = document.getElementById(pair[0]);
    const err = document.getElementById(pair[1]);
    if (inp) {
      inp.setAttribute('aria-invalid', 'true');
      if (!firstInvalidEl) firstInvalidEl = inp;
    }
    if (err) {
      err.textContent = msg;
      err.hidden = false;
    }
    messages.push(msg);
  }

  const summary = document.getElementById('form-error-summary');
  if (summary && messages.length > 0) {
    summary.textContent = messages.join(' ');
    summary.hidden = false;
  }
  if (firstInvalidEl) firstInvalidEl.focus();
}

function runEvaluationFromState() {
  const check = validateInputs(state.temp, state.noise, state.light);
  if (!check.valid) {
    showFieldErrors(check.errors);
    return false;
  }
  clearFieldErrors();
  const res = evaluateMamdani(state.temp, state.noise, state.light, getSamplePoints());
  state.currentResult = res;
  renderPrimaryResult(res);
  renderTransparencyPanels(res);
  renderAllRulesTable(res);
  chartsManager.updateAll(res);
  return true;
}

function applyInputValues(name, temp, noise, light) {
  state.spotName = name;
  state.temp = temp;
  state.noise = noise;
  state.light = light;

  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = String(v);
  };

  setVal('spot-name', name);
  setVal('temp-slider', temp);
  setVal('temp-number', temp);
  setVal('noise-slider', noise);
  setVal('noise-number', noise);
  setVal('light-slider', light);
  setVal('light-number', light);

  runEvaluationFromState();
}

function openReplaceDialog(newEntry) {
  const dialog = document.getElementById('replace-dialog');
  const list = document.getElementById('replace-options-list');
  if (!dialog || !list) return;

  list.replaceChildren();
  state.comparisonList.forEach((item, index) => {
    const calc = evaluateMamdani(item.temp, item.noise, item.light, getSamplePoints());
    const btn = createEl('button', 'btn-secondary w-full justify-between text-left', '');
    btn.type = 'button';
    btn.appendChild(createEl('span', 'font-bold truncate', `${index + 1}. ${item.name}`));
    btn.appendChild(createEl('span', 'font-formula text-xs shrink-0', `Ganti (Z* ${fmtNum(calc.centroid.zStar)})`));
    btn.addEventListener('click', () => {
      state.comparisonList[index] = newEntry;
      saveComparison();
      renderComparisonSection();
      dialog.close();
      document.getElementById('komparasi')?.scrollIntoView({ behavior: 'smooth' });
      announce(`${newEntry.name} menggantikan ${item.name}.`);
    });
    list.appendChild(btn);
  });

  dialog.showModal();
}

function activateTabById(tabId, moveFocus = false) {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const target = document.getElementById(tabId);
  if (!target) return;

  for (const tab of tabs) {
    const isSelected = tab === target;
    tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    tab.tabIndex = isSelected ? 0 : -1;
    const panelId = tab.getAttribute('aria-controls');
    const panel = panelId ? document.getElementById(panelId) : null;
    if (panel) panel.hidden = !isSelected;
  }
  if (moveFocus) target.focus();
  if (tabId === 'tab-curves' && state.currentResult) {
    chartsManager.updateAll(state.currentResult);
  }
}

function setupFormControls() {
  const nameInp = document.getElementById('spot-name');
  nameInp?.addEventListener('input', () => {
    state.spotName = nameInp.value;
    const titleEl = document.getElementById('result-spot-title');
    if (titleEl) titleEl.textContent = state.spotName.trim() || 'Ruang sedang dievaluasi';
    if (state.spotName.trim()) {
      nameInp.setAttribute('aria-invalid', 'false');
      const err = document.getElementById('spot-name-error');
      if (err) err.hidden = true;
    }
  });

  const bindings = [
    { key: 'temp', sliderId: 'temp-slider', numId: 'temp-number', presetId: 'temp-preset', min: 16, max: 36 },
    { key: 'noise', sliderId: 'noise-slider', numId: 'noise-number', presetId: 'noise-preset', min: 30, max: 100 },
    { key: 'light', sliderId: 'light-slider', numId: 'light-number', presetId: 'light-preset', min: 0, max: 600 }
  ];

  for (const b of bindings) {
    const slider = document.getElementById(b.sliderId);
    const num = document.getElementById(b.numId);
    const preset = document.getElementById(b.presetId);

    slider?.addEventListener('input', () => {
      const val = Number(slider.value);
      state[b.key] = val;
      if (num) num.value = String(val);
      runEvaluationFromState();
    });

    num?.addEventListener('input', () => {
      if (num.value.trim() === '') {
        showFieldErrors({ [b.key]: 'Masukkan angka yang valid.' });
        return;
      }
      const val = Number(num.value);
      state[b.key] = val;
      if (Number.isFinite(val) && val >= b.min && val <= b.max && slider) {
        slider.value = String(val);
      }
      runEvaluationFromState();
    });

    preset?.addEventListener('change', () => {
      if (!preset.value) return;
      const val = Number(preset.value);
      state[b.key] = val;
      if (slider) slider.value = String(val);
      if (num) num.value = String(val);
      runEvaluationFromState();
      announce(`Patokan ${b.key} diatur ke ${val}.`);
    });
  }

  const sampleSelect = document.getElementById('sample-mode-select');
  sampleSelect?.addEventListener('change', () => {
    state.sampleMode = sampleSelect.value;
    runEvaluationFromState();
    renderComparisonSection();
    announce(
      state.sampleMode === '101'
        ? 'Menggunakan 101 titik sampel rapat.'
        : 'Menggunakan 10 titik sampel diskrit Bab 4.'
    );
  });

  document.getElementById('eval-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const trimmedName = (document.getElementById('spot-name')?.value || '').trim();
    const check = validateInputs(
      document.getElementById('temp-number')?.value,
      document.getElementById('noise-number')?.value,
      document.getElementById('light-number')?.value
    );

    const allErrors = { ...check.errors };
    if (!trimmedName) {
      allErrors.spotName = 'Nama ruang kerja wajib diisi sebelum disimpan ke komparasi.';
    }
    if (Object.keys(allErrors).length > 0) {
      showFieldErrors(allErrors);
      return;
    }

    clearFieldErrors();
    state.spotName = trimmedName;
    state.temp = check.values.temp;
    state.noise = check.values.noise;
    state.light = check.values.light;
    runEvaluationFromState();

    const existingIdx = state.comparisonList.findIndex(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    const newEntry = {
      id: existingIdx >= 0 ? state.comparisonList[existingIdx].id : `spot-${Date.now()}`,
      name: trimmedName,
      temp: state.temp,
      noise: state.noise,
      light: state.light,
      isSampleNote: 'Tersimpan'
    };

    if (existingIdx >= 0) {
      state.comparisonList[existingIdx] = newEntry;
      saveComparison();
      renderComparisonSection();
      document.getElementById('komparasi')?.scrollIntoView({ behavior: 'smooth' });
      announce(`Data ${trimmedName} diperbarui.`);
      return;
    }

    if (state.comparisonList.length >= 3) {
      openReplaceDialog(newEntry);
      return;
    }

    state.comparisonList.push(newEntry);
    saveComparison();
    renderComparisonSection();
    document.getElementById('komparasi')?.scrollIntoView({ behavior: 'smooth' });
    announce(`${trimmedName} disimpan ke komparasi.`);
  });

  document.getElementById('reset-form-btn')?.addEventListener('click', () => {
    applyInputValues('Studi Kasus: Spot WFC A', 25, 60, 300);
    announce('Formulir direset ke Studi Kasus Spot WFC A.');
  });

  document.getElementById('load-case-a-btn')?.addEventListener('click', () => {
    state.sampleMode = '10';
    if (sampleSelect) sampleSelect.value = '10';
    applyInputValues('Studi Kasus: Spot WFC A', 25, 60, 300);
    announce('Studi Kasus Spot WFC A dimuat: Skor 75,00.');
  });

  document.getElementById('jump-to-steps-link')?.addEventListener('click', () => {
    activateTabById('tab-steps', false);
  });
}

function setupTabs() {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => activateTabById(tab.id, false));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        activateTabById(tabs[(idx + 1) % tabs.length].id, true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        activateTabById(tabs[(idx - 1 + tabs.length) % tabs.length].id, true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        activateTabById(tabs[0].id, true);
      } else if (e.key === 'End') {
        e.preventDefault();
        activateTabById(tabs[tabs.length - 1].id, true);
      }
    });
  });
}

function setupThemeAndNavigation() {
  const themeBtn = document.getElementById('theme-toggle');
  const themeLabel = document.getElementById('theme-toggle-label');

  function syncThemeUI() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      themeBtn.setAttribute('aria-label', isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
    }
    if (themeLabel) themeLabel.textContent = isDark ? 'Terang' : 'Gelap';
  }

  syncThemeUI();

  themeBtn?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, next);
    } catch (_e) {}
    syncThemeUI();
    chartsManager.refreshTheme(state.currentResult);
    announce(next === 'dark' ? 'Mode gelap aktif.' : 'Mode terang aktif.');
  });

  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');

  function closeMobileDrawer(returnFocus = false) {
    if (!mobileDrawer || !mobileBtn) return;
    mobileDrawer.hidden = true;
    mobileBtn.setAttribute('aria-expanded', 'false');
    mobileBtn.textContent = 'Menu';
    if (returnFocus) mobileBtn.focus();
  }

  mobileBtn?.addEventListener('click', () => {
    if (!mobileDrawer) return;
    const willOpen = mobileDrawer.hidden;
    mobileDrawer.hidden = !willOpen;
    mobileBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    mobileBtn.textContent = willOpen ? 'Tutup' : 'Menu';
  });

  document.querySelectorAll('.mobile-nav-item').forEach((link) => {
    link.addEventListener('click', () => closeMobileDrawer(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileDrawer && !mobileDrawer.hidden) {
      closeMobileDrawer(true);
    }
  });
}

function setupComparisonAndRulesActions() {
  const loadPresets = () => {
    state.comparisonList = PRESET_SPOTS.map((item) => ({ ...item }));
    saveComparison();
    renderComparisonSection();
    announce('Tiga sampel uji komparasi dimuat.');
  };

  document.getElementById('load-preset-comparison-btn')?.addEventListener('click', loadPresets);
  document.getElementById('empty-load-preset-btn')?.addEventListener('click', loadPresets);

  document.getElementById('clear-comparison-btn')?.addEventListener('click', () => {
    state.comparisonList = [];
    saveComparison();
    renderComparisonSection();
    announce('Papan komparasi dikosongkan.');
  });

  document.getElementById('reset-storage-btn')?.addEventListener('click', () => {
    state.comparisonList = [{ ...PRESET_SPOTS[0] }, { ...PRESET_SPOTS[1] }];
    saveComparison();
    const banner = document.getElementById('storage-error-banner');
    if (banner) banner.hidden = true;
    renderComparisonSection();
    announce('Sesi dipulihkan.');
  });

  const filterOut = document.getElementById('rule-filter-output');
  const filterStatus = document.getElementById('rule-filter-status');

  filterOut?.addEventListener('change', () => {
    state.ruleFilterOutput = filterOut.value;
    if (state.currentResult) renderAllRulesTable(state.currentResult);
  });

  filterStatus?.addEventListener('change', () => {
    state.ruleFilterStatus = filterStatus.value;
    if (state.currentResult) renderAllRulesTable(state.currentResult);
  });

  document.getElementById('reset-rule-filter-btn')?.addEventListener('click', () => {
    state.ruleFilterOutput = 'ALL';
    state.ruleFilterStatus = 'ALL';
    if (filterOut) filterOut.value = 'ALL';
    if (filterStatus) filterStatus.value = 'ALL';
    if (state.currentResult) renderAllRulesTable(state.currentResult);
    announce('Filter aturan direset.');
  });

  const formulaDialog = document.getElementById('formula-dialog');
  const openFormulaBtn = document.getElementById('open-formula-dialog-btn');
  document.getElementById('close-formula-dialog-btn')?.addEventListener('click', () => {
    formulaDialog?.close();
    openFormulaBtn?.focus();
  });
  openFormulaBtn?.addEventListener('click', () => formulaDialog?.showModal());
  formulaDialog?.addEventListener('click', (e) => {
    if (e.target === formulaDialog) formulaDialog.close();
  });

  const replaceDialog = document.getElementById('replace-dialog');
  document.getElementById('cancel-replace-btn')?.addEventListener('click', () => {
    replaceDialog?.close();
    document.getElementById('add-compare-btn')?.focus();
  });
  replaceDialog?.addEventListener('click', (e) => {
    if (e.target === replaceDialog) replaceDialog.close();
  });
}

function bootstrap() {
  loadSavedComparison();
  setupThemeAndNavigation();
  setupTabs();
  setupFormControls();
  setupComparisonAndRulesActions();

  const chartStatus = document.getElementById('chart-loading-status');
  const chartError = document.getElementById('chart-error-box');
  const chartsOk = chartsManager.init();
  if (chartsOk) {
    if (chartStatus) chartStatus.textContent = 'Real-time';
    if (chartError) chartError.hidden = true;
  } else {
    if (chartStatus) chartStatus.textContent = 'Numerik';
    if (chartError) chartError.hidden = false;
  }

  runEvaluationFromState();
  renderComparisonSection();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
