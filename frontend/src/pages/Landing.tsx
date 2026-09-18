// Landing: what the app does, how it works, one dominant action.
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
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

export default function Landing() {
  const { token } = useAuth();
  const { t } = useLocale();

  // Signed-in visitors belong inside the app. Declaring <Navigate> keeps the
  // redirect out of render (react-router warns on navigate() during render).
  if (token) return <Navigate to="/home" replace />;

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
          <div className="orb">
            <span className="orb-lang">Nurse · English</span>
            “Where does it hurt?”
            <small>¿Dónde le duele? · दर्द कहाँ है? · ব্যথা কোথায়?</small>
          </div>
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
