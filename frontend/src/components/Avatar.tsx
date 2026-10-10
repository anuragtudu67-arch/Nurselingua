// Identity avatar: profile photo first, then a curated preset, then initials.
// The product uses no <img> tags (see tools/verify-ui.mjs), so a photo is
// rendered as a CSS background on the same span; the adjacent name always
// carries the accessible label, so the avatar itself stays decorative.
// All three variants resolve from the client-side preference store, so the
// shell, the profile menu and the Profile page always agree.
import { getAvatarPreset, getPhoto, usePrefs } from '../state/prefs';

export function initials(name?: string | null, email?: string | null): string {
  const source = (name || email || '').trim();
  if (!source) return 'N';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return 'N';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Curated, accessible preset avatars. No emoji: each is a simple SVG shape
 *  with a text label in the picker. */
export interface AvatarPreset {
  id: string;
  label: string;
  bg: string;
  glyph: JSX.Element;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'bridge', label: 'Bridge', bg: 'var(--av-bridge)',
    glyph: <><path d="M4 15c3-4 6-4 8 0s5 4 8 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><circle cx="8" cy="9" r="1.7" fill="currentColor" /><circle cx="16" cy="9" r="1.7" fill="currentColor" /></>,
  },
  {
    id: 'wave', label: 'Wave', bg: 'var(--av-wave)',
    glyph: <path d="M4 10c2.5-2.6 5-2.6 7.5 0s5 2.6 7.5 0M4 15c2.5-2.6 5-2.6 7.5 0s5 2.6 7.5 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  },
  {
    id: 'arc', label: 'Arc', bg: 'var(--av-arc)',
    glyph: <><path d="M5 16a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M12 4v3M5.5 7l2 2M18.5 7l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
  },
  {
    id: 'orbit', label: 'Orbit', bg: 'var(--av-orbit)',
    glyph: <><circle cx="12" cy="12" r="3.4" fill="currentColor" /><ellipse cx="12" cy="12" rx="8.5" ry="4" fill="none" stroke="currentColor" strokeWidth="1.8" transform="rotate(-24 12 12)" /></>,
  },
  {
    id: 'dawn', label: 'Dawn', bg: 'var(--av-dawn)',
    glyph: <><path d="M4 16h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M7 12a5 5 0 0 1 10 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M12 4v2.5M5.6 7.2l1.7 1.7M18.4 7.2l-1.7 1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  },
  {
    id: 'ledger', label: 'Lines', bg: 'var(--av-ledger)',
    glyph: <path d="M6 8h12M6 12h12M6 16h7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  },
];

export function presetById(id: string | null): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((p) => p.id === id);
}

export default function Avatar({ name, email, size = 36 }: {
  name?: string | null; email?: string | null; size?: number;
}) {
  usePrefs(); // re-render when photo/preset changes anywhere in the app
  const photo = getPhoto();
  const preset = presetById(getAvatarPreset());

  if (photo) {
    return (
      <span
        className="avatar"
        aria-hidden="true"
        style={{
          width: size, height: size,
          backgroundImage: `url(${photo})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}
      />
    );
  }
  if (preset) {
    return (
      <span
        className="avatar"
        aria-hidden="true"
        style={{ width: size, height: size, background: preset.bg }}
      >
        <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)}
          viewBox="0 0 24 24" focusable="false">{preset.glyph}</svg>
      </span>
    );
  }
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials(name, email)}
    </span>
  );
}
