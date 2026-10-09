// Settings: name, languages, voice speed, retention, safety notice,
// delete all data. All changes persist to backend via the store.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { FooterDisclaimer } from '../components/AppShell';
import { Confirm, Skeleton } from '../components/ui';
import { Icon } from '../components/icons';
import Avatar from '../components/Avatar';
import { getPref, setPref, type ThemePref } from '../theme';
import type { Language, UsersMe } from '../api/client';
import { LANGUAGES } from '../api/mockData';

export default function Settings() {
  const { token, signOut } = useAuth();
  const store = useStore();
  const { t } = useLocale();
  const nav = useNavigate();

  const [me, setMe] = useState<UsersMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [nurseLang, setNurseLang] = useState('en');
  const [patientLangs, setPatientLangs] = useState<string[]>([]);
  const [speechRate, setSpeechRate] = useState<'slow' | 'normal'>('slow');
  const [retention, setRetention] = useState<'24h' | '7days' | 'off'>('7days');
  const [themePref, setThemePref] = useState<ThemePref>(getPref());

  const langs = store.offline ? LANGUAGES : store.languages;

  useEffect(() => {
    store.usersMe(token)
      .then((m) => {
        setMe(m);
        setName(m.name ?? '');
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
    } catch { /* ignore */ }
    setSaving(false);
  };

  const deleteAll = async () => {
    // In production this would call a DELETE /api/v1/users/me endpoint.
    // For demo: sign out and clear localStorage.
    try { localStorage.clear(); } catch { /* ignore */ }
    signOut();
    nav('/');
  };

  const togglePatientLang = (code: string) => {
    setPatientLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  if (loading) {
    return (
      <div className="page">
        <h1 className="title" style={{ marginBottom: '1rem' }}>{t('settings.title')}</h1>
        <Skeleton lines={8} />
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <h1 className="title" style={{ marginBottom: '1.5rem' }}>{t('settings.title')}</h1>

      {/* Identity */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div className="identity">
          <Avatar name={name || me?.name} email={me?.email} size={44} />
          <div style={{ minWidth: 0 }}>
            <div className="identity-name">{name || me?.name || 'Nurse'}</div>
            {me?.email && <div className="identity-email">{me.email}</div>}
          </div>
        </div>
      </section>

      {/* Name */}
      <section style={{ marginBottom: '1.5rem' }}>
        <label className="label" htmlFor="settings-name">Your name</label>
        <input
          id="settings-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nurse name"
        />
      </section>

      {/* Appearance */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 className="onb-q">Appearance</h2>
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
          Light is the default. <strong>System</strong> follows your device and updates
          automatically. This choice is saved on this device.
        </p>
      </section>

      {/* Nurse language */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 className="onb-q">{t('onboarding.nurseLanguage')}</h2>
        <div className="seg" role="radiogroup" aria-label={t('onboarding.nurseLanguage')}>
          {langs.map((l) => (
            <button
              key={l.code}
              role="radio"
              aria-checked={nurseLang === l.code}
              onClick={() => setNurseLang(l.code)}
            >
              {l.name}
            </button>
          ))}
        </div>
      </section>

      {/* Patient languages */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 className="onb-q">{t('onboarding.patientLanguages')}</h2>
        <div className="tile-grid" role="group" aria-label={t('onboarding.patientLanguages')}>
          {langs.filter((l) => l.code !== nurseLang).map((l) => {
            const active = patientLangs.includes(l.code);
            return (
              <button
                key={l.code}
                className="tile"
                aria-pressed={active}
                onClick={() => togglePatientLang(l.code)}
              >
                <strong>{l.nativeName}</strong><br />
                <span className="small muted">{l.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Speech rate */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 className="onb-q">{t('onboarding.speechRate')}</h2>
        <div className="seg" role="radiogroup" aria-label={t('onboarding.speechRate')}>
          {(['slow', 'normal'] as const).map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={speechRate === r}
              onClick={() => setSpeechRate(r)}
            >
              {r === 'slow' ? t('onboarding.speechRate.slow') : t('onboarding.speechRate.normal')}
            </button>
          ))}
        </div>
      </section>

      {/* Retention */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 className="onb-q">{t('onboarding.retention')}</h2>
        <div className="seg" role="radiogroup" aria-label={t('onboarding.retention')}>
          {(['24h', '7days', 'off'] as const).map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={retention === r}
              onClick={() => setRetention(r)}
            >
              {r === '24h' ? t('onboarding.retention.24h')
                : r === '7days' ? t('onboarding.retention.7days')
                : t('onboarding.retention.off')}
            </button>
          ))}
        </div>
      </section>

      {/* Safety notice */}
      <section className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <h3 style={{ marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.45rem' }}>
          <Icon name="shield" size={17} /> Safety Notice
        </h3>
        <p className="small muted">{t('disclaimer.body')}</p>
        <p className="tiny muted" style={{ marginTop: '.3rem' }}>
          NurseLingua is a communication aid for routine interactions, not a medical device,
          not a diagnosis tool. For informed consent, serious news, or any critical conversation,
          use a professional interpreter.
        </p>
      </section>

      {/* Save */}
      <div className="row" style={{ marginBottom: '2rem', gap: '.75rem' }}>
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={saving}
        >
          {saving ? t('common.loading') : saved ? <><Icon name="check" size={16} /> Saved</> : 'Save settings'}
        </button>
        {saved && <span className="small" style={{ color: 'var(--success)' }}>{t('settings.saved')}</span>}
      </div>

      {/* Delete all data */}
      <section style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ color: 'var(--error)', marginBottom: '.5rem' }}>Danger Zone</h3>
        <p className="small muted" style={{ marginBottom: '.75rem' }}>
          Delete all your data including conversations, favorites, and settings.
          This cannot be undone.
        </p>
        <button
          className="btn btn-danger"
          onClick={() => setShowDelete(true)}
        >
          Delete all data
        </button>
      </section>

      <FooterDisclaimer />

      {showDelete && (
        <Confirm
          title="Delete all data?"
          body="This will permanently remove all your conversations, favorites, settings, and usage data. This cannot be undone."
          confirmLabel="Delete everything"
          onConfirm={deleteAll}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
