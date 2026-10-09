// Landing: what the app does, how it works, the four support stages with a
// real example, and one dominant action. Header carries the Ningua mark plus
// How it works / Languages / Sign in, exactly one primary CTA and one quiet
// secondary CTA in the hero.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../i18n/locale';
import { FooterDisclaimer } from '../components/AppShell';
import { Icon, type IconName } from '../components/icons';
import { STAGES, type Stage } from '../state/prefs';

const STEPS: ReadonlyArray<{ icon: IconName; title: string; body: string }> = [
  {
    icon: 'phrasebook',
    title: 'Phrasebook first',
    body: 'Tap a reviewed nursing question and it is spoken aloud in the patient’s language, with a native voice.',
  },
  {
    icon: 'swap',
    title: 'Two-sided conversation',
    body: 'You speak or type in your language. The patient hears theirs. Every turn shows both on screen.',
  },
  {
    icon: 'mic',
    title: 'Patient speaking',
    body: 'Record the patient, then read their answer as text plus a translation in your language.',
  },
  {
    icon: 'shield',
    title: 'Safety-scoped',
    body: 'A routine aid, with a professional interpreter one tap away for consent, diagnoses, and critical moments.',
  },
];

const PATIENT_LANGS = ['Español', 'हिन्दी', 'বাংলা', 'العربية', 'Français', '中文', 'தமிழ்', 'اردو'];

// A still, honest preview of the product: two turns, both languages, both roles.
// Real UI patterns instead of screenshots, stock photos, or generated imagery.
function HeroDemo() {
  return (
    <div className="hero-demo" aria-label="Example of a two-sided conversation">
      <div className="hd-head">
        <span className="hd-dot hd-dot-nurse" aria-hidden="true" />
        Nurse · English
        <span className="hd-swap" aria-hidden="true"><Icon name="swap" size={12} /></span>
        <span className="hd-dot hd-dot-patient" aria-hidden="true" />
        Patient · Español
      </div>

      <div className="turn nurse">
        <div className="turn-bubble">
          <div className="turn-speaker">Nurse</div>
          <p className="turn-source">Where does it hurt?</p>
          <p className="turn-target">¿Dónde le duele?</p>
        </div>
      </div>

      <div className="turn patient">
        <div className="turn-bubble">
          <div className="turn-speaker">Patient</div>
          <p className="turn-source">Me duele aquí desde esta mañana.</p>
          <p className="turn-target">It hurts here since this morning.</p>
        </div>
      </div>

      <div className="hd-note small">
        <Icon name="speaker" size={15} />
        <span>Both sides are spoken aloud, with a native voice.</span>
      </div>
    </div>
  );
}

/** Interactive four-stage example: the same reviewed phrase at each stage. */
function StageShowcase() {
  const { t } = useLocale();
  const [stage, setStage] = useState<Stage>('blend');
  const [revealed, setRevealed] = useState(false);
  const idx = STAGES.findIndex((s) => s.id === stage);

  const base = 'Where is your pain?';
  const target = '¿Dónde le duele?';

  const familiar = (
    <p className="ex-line">
      {stage === 'support' && <span className="ex-who">English</span>}
      <span className="ex-familiar">{base}</span>
    </p>
  );

  return (
    <>
      <div className="stage-track" role="group" aria-label={t('stage.title')}>
        {STAGES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`stage-step${i < idx ? ' done' : ''}${i === idx ? ' now' : ''}`}
            aria-pressed={stage === s.id}
            onClick={() => { setStage(s.id); setRevealed(false); }}
          >
            <span className="stage-dot" aria-hidden="true">{i + 1}</span>
            <span className="stage-label">{t(s.nameKey)}</span>
          </button>
        ))}
      </div>
      <p className="stage-desc">{t(STAGES[idx].descKey)}</p>

      <div className="stage-example">
        <p className="ex-line" style={{ paddingBottom: '.4rem' }}>
          {stage === 'support' && <span className="ex-who">Español</span>}
          <span className="ex-target">{target}</span>
        </p>

        {(stage === 'support' || stage === 'blend') && familiar}

        {(stage === 'focus' || stage === 'immersion') && (
          revealed ? (
            <>
              {familiar}
              <button
                type="button"
                className="reveal-btn"
                aria-expanded="true"
                onClick={() => setRevealed(false)}
              >
                <Icon name="close" size={13} /> Hide English
              </button>
            </>
          ) : (
            <button
              type="button"
              className="reveal-btn"
              aria-expanded="false"
              onClick={() => setRevealed(true)}
            >
              <Icon name="help" size={13} /> Show English
            </button>
          )
        )}

        <p className="small muted" style={{ marginTop: '.6rem' }}>
          The reviewed translation never disappears; only your familiar-language line
          folds away at the later stages, and it is always one tap back.
        </p>
      </div>
    </>
  );
}

export default function Landing() {
  const { t } = useLocale();

  return (
    <main id="main" className="page page-wide">
      <nav className="nav-public" aria-label="Public">
        <Link to="/" className="mark" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
          {t('app.name')}
        </Link>
        <span style={{ flex: 1 }} />
        <span className="pub-links">
          <a href="#how">How it works</a>
          <a href="#languages">Languages</a>
          <Link to="/sign-in">{t('landing.signin')}</Link>
        </span>
      </nav>

      <header className="landing-hero">
        <div>
          <p className="eyebrow">{t('app.name')} · Communication aid for routine care</p>
          <h1 className="display">{t('landing.title')}</h1>
          <p className="lede">{t('landing.body')}</p>
          <div className="row hero-actions">
            <Link to="/sign-up" className="btn btn-primary btn-block" style={{ maxWidth: 280 }}>
              {t('landing.cta')} <Icon name="arrowRight" size={17} />
            </Link>
            <a href="#how" className="hero-alt">
              See how it works
            </a>
          </div>
          <p className="small muted hero-scope">
            <Icon name="shield" size={15} />
            <span>{t('disclaimer.body')}</span>
          </p>
        </div>
        <div className="bridge-visual">
          <HeroDemo />
        </div>
      </header>

      <h2 className="section-h" id="how">How it works</h2>
      <div className="grid-4">
        {STEPS.map((s) => (
          <div className="card" key={s.title}>
            <span className="card-ico" aria-hidden="true"><Icon name={s.icon} size={22} /></span>
            <h3>{s.title}</h3>
            <p className="small muted">{s.body}</p>
          </div>
        ))}
      </div>

      <h2 className="section-h">How much support you want</h2>
      <p className="muted small" style={{ maxWidth: 640, marginTop: '-.4rem' }}>
        Ningua moves with you from familiar-language support toward confident use of the
        patient’s language. Pick a stage to see the same reviewed phrase at that level.
        A stage is a preference, not a score; you can switch back at any time.
      </p>
      <div className="card" style={{ marginTop: '1rem' }}>
        <StageShowcase />
      </div>

      <h2 className="section-h" id="languages">Patient languages in this build</h2>
      <div className="chips-row">
        {PATIENT_LANGS.map((l) => <span className="chip" key={l}>{l}</span>)}
      </div>

      <FooterDisclaimer />
    </main>
  );
}
