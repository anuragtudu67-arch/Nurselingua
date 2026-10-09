// Onboarding: four steps (your language, patient languages, pace and privacy,
// weekly goal and support stage). Resumable: choices persist in localStorage as
// they're made, so an abandoned run can be completed later. Server fields go to
// the frozen settings contract; goal and stage go to the local preference
// adapter, and the copy says so.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { FooterDisclaimer } from '../components/AppShell';
import { Icon } from '../components/icons';
import type { Language } from '../api/client';
import { STAGES, setDefaultStage, setGoal, type Stage } from '../state/prefs';

const DRAFT_KEY = 'nurselingua-onboarding-draft';
const GOAL_CHOICES = [0, 2, 3, 5, 7];

interface Draft {
  nurseLanguage?: string; patientLanguages?: string[];
  speechRate?: 'slow' | 'normal'; retention?: '24h' | '7days' | 'off';
  goal?: number; stage?: Stage;
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
  const canFinish = Boolean(draft.nurseLanguage) && (draft.patientLanguages?.length ?? 0) > 0;

  const finish = async () => {
    setSaving(true);
    try {
      await store.saveOnboarding({
        nurseLanguage: draft.nurseLanguage,
        patientLanguages: draft.patientLanguages,
        speechRate: draft.speechRate ?? 'slow',
        retention: draft.retention ?? '7days',
      }, token);
      // Local preferences: the stage becomes the account default (profiles
      // inherit it), and the goal applies to every profile chosen here.
      setDefaultStage(draft.stage ?? 'blend');
      if ((draft.goal ?? 0) > 0) {
        (draft.patientLanguages ?? []).forEach((code) => setGoal(code, draft.goal ?? 0));
      }
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      nav('/home');
    } catch {
      setError(true);
      setSaving(false);
    }
  };

  const steps = [
    // 1. your language
    <div key="s1">
      <h2 className="onb-q">{t('onboarding.nurseLanguage')}</h2>
      <p className="small muted">The language you are comfortable writing and reading in.</p>
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

    // 3. pace and privacy
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

    // 4. goal and support stage
    <div key="s4">
      <h2 className="onb-q">Your weekly goal</h2>
      <p className="small muted">How many conversations you aim for each week. Optional, and adjustable later.</p>
      <div className="seg" role="radiogroup" aria-label="Weekly goal">
        {GOAL_CHOICES.map((g) => (
          <button key={g} role="radio" aria-checked={(draft.goal ?? 0) === g}
            onClick={() => setDraft((d) => ({ ...d, goal: g }))}>
            {g === 0 ? 'No goal' : `${g} per week`}
          </button>
        ))}
      </div>

      <h2 className="onb-q" style={{ marginTop: '1.5rem' }}>{t('stage.title')}</h2>
      <div className="stage-track" role="group" aria-label={t('stage.title')}>
        {STAGES.map((s, i) => {
          const cur = draft.stage ?? 'blend';
          const idx = STAGES.findIndex((x) => x.id === cur);
          return (
            <button
              key={s.id}
              type="button"
              className={`stage-step${i < idx ? ' done' : ''}${i === idx ? ' now' : ''}`}
              aria-pressed={cur === s.id}
              onClick={() => setDraft((d) => ({ ...d, stage: s.id }))}
            >
              <span className="stage-dot" aria-hidden="true">{i + 1}</span>
              <span className="stage-label">{t(s.nameKey)}</span>
            </button>
          );
        })}
      </div>
      <p className="stage-desc">
        {t(STAGES[Math.max(0, STAGES.findIndex((s) => s.id === (draft.stage ?? 'blend')))].descKey)}
      </p>
      <p className="tiny muted">{t('stage.help')}</p>
      <p className="small muted">
        Goal and stage are saved on this device; everything else syncs to your account.
      </p>
    </div>,
  ];

  const pct = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <p className="onb-progress" id="onb-progress-label">
        Step {step + 1} of {steps.length}
        {nurse ? ` · ${nurse.nativeName}` : ''}
      </p>
      <div
        className="bridge"
        role="progressbar"
        aria-labelledby="onb-progress-label"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={step + 1}
        aria-valuetext={`Step ${step + 1} of ${steps.length}`}
      >
        {steps.map((_, i) => (
          <div key={i} className={`node ${i < step ? 'done' : ''} ${i === step ? 'now' : ''}`}
            style={{ width: `${100 / steps.length}%` }} />
        ))}
      </div>
      <span className="visually-hidden">{pct}% complete</span>
      {error && <p role="alert" style={{ color: 'var(--error)' }}>Couldn't save. Please retry.</p>}
      {steps[step]}
      <div className="row" style={{ justifyContent: 'space-between', marginTop: '1.25rem' }}>
        <button className="btn btn-quiet" disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}>
          <Icon name="arrowRight" size={16} className="flip-x" /> Back
        </button>
        {step < steps.length - 1 ? (
          <button
            className="btn btn-primary"
            disabled={step === 0 ? !draft.nurseLanguage : step === 1 && !canFinish}
            onClick={() => setStep((s) => s + 1)}
          >
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
