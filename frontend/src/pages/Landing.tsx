// Landing: what the app does, how it works, one dominant action.
import { Link } from 'react-router-dom';
import { useLocale } from '../i18n/locale';
import { FooterDisclaimer } from '../components/AppShell';
import { Icon, type IconName } from '../components/icons';

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

export default function Landing() {
  const { t } = useLocale();

  return (
    <main id="main" className="page page-wide">
      <nav className="nav-public" aria-label="Public">
        <span className="mark">{t('app.name')}</span>
        <span style={{ flex: 1 }} />
        <Link to="/sign-in">{t('landing.signin')}</Link>
        <Link to="/sign-up" className="btn btn-primary">{t('landing.cta')}</Link>
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
            <Link to="/interpreter" className="hero-alt">
              <Icon name="phone" size={16} /> {t('disclaimer.interpreter')}
            </Link>
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

      <h2 className="section-h">How it works</h2>
      <div className="grid-4">
        {STEPS.map((s) => (
          <div className="card" key={s.title}>
            <span className="card-ico" aria-hidden="true"><Icon name={s.icon} size={22} /></span>
            <h3>{s.title}</h3>
            <p className="small muted">{s.body}</p>
          </div>
        ))}
      </div>

      <h2 className="section-h">Patient languages in this build</h2>
      <div className="chips-row">
        {PATIENT_LANGS.map((l) => <span className="chip" key={l}>{l}</span>)}
      </div>

      <FooterDisclaimer />
    </main>
  );
}
