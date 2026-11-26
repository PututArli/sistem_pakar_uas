import { evaluateMamdani } from './fuzzyEngine.js';
import { fmtNum, statusMeta, outputShortKey, createEl, announce, loadActiveSpot } from './store.js';
import { initShell } from './shell.js';

const spot = loadActiveSpot();
const result = evaluateMamdani(spot.temp, spot.noise, spot.light);
const filter = { output: 'ALL', status: 'ALL' };

function renderRules() {
  const tbody = document.getElementById('all-rules-tbody');
  const mobile = document.getElementById('all-rules-mobile-list');
  const empty = document.getElementById('rules-filter-empty');
  const tableWrap = document.getElementById('rules-table-wrapper');
  const countEl = document.getElementById('rules-count');

  const rows = result.evaluatedRules.filter((r) =>
    (filter.output === 'ALL' || r.output === filter.output) && (filter.status === 'ALL' || r.active)
  );

  countEl.textContent = `Menampilkan ${rows.length} dari 27 aturan`;
  empty.hidden = rows.length > 0;
  mobile.hidden = rows.length === 0;
  tableWrap.classList.toggle('sm:block', rows.length > 0);

  tbody.replaceChildren(...rows.map((rule) => {
    const meta = statusMeta(outputShortKey(rule.output));
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
    tr.appendChild(createEl('td', `py-2 px-3.5 font-formula text-right ${rule.active ? 'font-bold' : 'text-muted-custom'}`, rule.active ? `Aktif ${fmtNum(rule.alpha)}` : '0,00'));
    return tr;
  }));

  // Phones get stacked cards so the six-column table never scrolls sideways.
  mobile.replaceChildren(...rows.map((rule) => {
    const meta = statusMeta(outputShortKey(rule.output));
    const card = createEl('div', 'p-3 rounded-lg border space-y-1.5 text-xs');
    card.style.borderColor = rule.active ? 'var(--accent)' : 'var(--border-soft)';
    card.style.backgroundColor = rule.active ? 'var(--accent-tint)' : 'var(--bg-subtle)';
    const top = createEl('div', 'flex items-center justify-between gap-2');
    top.appendChild(createEl('span', 'font-formula font-bold text-sm', rule.id));
    top.appendChild(createEl('span', `status-tag ${meta.cls}`, `${meta.symbol} ${rule.output}`));
    const bottom = createEl('div', 'flex items-center justify-between gap-2 text-muted-custom');
    bottom.appendChild(createEl('span', '', `${rule.temp} · ${rule.noise} · ${rule.light}`));
    bottom.appendChild(createEl('span', 'font-formula font-bold', `α ${fmtNum(rule.alpha)}`));
    card.append(top, bottom);
    return card;
  }));
}

function bootstrap() {
  initShell();
  document.getElementById('active-rules-banner').textContent =
    `${result.activeRules.length} dari 27 aturan aktif untuk ${spot.name} (skor ${fmtNum(result.centroid.zStar)}).`;

  const outSel = document.getElementById('rule-filter-output');
  const statusSel = document.getElementById('rule-filter-status');
  outSel.addEventListener('change', () => {
    filter.output = outSel.value;
    renderRules();
  });
  statusSel.addEventListener('change', () => {
    filter.status = statusSel.value;
    renderRules();
  });
  document.getElementById('reset-rule-filter-btn').addEventListener('click', () => {
    filter.output = 'ALL';
    filter.status = 'ALL';
    outSel.value = 'ALL';
    statusSel.value = 'ALL';
    renderRules();
    announce('Filter direset, menampilkan 27 aturan.');
  });

  renderRules();
}

bootstrap();
