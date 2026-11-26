import { evaluateMamdani, validateInputs, DEFAULT_CENTROID_SAMPLES, DENSE_CENTROID_SAMPLES } from './fuzzyEngine.js';
import { FuzzyChartsManager } from './charts.js';
import {
  DEFAULT_ACTIVE_SPOT, fmtNum, statusMeta, createEl, announce,
  loadActiveSpot, saveActiveSpot, loadComparisonList, saveComparisonList
} from './store.js';
import { initShell, updateNavCompareBadge, bindDialogBackdropClose } from './shell.js';

const SHORT_PARAM = { 'Suhu Ruangan': 'Suhu', 'Tingkat Kebisingan': 'Kebisingan', 'Intensitas Pencahayaan': 'Pencahayaan' };
const SHORT_STATUS = {
  'Ambang Maksimal K3': 'Ambang K3',
  'Perlu Penyesuaian': 'Sesuaikan',
  'Melebihi Batas K3': 'Melebihi K3',
  'Di Luar Standar': 'Luar Standar'
};

const BINDINGS = [
  { key: 'temp', sliderId: 'temp-slider', numId: 'temp-number', presetId: 'temp-preset', min: 16, max: 36 },
  { key: 'noise', sliderId: 'noise-slider', numId: 'noise-number', presetId: 'noise-preset', min: 30, max: 100 },
  { key: 'light', sliderId: 'light-slider', numId: 'light-number', presetId: 'light-preset', min: 0, max: 600 }
];

const FIELD_MAP = {
  spotName: ['spot-name', 'spot-name-error'],
  temp: ['temp-number', 'temp-error'],
  noise: ['noise-number', 'noise-error'],
  light: ['light-number', 'light-error']
};

const active = loadActiveSpot();
const state = { ...active, spotName: active.name, currentResult: null };
const charts = new FuzzyChartsManager();

function samplePoints() {
  return state.sampleMode === '101' ? DENSE_CENTROID_SAMPLES : DEFAULT_CENTROID_SAMPLES;
}

function persistActive() {
  saveActiveSpot({
    name: state.spotName.trim() || 'Ruang Tanpa Nama',
    temp: state.temp,
    noise: state.noise,
    light: state.light,
    sampleMode: state.sampleMode
  });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderCompactMu(id, muMap) {
  setText(id, Object.entries(muMap).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${fmtNum(v)}`).join(' · '));
}

function syncPreset(id, value) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.value = Array.from(sel.options).some((o) => o.value === String(value)) ? String(value) : '';
}

function renderResult(res) {
  setText('result-spot-title', state.spotName.trim() || 'Ruang sedang dievaluasi');
  setText('result-score-value', fmtNum(res.centroid.zStar));

  const meta = statusMeta(res.classification.key);
  const badge = document.getElementById('result-category-badge');
  if (badge) badge.className = `status-tag ${meta.cls} shrink-0`;
  setText('result-category-symbol', meta.symbol);
  setText('result-category-text', res.classification.shortLabel);
  setText('result-category-summary', res.classification.summary);
  setText('summary-active-rules', `${res.activeRules.length}/27`);
  setText('summary-centroid-fraction', `Z* = ${fmtNum(res.centroid.numerator)} / ${fmtNum(res.centroid.denominator)}`);
  setText('summary-aggregation', `${fmtNum(res.aggregation['Tidak Nyaman'])} / ${fmtNum(res.aggregation['Cukup Nyaman'])} / ${fmtNum(res.aggregation['Sangat Ideal'])}`);

  const grid = document.getElementById('k3-quick-grid');
  if (grid) {
    grid.replaceChildren();
    for (const rec of res.recommendations) {
      const rMeta = statusMeta(rec.statusKey);
      const chip = createEl('div', 'surface-subtle px-3 py-2 space-y-1');
      const top = createEl('div', 'flex items-center justify-between gap-1 text-[11px]');
      top.appendChild(createEl('span', 'text-muted-custom font-semibold', SHORT_PARAM[rec.param] || rec.param));
      top.appendChild(createEl('span', 'font-formula font-bold shrink-0', rec.valueText));
      chip.appendChild(top);
      chip.appendChild(createEl('span', `status-tag ${rMeta.cls} text-[11px]`, `${rMeta.symbol} ${SHORT_STATUS[rec.statusLabel] || rec.statusLabel}`));
      grid.appendChild(chip);
    }
  }

  renderCompactMu('temp-mu-summary', res.fuzzification.temp);
  renderCompactMu('noise-mu-summary', res.fuzzification.noise);
  renderCompactMu('light-mu-summary', res.fuzzification.light);
  syncPreset('temp-preset', res.inputs.temp);
  syncPreset('noise-preset', res.inputs.noise);
  syncPreset('light-preset', res.inputs.light);
}

function clearFieldErrors() {
  const summary = document.getElementById('form-error-summary');
  if (summary) {
    summary.hidden = true;
    summary.textContent = '';
  }
  for (const [inputId, errId] of Object.values(FIELD_MAP)) {
    document.getElementById(inputId)?.setAttribute('aria-invalid', 'false');
    const err = document.getElementById(errId);
    if (err) {
      err.hidden = true;
      err.textContent = '';
    }
  }
}

function showFieldErrors(errorMap, moveFocus = true) {
  const messages = [];
  let firstInvalid = null;
  for (const [key, msg] of Object.entries(errorMap)) {
    const pair = FIELD_MAP[key];
    if (!pair) continue;
    const inp = document.getElementById(pair[0]);
    const err = document.getElementById(pair[1]);
    if (inp) {
      inp.setAttribute('aria-invalid', 'true');
      if (!firstInvalid) firstInvalid = inp;
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
  if (moveFocus && firstInvalid) firstInvalid.focus();
}

function runEvaluation() {
  const check = validateInputs(state.temp, state.noise, state.light);
  if (!check.valid) {
    showFieldErrors(check.errors, false);
    return false;
  }
  clearFieldErrors();
  const res = evaluateMamdani(state.temp, state.noise, state.light, samplePoints());
  state.currentResult = res;
  renderResult(res);
  charts.updateAll(res);
  persistActive();
  return true;
}

function syncInputsFromState() {
  const nameInp = document.getElementById('spot-name');
  if (nameInp) nameInp.value = state.spotName;
  for (const b of BINDINGS) {
    const slider = document.getElementById(b.sliderId);
    const num = document.getElementById(b.numId);
    if (slider) slider.value = String(state[b.key]);
    if (num) num.value = String(state[b.key]);
  }
}

function applySpot(name, temp, noise, light) {
  Object.assign(state, { spotName: name, temp, noise, light });
  syncInputsFromState();
  runEvaluation();
}

function updateSlotLabel(count) {
  setText('compare-slot-feedback', `${count}/3 slot`);
  updateNavCompareBadge(count);
}

function showSaveFeedback(message) {
  const box = document.getElementById('save-feedback');
  setText('save-feedback-text', message);
  if (box) box.hidden = false;
  announce(message);
}

function commitList(list, message) {
  if (!saveComparisonList(list)) {
    showSaveFeedback('Gagal menyimpan: penyimpanan browser diblokir atau penuh.');
    return;
  }
  updateSlotLabel(list.length);
  showSaveFeedback(message);
}

function openReplaceDialog(entry, list) {
  const dialog = document.getElementById('replace-dialog');
  const options = document.getElementById('replace-options-list');
  if (!dialog || !options) return;
  options.replaceChildren();
  list.forEach((item, index) => {
    const calc = evaluateMamdani(item.temp, item.noise, item.light, samplePoints());
    const btn = createEl('button', 'btn-secondary w-full justify-between text-left');
    btn.type = 'button';
    btn.appendChild(createEl('span', 'font-bold truncate', `${index + 1}. ${item.name}`));
    btn.appendChild(createEl('span', 'font-formula text-xs shrink-0', `Ganti (Z* ${fmtNum(calc.centroid.zStar)})`));
    btn.addEventListener('click', () => {
      const replaced = item.name;
      list[index] = entry;
      dialog.close();
      commitList(list, `${entry.name} menggantikan ${replaced} di papan komparasi.`);
    });
    options.appendChild(btn);
  });
  dialog.showModal();
}

function handleSubmit(e) {
  e.preventDefault();
  const name = (document.getElementById('spot-name')?.value || '').trim();
  const check = validateInputs(
    document.getElementById('temp-number')?.value,
    document.getElementById('noise-number')?.value,
    document.getElementById('light-number')?.value
  );
  const errors = { ...check.errors };
  if (!name) errors.spotName = 'Isi nama ruang kerja sebelum menyimpan ke komparasi.';
  if (Object.keys(errors).length > 0) {
    showFieldErrors(errors);
    return;
  }

  Object.assign(state, { spotName: name, ...check.values });
  runEvaluation();

  const { list } = loadComparisonList();
  const existingIdx = list.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
  const entry = {
    id: existingIdx >= 0 ? list[existingIdx].id : `spot-${Date.now()}`,
    name,
    temp: state.temp,
    noise: state.noise,
    light: state.light,
    isSampleNote: 'Tersimpan'
  };

  if (existingIdx >= 0) {
    list[existingIdx] = entry;
    commitList(list, `Data ${name} diperbarui di papan komparasi.`);
  } else if (list.length >= 3) {
    openReplaceDialog(entry, list);
  } else {
    list.push(entry);
    commitList(list, `${name} tersimpan (${list.length}/3 slot).`);
  }
}

function setupControls() {
  const nameInp = document.getElementById('spot-name');
  nameInp?.addEventListener('input', () => {
    state.spotName = nameInp.value;
    setText('result-spot-title', state.spotName.trim() || 'Ruang sedang dievaluasi');
    if (state.spotName.trim()) {
      nameInp.setAttribute('aria-invalid', 'false');
      const err = document.getElementById('spot-name-error');
      if (err) err.hidden = true;
      persistActive();
    }
  });

  for (const b of BINDINGS) {
    const slider = document.getElementById(b.sliderId);
    const num = document.getElementById(b.numId);
    const preset = document.getElementById(b.presetId);

    slider?.addEventListener('input', () => {
      state[b.key] = Number(slider.value);
      if (num) num.value = slider.value;
      runEvaluation();
    });

    num?.addEventListener('input', () => {
      if (num.value.trim() === '') {
        showFieldErrors({ [b.key]: 'Masukkan angka yang valid.' }, false);
        return;
      }
      const val = Number(num.value);
      state[b.key] = val;
      if (Number.isFinite(val) && val >= b.min && val <= b.max && slider) slider.value = String(val);
      runEvaluation();
    });

    preset?.addEventListener('change', () => {
      if (!preset.value) return;
      state[b.key] = Number(preset.value);
      if (slider) slider.value = preset.value;
      if (num) num.value = preset.value;
      runEvaluation();
    });
  }

  document.getElementById('eval-form')?.addEventListener('submit', handleSubmit);

  document.getElementById('reset-form-btn')?.addEventListener('click', () => {
    applySpot(DEFAULT_ACTIVE_SPOT.name, DEFAULT_ACTIVE_SPOT.temp, DEFAULT_ACTIVE_SPOT.noise, DEFAULT_ACTIVE_SPOT.light);
    announce('Formulir dikembalikan ke Studi Kasus Spot WFC A.');
  });

  document.getElementById('load-case-a-btn')?.addEventListener('click', () => {
    state.sampleMode = '10';
    applySpot(DEFAULT_ACTIVE_SPOT.name, DEFAULT_ACTIVE_SPOT.temp, DEFAULT_ACTIVE_SPOT.noise, DEFAULT_ACTIVE_SPOT.light);
    announce('Spot WFC A dimuat: skor 75,00.');
  });

  const replaceDialog = document.getElementById('replace-dialog');
  document.getElementById('cancel-replace-btn')?.addEventListener('click', () => {
    replaceDialog?.close();
    document.getElementById('add-compare-btn')?.focus();
  });
  bindDialogBackdropClose(replaceDialog);
}

function bootstrap() {
  initShell(() => charts.refreshTheme(state.currentResult));
  updateSlotLabel(loadComparisonList().list.length);
  syncInputsFromState();
  setupControls();

  const ok = charts.init();
  setText('chart-loading-status', ok ? 'Real-time' : 'Mode angka');
  const errBox = document.getElementById('chart-error-box');
  if (errBox) errBox.hidden = ok;

  runEvaluation();
}

bootstrap();
