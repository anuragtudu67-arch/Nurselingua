// Profile: grouped account, photo/avatar, language profiles (each with its own
// direction, stage, and weekly goal), appearance, audio, privacy, and account
// actions, with destructive controls separated at the bottom.
//
// Persistence split (documented in the UI itself):
//   server-backed (frozen contract): nurse language, patient languages,
//     speech rate, retention  -> saved with the Save button
//   client-side adapter: display name, photo, avatar preset, support stages,
//     weekly goals, active profile, appearance -> save instantly on this device
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { FooterDisclaimer } from '../components/AppShell';
import { Confirm, Skeleton } from '../components/ui';
import { Icon } from '../components/icons';
import Avatar, { AVATAR_PRESETS } from '../components/Avatar';
import StageControl from '../components/StageControl';
import { getPref, setPref, type ThemePref } from '../theme';
import type { Favorite, UsersMe } from '../api/client';
import { LANGUAGES } from '../api/mockData';
import {
  getActiveLang, setActiveLang, getDisplayName, setDisplayName,
  getGoal, setGoal, getPhoto, setPhoto, getAvatarPreset, setAvatarPreset,
  processPhotoFile, PHOTO_STORAGE_NOTE, getStage, STAGES, usePrefs,
} from '../state/prefs';

const GOAL_CHOICES = [0, 2, 3, 5, 7];

export default function Settings() {
  const { token, email, signOut } = useAuth();
  const store = useStore();
  const { t } = useLocale();
  const nav = useNavigate();
  usePrefs(); // photo / stage / goal / active-profile edits re-render immediately

  const [me, setMe] = useState<UsersMe | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [switchTo, setSwitchTo] = useState<string | null>(null);

  // server-backed fields
  const [name, setName] = useState('');
  const [nurseLang, setNurseLang] = useState('en');
  const [patientLangs, setPatientLangs] = useState<string[]>([]);
  const [speechRate, setSpeechRate] = useState<'slow' | 'normal'>('slow');
  const [retention, setRetention] = useState<'24h' | '7days' | 'off'>('7days');
  const [themePref, setThemePref] = useState<ThemePref>(getPref());

  // photo adapter states
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const langs = store.offline ? LANGUAGES : store.languages;
  const activeLang = getActiveLang();

  useEffect(() => {
    Promise.all([store.usersMe(token), store.listFavorites(token)])
      .then(([m, f]) => {
        setMe(m);
        setFavorites(f);
        setName(getDisplayName() || m.name || '');
        setNurseLang(m.settings.nurseLanguage);
        setPatientLangs(m.settings.patientLanguages);
        setSpeechRate(m.settings.speechRate as 'slow' | 'normal');
        setRetention(m.settings.retention as '24h' | '7days' | 'off');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [store, token]);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await store.saveSettings({
        nurseLanguage: nurseLang,
        patientLanguages: patientLangs,
        speechRate,
        retention,
      }, token);
      setMe(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError('Could not save to your account. Check your connection and try again.');
    }
    setSaving(false);
  };

  const deleteAll = async () => {
    try { localStorage.clear(); } catch { /* ignore */ }
    signOut();
    nav('/');
  };

  const signOutNow = () => {
    signOut();
    nav('/');
  };

  const togglePatientLang = (code: string) => {
    setPatientLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const dataUrl = await processPhotoFile(file);
      setPhoto(dataUrl);          // honest: stored only after encoding succeeds
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'The photo could not be read.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const choosePreset = (id: string) => {
    if (getPhoto()) setPhoto(null); // a preset replaces the photo, visibly
    setAvatarPreset(getAvatarPreset() === id ? null : id);
  };

  const confirmSwitch = () => {
    if (!switchTo) return;
    setActiveLang(switchTo);
    setSwitchTo(null);
  };

  if (loading) {
    return (
      <div className="page">
        <h1 className="title" style={{ marginBottom: '1rem' }}>{t('settings.title')}</h1>
        <Skeleton lines={8} />
      </div>
    );
  }

  const photo = getPhoto();
  const presetId = getAvatarPreset();
  const langObj = (code: string) => langs.find((l) => l.code === code);
  const nurseName = langObj(nurseLang)?.name ?? nurseLang;
  const switchTarget = switchTo ? langObj(switchTo) : null;
  const switchStage = switchTo
    ? t(STAGES[Math.max(0, STAGES.findIndex((s) => s.id === getStage(switchTo)))].nameKey)
    : '';

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <h1 className="title" style={{ marginBottom: '1.5rem' }}>{t('settings.title')}</h1>

      {/* ---------- account ---------- */}
      <section className="set-group">
        <h2>Account</h2>
        <p className="set-sub">How you appear in the app.</p>

        <div className="row" style={{ alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <Avatar name={name || me?.name} email={me?.email} size={72} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: '.6rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}
                disabled={photoBusy}>
                <Icon name="doc" size={16} /> {photo ? 'Change photo' : 'Upload photo'}
              </button>
              {photo && (
                <button className="btn btn-quiet" onClick={() => { setPhoto(null); setPhotoError(null); }}>
                  Remove photo
                </button>
              )}
            </div>
            <input
              ref={fileRef} type="file" accept="image/*" hidden
              onChange={pickPhoto} aria-hidden="true" tabIndex={-1}
            />
            {photoBusy && (
              <div className="upload-progress" role="status" aria-label="Reading photo">
                <span />
              </div>
            )}
            {photoError && (
              <p className="small" role="alert" style={{ color: 'var(--error)', marginTop: '.5rem' }}>
                {photoError}
              </p>
            )}
            <p className="tiny muted" style={{ marginTop: '.5rem', marginBottom: 0 }}>
              {PHOTO_STORAGE_NOTE}
            </p>
          </div>
        </div>

        <p className="label" id="avatar-picker-label">Or pick an avatar</p>
        <div className="avatar-grid" role="group" aria-labelledby="avatar-picker-label">
          {AVATAR_PRESETS.map((p) => (
            <button
              key={p.id}
              className="avatar-opt"
              aria-pressed={presetId === p.id && !photo}
              aria-label={`${p.label} avatar`}
              onClick={() => choosePreset(p.id)}
            >
              <span className="avatar-preset" style={{ background: p.bg }} aria-hidden="true">
                <svg width="60%" height="60%" viewBox="0 0 24 24" focusable="false">{p.glyph}</svg>
              </span>
            </button>
          ))}
        </div>
        <p className="tiny muted" style={{ marginTop: '.4rem' }}>
          Avatars are drawn shapes, never emoji. A photo takes priority over an avatar.
        </p>

        <div style={{ marginTop: '1rem' }}>
          <label className="label" htmlFor="settings-name">Display name</label>
          <input
            id="settings-name"
            className="input"
            value={name}
            onChange={(e) => { setName(e.target.value); setDisplayName(e.target.value); }}
            placeholder="Nurse name"
            autoComplete="nickname"
          />
          <p className="setting-help">
            Saved automatically on this device. Your sign-in email stays {email ?? 'as signed in'}.
          </p>
        </div>
      </section>

      {/* ---------- languages (account-wide, server-backed) ---------- */}
      <section className="set-group">
        <h2>Languages</h2>
        <p className="set-sub">Account-wide. Saved with the Save button below.</p>

        <div style={{ marginBottom: '1.1rem' }}>
          <h3 style={{ fontSize: '.95rem', marginBottom: '.5rem' }}>{t('onboarding.nurseLanguage')}</h3>
          <div className="seg" role="radiogroup" aria-label={t('onboarding.nurseLanguage')}>
            {langs.map((l) => (
              <button key={l.code} role="radio" aria-checked={nurseLang === l.code}
                onClick={() => setNurseLang(l.code)}>
                {l.name}
            </button>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '.95rem', marginBottom: '.5rem' }}>{t('onboarding.patientLanguages')}</h3>
          <div className="tile-grid" role="group" aria-label={t('onboarding.patientLanguages')}>
            {langs.filter((l) => l.code !== nurseLang).map((l) => {
              const active = patientLangs.includes(l.code);
              return (
                <button key={l.code} className="tile" aria-pressed={active}
                  onClick={() => togglePatientLang(l.code)}>
                  <strong>{l.nativeName}</strong><br />
                  <span className="small muted">{l.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- language profiles ---------- */}
      <section className="set-group">
        <h2>Language profiles</h2>
        <p className="set-sub">
          Each profile keeps its own direction, support stage, and weekly goal.
          Switching states the full direction and asks you to confirm.
        </p>

        {patientLangs.length === 0 && (
          <p className="small muted">
            Add a patient language above and it appears here as its own profile.
          </p>
        )}

        {patientLangs.map((code) => {
          const l = langObj(code);
          const isActive = activeLang === code;
          const savedCount = favorites.filter((f) => f.languageCode === code)
            .reduce((acc, f) => (acc.some((x) => x === f.phraseId) ? acc : [...acc, f.phraseId]), [] as string[])
            .length;
          const goal = getGoal(code);
          return (
            <div key={code} className={`profile-card${isActive ? ' active-profile' : ''}`}>
              <div className="between" style={{ marginBottom: '.5rem', flexWrap: 'wrap', gap: '.5rem' }}>
                <span className="direction">
                  <span className="dir-from">{nurseName}</span>
                  <span className="dir-arrow" aria-hidden="true"><Icon name="arrowRight" size={15} /></span>
                  <span>{l?.name ?? code}</span>
                  <span className="small muted" style={{ fontWeight: 500 }}>({l?.nativeName ?? code})</span>
                </span>
                {isActive ? (
                  <span className="stage-chip"><Icon name="check" size={13} /> Active profile</span>
                ) : (
                  <button className="btn btn-secondary" style={{ minHeight: 36, fontSize: '.82rem' }}
                    onClick={() => setSwitchTo(code)}>
                    Make active
                  </button>
                )}
              </div>

              <StageControl lang={code} label={`Support stage for ${l?.name ?? code}`} />

              <div className="set-row" style={{ borderTop: '1px solid var(--border-l)', marginTop: '.6rem' }}>
                <div className="set-row-main">
                  <div className="set-row-label">Weekly goal</div>
                  <div className="set-row-desc">
                    How many conversations you aim for each week in this profile. Shows on Home.
                  </div>
                </div>
                <select
                  className="select" style={{ width: 'auto' }}
                  aria-label={`Weekly goal for ${l?.name ?? code}`}
                  value={goal}
                  onChange={(e) => setGoal(code, Number(e.target.value))}
                >
                  {GOAL_CHOICES.map((g) => (
                    <option key={g} value={g}>{g === 0 ? 'No goal' : `${g} per week`}</option>
                  ))}
                </select>
              </div>

              <div className="set-row">
                <div className="set-row-main">
                  <div className="set-row-label">Saved phrases</div>
                  <div className="set-row-desc">Starred in Learn and available in Review.</div>
                </div>
                <strong>{savedCount}</strong>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: '1rem' }}>
          <StageControl lang={null} label="Default stage for profiles without their own" />
        </div>
      </section>

      {/* ---------- appearance ---------- */}
      <section className="set-group">
        <h2>Appearance</h2>
        <p className="set-sub">Applies instantly, everywhere in the app.</p>
        <div className="seg" role="radiogroup" aria-label="Appearance">
          {(['light', 'dark', 'system'] as const).map((p) => (
            <button
              key={p}
              role="radio"
              aria-checked={themePref === p}
              onClick={() => { setPref(p); setThemePref(p); }}
            >
              {p === 'light' ? 'Light' : p === 'dark' ? 'Dark' : 'System'}
            </button>
          ))}
        </div>
        <p className="setting-help">
          <strong>System</strong> is the default: it follows your device and updates
          automatically. Pinning Light or Dark overrides it. This choice is saved on
          this device; the account has no theme field.
        </p>
      </section>

      {/* ---------- audio ---------- */}
      <section className="set-group">
        <h2>Audio</h2>
        <p className="set-sub">How patient-facing phrases are spoken aloud.</p>
        <div className="seg" role="radiogroup" aria-label={t('onboarding.speechRate')}>
          {(['slow', 'normal'] as const).map((r) => (
            <button key={r} role="radio" aria-checked={speechRate === r}
              onClick={() => setSpeechRate(r)}>
              {r === 'slow' ? t('onboarding.speechRate.slow') : t('onboarding.speechRate.normal')}
            </button>
          ))}
        </div>
        <p className="setting-help">
          Slow is easier to follow at the bedside; Normal is quicker for familiar phrases.
        </p>
      </section>

      {/* ---------- privacy ---------- */}
      <section className="set-group">
        <h2>Privacy</h2>
        <p className="set-sub">You choose how long conversations stay in history.</p>
        <div className="seg" role="radiogroup" aria-label={t('onboarding.retention')}>
          {(['24h', '7days', 'off'] as const).map((r) => (
            <button key={r} role="radio" aria-checked={retention === r}
              onClick={() => setRetention(r)}>
              {r === '24h' ? t('onboarding.retention.24h')
                : r === '7days' ? t('onboarding.retention.7days')
                : t('onboarding.retention.off')}
            </button>
          ))}
        </div>
        <p className="setting-help">{t('history.autoExpiry')}</p>
      </section>

      {/* ---------- safety notice ---------- */}
      <section className="set-group">
        <h2>Safety notice</h2>
        <p className="small muted" style={{ margin: 0 }}>{t('disclaimer.body')}</p>
        <p className="tiny muted" style={{ marginTop: '.35rem', marginBottom: 0 }}>
          Ningua is a communication aid for routine interactions, not a medical device,
          not a diagnosis tool. For informed consent, serious news, or any critical
          conversation, use a professional interpreter.
        </p>
      </section>

      {/* ---------- save (server-backed fields) ---------- */}
      <div className="row" style={{ gap: '.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? t('common.loading') : saved ? <><Icon name="check" size={16} /> Saved</> : 'Save languages and privacy'}
        </button>
        {saved && <span className="small" style={{ color: 'var(--success)' }}>{t('settings.saved')}</span>}
        {saveError && (
          <span className="small" role="alert" style={{ color: 'var(--error)' }}>{saveError}</span>
        )}
      </div>
      <p className="tiny muted" style={{ marginTop: '-1rem', marginBottom: '1.5rem' }}>
        Support stages, goals, your photo, avatar, and display name save instantly on
        this device, so they have no Save button.
      </p>

      {/* ---------- account actions ---------- */}
      <section className="set-group">
        <h2>Account actions</h2>
        <div className="set-row">
          <div className="set-row-main">
            <div className="set-row-label">Sign out</div>
            <div className="set-row-desc">Ends this session on this device. Your data stays.</div>
          </div>
          <button className="btn btn-secondary" onClick={signOutNow}>Sign out</button>
        </div>
      </section>

      {/* ---------- danger zone (separated) ---------- */}
      <section style={{ borderTop: '2px solid var(--error)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ color: 'var(--error)', marginBottom: '.5rem' }}>Delete all data</h3>
        <p className="small muted" style={{ marginBottom: '.75rem' }}>
          Permanently removes your conversations, favorites, settings, usage data, and
          the preferences stored on this device. This cannot be undone.
        </p>
        <button className="btn btn-danger" onClick={() => setShowDelete(true)}>
          Delete everything
        </button>
      </section>

      <FooterDisclaimer />

      {switchTo && switchTarget && (
        <Confirm
          title={`Switch to ${nurseName} to ${switchTarget.name}?`}
          body={`Your active profile becomes ${nurseName} to ${switchTarget.name} (${switchTarget.nativeName}), `
            + `with the ${switchStage} stage and its own weekly goal. Account-wide settings do not change, `
            + 'and you can switch back at any time.'}
          confirmLabel="Switch profile"
          onConfirm={confirmSwitch}
          onClose={() => setSwitchTo(null)}
        />
      )}

      {showDelete && (
        <Confirm
          title="Delete all data?"
          body="This will permanently remove all your conversations, favorites, settings, usage data, and device preferences. This cannot be undone."
          confirmLabel="Delete everything"
          onConfirm={deleteAll}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
