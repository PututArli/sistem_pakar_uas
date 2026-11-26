import { STORAGE_KEY_THEME, announce, loadComparisonList } from './store.js';

export function updateNavCompareBadge(count) {
  for (const id of ['nav-compare-count', 'mobile-compare-count']) {
    const el = document.getElementById(id);
    if (el) el.textContent = `${count}/3`;
  }
}

export function initShell(onThemeChange) {
  updateNavCompareBadge(loadComparisonList().list.length);

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
    if (typeof onThemeChange === 'function') onThemeChange(next);
    announce(next === 'dark' ? 'Mode gelap aktif.' : 'Mode terang aktif.');
  });

  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');

  function closeMobileDrawer(returnFocus) {
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileDrawer && !mobileDrawer.hidden) closeMobileDrawer(true);
  });
}

export function bindDialogBackdropClose(dialog) {
  dialog?.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}
