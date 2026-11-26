import { validateInputs } from './fuzzyEngine.js';

export const STORAGE_KEY_ACTIVE = 'wfc_k3_active_spot_v2';
export const STORAGE_KEY_SPOTS = 'wfc_k3_mamdani_comparison_v2';
export const STORAGE_KEY_THEME = 'wfc_theme';

export const DEFAULT_ACTIVE_SPOT = {
  name: 'Studi Kasus: Spot WFC A',
  temp: 25,
  noise: 60,
  light: 300,
  sampleMode: '10'
};

export const PRESET_SPOTS = [
  { id: 'preset-spot-a', name: 'Studi Kasus: Spot WFC A', temp: 25, noise: 60, light: 300, isSampleNote: 'Bab 4 Laporan' },
  { id: 'preset-spot-b', name: 'Sampel: Ruang Baca Tenang', temp: 24, noise: 42, light: 400, isSampleNote: 'Simulasi' },
  { id: 'preset-spot-c', name: 'Sampel: Teras Kafe Sore', temp: 29, noise: 74, light: 160, isSampleNote: 'Simulasi' }
];

export function fmtNum(val, decimals = 2) {
  return Number(val).toFixed(decimals).replace('.', ',');
}

export function fmtVal(val) {
  return String(val).replace('.', ',');
}

export function statusMeta(key) {
  if (key === 'ideal') return { cls: 'status-ideal', symbol: '[+]' };
  if (key === 'cukup') return { cls: 'status-santai', symbol: '[~]' };
  return { cls: 'status-tidak', symbol: '[-]' };
}

export function outputShortKey(outputLabel) {
  if (outputLabel === 'Sangat Ideal') return 'ideal';
  if (outputLabel === 'Cukup Nyaman') return 'cukup';
  return 'tidak';
}

export function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function announce(message) {
  const el = document.getElementById('polite-announcer');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

export function loadActiveSpot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (!raw) return { ...DEFAULT_ACTIVE_SPOT };
    const parsed = JSON.parse(raw);
    const check = validateInputs(parsed.temp, parsed.noise, parsed.light);
    if (!check.valid) return { ...DEFAULT_ACTIVE_SPOT };
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim().slice(0, 60) : DEFAULT_ACTIVE_SPOT.name,
      temp: check.values.temp,
      noise: check.values.noise,
      light: check.values.light,
      sampleMode: parsed.sampleMode === '101' ? '101' : '10'
    };
  } catch (_err) {
    return { ...DEFAULT_ACTIVE_SPOT };
  }
}

export function saveActiveSpot(spot) {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify({
      name: spot.name,
      temp: spot.temp,
      noise: spot.noise,
      light: spot.light,
      sampleMode: spot.sampleMode === '101' ? '101' : '10'
    }));
    return true;
  } catch (_err) {
    return false;
  }
}

export function saveComparisonList(list) {
  try {
    localStorage.setItem(STORAGE_KEY_SPOTS, JSON.stringify(list));
    return true;
  } catch (_err) {
    return false;
  }
}

export function loadComparisonList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SPOTS);
    if (!raw) {
      const initial = [{ ...PRESET_SPOTS[0] }, { ...PRESET_SPOTS[1] }];
      saveComparisonList(initial);
      return { list: initial, error: false };
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
    return { list: sanitized, error: false };
  } catch (_err) {
    return { list: [{ ...PRESET_SPOTS[0] }], error: true };
  }
}
