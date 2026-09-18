// Interpreter: one tap away from every screen. The fastest route to a
// professional interpreter for critical conversations.
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../i18n/locale';
import { Icon } from '../components/icons';

// Set this to the interpreter service your organisation actually contracts, and
// keep it consistent with the number printed on the ward. Replace the
// placeholders before this build is used with real patients.
const SERVICE = {
  name: '[YOUR INTERPRETER SERVICE]',
  phone: '[SERVICE PHONE NUMBER]',
  url: '',
};

const CRITICAL_MOMENTS = [
  'Informed consent and refusal of treatment',
  'Serious news or a life-changing diagnosis',
  'End-of-life care and resuscitation decisions',
  'Safeguarding, mental health, and capacity concerns',
];

export default function Interpreter() {
  const nav = useNavigate();
  const { t } = useLocale();
  const telHref = `tel:${SERVICE.phone.replace(/[^0-9+]/g, '')}`;

  return (
    <main id="main" className="page" style={{ maxWidth: 620 }}>
      <button className="btn btn-quiet" onClick={() => nav(-1)} style={{ marginBottom: '1rem' }}>
        <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
          <Icon name="arrowRight" size={16} />
        </span>
        Back
      </button>

      <h1 className="title" style={{ marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <Icon name="phone" size={24} />
        {t('disclaimer.interpreter')}
      </h1>
      <p className="muted" style={{ marginBottom: '1.5rem', maxWidth: 520 }}>
        NurseLingua covers routine communication. Whenever the conversation carries
        clinical or legal weight, put a professional interpreter on the line instead.
      </p>

      <div className="card" style={{
        background: 'var(--error-bg)', border: '1px solid rgba(248,81,73,.25)',
        padding: '1.25rem', marginBottom: '1.5rem'
      }}>
        <h3 style={{ color: 'var(--error)', margin: '0 0 .45rem', display: 'flex', alignItems: 'center', gap: '.45rem' }}>
          <Icon name="alert" size={18} />
          Use an interpreter for these
        </h3>
        <ul className="small critical-list">
          {CRITICAL_MOMENTS.map((m) => <li key={m}>{m}</li>)}
        </ul>
        <p className="small" style={{ margin: '.6rem 0 0' }}>
          In an emergency, call your local emergency number first.
        </p>
      </div>

      <h2 className="section-h" style={{ marginTop: 0 }}>Your interpreter service</h2>
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 .3rem' }}>{SERVICE.name}</h3>
        <p className="small muted" style={{ margin: '0 0 .85rem' }}>
          Your organisation sets this contact. Confirm it matches the number on the ward
          before you rely on it.
        </p>
        <div className="row" style={{ gap: '.75rem', flexWrap: 'wrap' }}>
          <a href={telHref} className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Icon name="phone" size={16} /> {SERVICE.phone}
          </a>
          {SERVICE.url && (
            <a href={SERVICE.url} target="_blank" rel="noopener noreferrer"
              className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              <Icon name="globe" size={16} /> Open service
            </a>
          )}
        </div>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button className="btn btn-secondary btn-block" onClick={() => nav(-1)}>
          Return to the conversation
        </button>
      </div>
    </main>
  );
}
