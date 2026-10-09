// Appearance preference: Light, Dark, or System.
//
// System is the default unless a stored preference says otherwise. This is a
// client-side preference: the backend has no theme field in the settings
// contract, so the choice is persisted in localStorage and applied to
// <html data-theme> before first paint by the inline script in index.html (so
// there is no flash). When a backend preference is added later, only setPref /
// getPref need to change.

export type ThemePref = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

const KEY = 'nurselingua-theme';
const THEME_COLOR: Record<EffectiveTheme, string> = { light: '#f6f8f7', dark: '#0b0f14' };

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Stored preference, defaulting to System. Unknown values fall back to System. */
export function getPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function effective(pref: ThemePref): EffectiveTheme {
  if (pref === 'dark') return 'dark';
  if (pref === 'system') return prefersDark() ? 'dark' : 'light';
  return 'light';
}

/** Apply the resolved theme to the document (idempotent). */
export function apply(pref: ThemePref): void {
  const theme = effective(pref);
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
}

export function setPref(pref: ThemePref): void {
  try { localStorage.setItem(KEY, pref); } catch { /* private mode */ }
  apply(pref);
}

/** Called once on startup; keeps System in sync with OS changes. */
export function initTheme(): void {
  apply(getPref());
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => { if (getPref() === 'system') apply('system'); });
}
