// Auth: sparse in the demo (any email), and the token flow mirrors Clerk exactly.
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLocale } from '../i18n/locale';
import { Icon } from '../components/icons';

export default function Auth({ mode }: { mode: 'in' | 'up' }) {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    signIn(email);
    nav((loc.state as { from?: string } | null)?.from ?? '/home');
  };

  return (
    <main id="main" className="page" style={{ maxWidth: 420 }}>
      <nav className="nav-public" aria-label="Public">
        <Link to="/" className="mark">{t('app.name')}</Link>
      </nav>
      <div className="card">
        <h1 className="title" style={{ fontSize: '1.5rem' }}>
          {mode === 'in' ? t('landing.signin') : 'Create your account'}
        </h1>
        <form onSubmit={submit} noValidate>
          <label className="label" htmlFor="email">Work email</label>
          <input id="email" type="email" className="input" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="nurse@hospital.org"
            autoComplete="email" autoFocus />
          {error && <p className="small" role="alert" style={{ color: 'var(--error)' }}>{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>
            Continue
          </button>
        </form>
        <p className="small muted" style={{ marginTop: '0.9rem', marginBottom: 0 }}>
          {mode === 'in'
            ? <>New here? <Link to="/sign-up">Create an account</Link></>
            : <>Already have an account? <Link to="/sign-in">{t('landing.signin')}</Link></>}
        </p>
      </div>
      <p className="small muted hero-scope" style={{ marginTop: '1rem' }}>
        <Icon name="shield" size={15} />
        <span>{t('disclaimer.body')}</span>
      </p>
    </main>
  );
}
