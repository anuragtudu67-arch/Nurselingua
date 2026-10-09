// Authenticated shell: desktop left rail / mobile bottom nav.
// A persistent "Request an interpreter" shortcut is one tap away everywhere.
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useLocale } from '../i18n/locale';
import { useAuth } from '../auth/AuthContext';
import Avatar from './Avatar';
import { Icon, type IconName } from './icons';

const NAV: ReadonlyArray<{ to: string; labelKey: 'nav.home' | 'nav.phrasebook' | 'nav.history' | 'nav.settings'; icon: IconName }> = [
  { to: '/home', labelKey: 'nav.home', icon: 'home' },
  { to: '/phrasebook', labelKey: 'nav.phrasebook', icon: 'phrasebook' },
  { to: '/history', labelKey: 'nav.history', icon: 'history' },
  { to: '/settings', labelKey: 'nav.settings', icon: 'settings' },
];

export default function AppShell({ children, focused }: { children: React.ReactNode; focused?: boolean }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { t } = useLocale();
  const { name, email } = useAuth();

  const active = NAV.find((n) => loc.pathname.startsWith(n.to))?.labelKey
    ?? (loc.pathname.startsWith('/conversation') ? 'nav.conversation' : 'nav.home');

  if (focused) {
    return (
      <main id="main" style={{ minHeight: '100vh' }}>
        {children}
      </main>
    );
  }

  return (
    <div className="shell">
      <aside className="rail" aria-label="Primary">
        <Link to="/home" className="mark" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
          {t('app.name')}
        </Link>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav${isActive ? ' active' : ''}`}>
            <Icon name={n.icon} size={18} /> {t(n.labelKey)}
          </NavLink>
        ))}
        <div className="spacer" />
        <Link to="/settings" className="identity" style={{ textDecoration: 'none', marginBottom: '.6rem' }}
          aria-label={`Account: ${name || email || 'Nurse'}`}>
          <Avatar name={name} email={email} size={34} />
          <div style={{ minWidth: 0 }}>
            <div className="identity-name">{name || 'Nurse'}</div>
            {email && <div className="identity-email">{email}</div>}
          </div>
        </Link>
        <button className="btn btn-secondary btn-block" onClick={() => nav('/interpreter')}>
          <Icon name="phone" size={17} /> {t('disclaimer.interpreter')}
        </button>
      </aside>

      <div className="content">
        <div className="topbar">
          <strong style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem' }}>{t(active)}</strong>
          <span style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={() => nav('/interpreter')}
            aria-label={t('disclaimer.interpreter')}>
            <Icon name="phone" size={17} /> {t('disclaimer.interpreter')}
          </button>
        </div>
        <main id="main">{children}</main>
        <FooterDisclaimer />
        <nav className="bottombar" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="ico" aria-hidden="true"><Icon name={n.icon} size={21} /></span>{t(n.labelKey)}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

/** Persistent footer: scope disclaimer + legal links (spec §7.8). */
export function FooterDisclaimer() {
  const { t } = useLocale();
  return (
    <footer className="foot" role="note" aria-label="Scope disclaimer">
      <p className="small muted foot-scope">
        <Icon name="shield" size={15} />
        <span>{t('disclaimer.body')}</span>
      </p>
      <nav className="foot-links" aria-label="Legal and support">
        <Link to="/terms">Terms of Use</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/interpreter">{t('disclaimer.interpreter')}</Link>
      </nav>
    </footer>
  );
}
