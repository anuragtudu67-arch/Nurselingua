// Onboarding: the nurse's language, common patient languages, speech rate,
// retention. Resumable: choices persist in localStorage as they're made, so an
// abandoned run can be completed later (spec §7.2).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { FooterDisclaimer } from '../components/AppShell';
import { Icon } from '../components/icons';
import type { Language } from '../api/client';

const DRAFT_KEY = 'nurselingua-onboarding-draft';

interface Draft {
  nurseLanguage?: string; patientLanguages?: string[];
  speechRate?: 'slow' | 'normal'; retention?: '24h' | '7days' | 'off';
}

export default function Onboarding() {
  const { token } = useAuth();
  const store = useStore();
  const nav = useNavigate();
  const { t } = useLocale();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [draft, setDraft] = useState<Draft>(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}'); } catch { return {}; }
  });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    store.languages.forEach((l) => undefined); // touch for lint
    setLanguages(store.languages);
  }, [store]);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* private */ }
  }, [draft]);

  const patientLangs = languages.filter((l) => l.code !== (draft.nurseLanguage ?? 'en'));
  const nurse = languages.find((l) => l.code === draft.nurseLanguage);
  const canFinish = draft.nurseLanguage && (draft.patientLanguages?.length ?? 0) > 0;

  const finish = async () => {
    setSaving(true);
    try {
      await store.saveOnboarding({
        nurseLanguage: draft.nurseLanguage,
        patientLanguages: draft.patientLanguages,
        speechRate: draft.speechRate ?? 'slow',
        retention: draft.retention ?? '7days',
      }, token);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      nav('/home');
    } catch {
      setError(true);
      setSaving(false);
    }
  };

  const steps = [
    // 1. nurse language
    <div key="s1">
      <h2 className="onb-q">{t('onboarding.nurseLanguage')}</h2>
      <div className="tile-grid" role="radiogroup" aria-label={t('onboarding.nurseLanguage')}>
        {languages.map((l) => (
          <button key={l.code} className="tile" role="radio" aria-checked={draft.nurseLanguage === l.code}
            onClick={() => setDraft((d) => ({ ...d, nurseLanguage: l.code, patientLanguages: undefined }))}>
            <strong>{l.nativeName}</strong><br />
            <span className="small muted">{l.name}</span>
          </button>
        ))}
      </div>
    </div>,

    // 2. patient languages (multi-select)
    <div key="s2">
      <h2 className="onb-q">{t('onboarding.patientLanguages')}</h2>
      <p className="small muted">Choose every language you meet on the ward. You can change this later.</p>
      <div className="tile-grid" role="group" aria-label={t('onboarding.patientLanguages')}>
        {patientLangs.map((l) => {
          const active = draft.patientLanguages?.includes(l.code) ?? false;
          return (
            <button key={l.code} className="tile" aria-pressed={active}
              onClick={() => setDraft((d) => {
                const cur = d.patientLanguages ?? [];
                return { ...d, patientLanguages: active ? cur.filter((c) => c !== l.code) : [...cur, l.code] };
              })}>
              <strong>{l.nativeName}</strong><br />
              <span className="small muted">{l.name} · {l.ttsLocale}</span>
            </button>
          );
        })}
      </div>
    </div>,

    // 3. speech rate and retention
    <div key="s3">
      <h2 className="onb-q">{t('onboarding.speechRate')}</h2>
      <div className="seg" role="radiogroup" aria-label={t('onboarding.speechRate')}>
        {(['slow', 'normal'] as const).map((r) => (
          <button key={r} role="radio" aria-checked={(draft.speechRate ?? 'slow') === r}
            onClick={() => setDraft((d) => ({ ...d, speechRate: r }))}>
            {r === 'slow' ? t('onboarding.speechRate.slow') : t('onboarding.speechRate.normal')}
          </button>
        ))}
      </div>
      <h2 className="onb-q" style={{ marginTop: '1.5rem' }}>{t('onboarding.retention')}</h2>
      <div className="seg" role="radiogroup" aria-label={t('onboarding.retention')}>
        {(['24h', '7days', 'off'] as const).map((r) => (
          <button key={r} role="radio" aria-checked={(draft.retention ?? '7days') === r}
            onClick={() => setDraft((d) => ({ ...d, retention: r }))}>
            {r === '24h' ? t('onboarding.retention.24h')
              : r === '7days' ? t('onboarding.retention.7days')
              : t('onboarding.retention.off')}
          </button>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: '0.6rem' }}>
        Privacy-first: conversations are removed automatically per your choice.
      </p>
    </div>,
  ];

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <p className="onb-progress">Step {step + 1} of {steps.length}
        {nurse ? ` · ${nurse.nativeName}` : ''}</p>
      <div className="bridge" aria-hidden="true">
        {steps.map((_, i) => (
          <div key={i} className={`node ${i < step ? 'done' : ''} ${i === step ? 'now' : ''}`}
            style={{ width: '33%' }} />
        ))}
      </div>
      {error && <p role="alert" style={{ color: 'var(--error)' }}>Couldn't save. Please retry.</p>}
      {steps[step]}
      <div className="row" style={{ justifyContent: 'space-between', marginTop: '1.25rem' }}>
        <button className="btn btn-quiet" disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}>
          <Icon name="arrowRight" size={16} className="flip-x" /> Back
        </button>
        {step < steps.length - 1 ? (
          <button className="btn btn-primary" disabled={!draft.nurseLanguage}
            onClick={() => setStep((s) => s + 1)}>
            Continue <Icon name="arrowRight" size={16} />
          </button>
        ) : (
          <button className="btn btn-primary" disabled={!canFinish || saving} onClick={finish}>
            {saving ? t('common.loading') : t('onboarding.finish')}
          </button>
        )}
      </div>
      <FooterDisclaimer />
    </div>
  );
}
