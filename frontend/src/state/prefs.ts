// Client-side preference adapter.
//
// The backend settings contract is FROZEN and has no fields for the support
// stage, display name, photo, avatar, weekly goal, active language profile, or
// review schedule. Those preferences therefore persist in localStorage on this
// device. Nothing here fabricates server data: every value is either a user
// choice (stored locally and labeled as such in the UI) or fetched from the
// real API elsewhere. When the backend grows matching fields, only the
// read/write helpers below need to move to the API client.
import { useSyncExternalStore } from 'react';
import type { TKey } from '../i18n/locale';

// ---------- storage helpers ----------

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* private mode or quota */ }
}
function remove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

// ---------- change notification ----------

let version = 0;
const listeners = new Set<() => void>();
function emit(): void {
  version += 1;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Re-render the component when any preference changes. */
export function usePrefs(): number {
  return useSyncExternalStore(subscribe, () => version, () => version);
}

// ---------- support stage ----------

export type Stage = 'support' | 'blend' | 'focus' | 'immersion';

export const STAGES: ReadonlyArray<{ id: Stage; nameKey: TKey; descKey: TKey }> = [
  { id: 'support', nameKey: 'stage.support', descKey: 'stage.support.desc' },
  { id: 'blend', nameKey: 'stage.blend', descKey: 'stage.blend.desc' },
  { id: 'focus', nameKey: 'stage.focus', descKey: 'stage.focus.desc' },
  { id: 'immersion', nameKey: 'stage.immersion', descKey: 'stage.immersion.desc' },
];

const STAGE_IDS: Stage[] = ['support', 'blend', 'focus', 'immersion'];

const DEFAULT_STAGE_KEY = 'ningua-stage-default';
const langStageKey = (lang: string) => `ningua-stage:${lang}`;

function isStage(v: unknown): v is Stage {
  return typeof v === 'string' && (STAGE_IDS as string[]).includes(v);
}

/** Account-wide default stage (Guided Blend until changed). */
export function getDefaultStage(): Stage {
  const v = read(DEFAULT_STAGE_KEY);
  return isStage(v) ? v : 'blend';
}
export function setDefaultStage(stage: Stage): void {
  write(DEFAULT_STAGE_KEY, stage);
  emit();
}

/** Stage for a language profile: its own override, else the account default. */
export function getStage(lang: string): Stage {
  const v = read(langStageKey(lang));
  return isStage(v) ? v : getDefaultStage();
}
export function setStage(lang: string, stage: Stage): void {
  write(langStageKey(lang), stage);
  emit();
}

/** Stage index within STAGES (for progress motifs). */
export function stageIndex(stage: Stage): number {
  return Math.max(0, STAGES.findIndex((s) => s.id === stage));
}

// ---------- active language profile ----------

const ACTIVE_KEY = 'ningua-active-lang';

export function getActiveLang(): string | null {
  return read(ACTIVE_KEY);
}
export function setActiveLang(lang: string | null): void {
  if (lang === null) remove(ACTIVE_KEY);
  else write(ACTIVE_KEY, lang);
  emit();
}

// ---------- weekly goal (conversations per week, 0 = off) ----------

const langGoalKey = (lang: string) => `ningua-goal:${lang}`;

export function getGoal(lang: string): number {
  const v = Number(read(langGoalKey(lang)));
  return Number.isFinite(v) && v > 0 ? Math.min(56, Math.round(v)) : 0;
}
export function setGoal(lang: string, goal: number): void {
  const n = Math.max(0, Math.min(56, Math.round(goal)));
  if (n === 0) remove(langGoalKey(lang));
  else write(langGoalKey(lang), String(n));
  emit();
}

// ---------- display name (auth shim stores only the email) ----------

const NAME_KEY = 'ningua-display-name';

export function getDisplayName(): string {
  return read(NAME_KEY) ?? '';
}
export function setDisplayName(name: string): void {
  const v = name.trim();
  if (!v) remove(NAME_KEY);
  else write(NAME_KEY, v.slice(0, 80));
  emit();
}

// ---------- profile photo ----------
//
// Adapter scope: there is no avatar upload endpoint in the frozen backend, so
// photos are stored on THIS DEVICE only (downscaled to 256px JPEG data URLs,
// typically 15-40 KB). The UI must say so; it must never imply a server save.
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_STORAGE_NOTE =
  'Photos are stored on this device only. Syncing across devices needs an ' +
  'object-storage endpoint, which this build does not have.';

const PHOTO_KEY = 'ningua-photo';

export function getPhoto(): string | null {
  return read(PHOTO_KEY);
}
export function setPhoto(dataUrl: string | null): void {
  if (dataUrl === null) remove(PHOTO_KEY);
  else write(PHOTO_KEY, dataUrl);
  emit();
}

/** Validate, downscale and encode an image file. Throws Error with a message
 *  that is safe to show the user; never fabricates success. */
export function processPhotoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('That file is not an image. Choose a JPEG, PNG, or WebP file.'));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      reject(new Error('That image is larger than 5 MB. Choose a smaller file.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The file could not be read. Please try again.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file could not be opened as an image.'));
      img.onload = () => {
        try {
          const size = 256;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Image processing is unavailable in this browser.')); return; }
          // Center-crop to a square so the circular frame looks right.
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          if (!dataUrl.startsWith('data:image/')) {
            reject(new Error('The image could not be encoded. Please try another file.'));
            return;
          }
          resolve(dataUrl);
        } catch {
          reject(new Error('The image could not be processed. Please try another file.'));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// ---------- avatar preset (alternative to a photo) ----------

const AVATAR_KEY = 'ningua-avatar';

export function getAvatarPreset(): string | null {
  return read(AVATAR_KEY);
}
export function setAvatarPreset(id: string | null): void {
  if (id === null) remove(AVATAR_KEY);
  else write(AVATAR_KEY, id);
  emit();
}

// ---------- review schedule (per device; sources are real favorites) ----------

type ReviewEntry = { dueAt: number };
const reviewKey = (lang: string) => `ningua-review:${lang}`;

function reviewMap(lang: string): Record<string, ReviewEntry> {
  return readJson<Record<string, ReviewEntry>>(reviewKey(lang), {});
}

export function isDue(lang: string, phraseId: string, now = Date.now()): boolean {
  const entry = reviewMap(lang)[phraseId];
  // Never reviewed before counts as due (the phrase is saved and unpracticed).
  return !entry || entry.dueAt <= now;
}

export function dueCount(lang: string, phraseIds: string[], now = Date.now()): number {
  return phraseIds.filter((id) => isDue(lang, id, now)).length;
}

/** "Got it": due again in 24 hours. "Again": due again in 10 minutes. */
export function recordReview(lang: string, phraseId: string, ok: boolean): void {
  const map = reviewMap(lang);
  const now = Date.now();
  map[phraseId] = { dueAt: now + (ok ? 24 * 3600_000 : 10 * 60_000) };
  write(reviewKey(lang), JSON.stringify(map));
  emit();
}

// ---------- home suggestion dismissal ----------

const SUGGEST_KEY = 'ningua-suggest-dismissed-at';

export function getSuggestDismissedAt(): number {
  const v = Number(read(SUGGEST_KEY));
  return Number.isFinite(v) ? v : 0;
}
export function dismissSuggestion(): void {
  write(SUGGEST_KEY, String(Date.now()));
  emit();
}
export function isSuggestionDismissed(): boolean {
  // Dismissal lasts for the rest of the day, then the suggestion returns.
  return Date.now() - getSuggestDismissedAt() < 24 * 3600_000;
}

// ---------- sign out / clear local preferences ----------

/** Clears only the preference keys owned by this module (auth/session and
 *  server-backed state live elsewhere and are removed by their owners). */
export function clearLocalPreferences(): void {
  [
    DEFAULT_STAGE_KEY, ACTIVE_KEY, NAME_KEY, PHOTO_KEY, AVATAR_KEY, SUGGEST_KEY,
  ].forEach(remove);
  try {
    const owned: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ningua-')) owned.push(k);
    }
    owned.forEach(remove);
  } catch { /* private mode */ }
  emit();
}
