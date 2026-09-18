// Routes + entry logic: auth state decides landing vs app; onboarding
// completeness decides onboarding vs home.
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { useStore } from './state/StoreContext';
import AppShell from './components/AppShell';
import { ErrorBox, FirstRunDisclaimer, Skeleton } from './components/ui';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Conversation from './pages/Conversation';
import Phrasebook from './pages/Phrasebook';
import History from './pages/History';
import Settings from './pages/Settings';
import Interpreter from './pages/Interpreter';
import NewConversation from './pages/NewConversation';
import { PrivacyPage, TermsPage } from './pages/Legal';
import { useEffect, useState } from 'react';
import type { UsersMe } from './api/client';

function Guard({ children, focused }: { children: JSX.Element; focused?: boolean }) {
  const { token } = useAuth();
  const store = useStore();
  const loc = useLocation();
  const [me, setMe] = useState<UsersMe | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setError(false);
    store.usersMe(token)
      .then((m) => { if (live) setMe(m); })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [token, attempt, store]);

  if (!token) return <Navigate to="/sign-in" state={{ from: loc.pathname }} replace />;
  if (error && !me) {
    return (
      <AppShell>
        <div className="page">
          <ErrorBox
            title="We couldn't reach NurseLingua"
            body="You're signed in, but the connection failed just now. Nothing was lost. Check your connection and retry."
            onRetry={() => setAttempt((a) => a + 1)}
          />
        </div>
      </AppShell>
    );
  }
  if (!me) {
    return (
      <AppShell>
        <div className="page"><p className="muted">Loading…</p><Skeleton lines={5} /></div>
      </AppShell>
    );
  }
  if (!me.onboardingComplete && loc.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return (
    <>
      <FirstRunDisclaimer />
      <AppShell focused={focused}>{children}</AppShell>
    </>
  );
}

export default function App() {
  return (
    <>
      {/* Keyboard users can jump straight past the nav on every route. */}
      <a className="skip-link" href="#main">Skip to content</a>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/sign-in" element={<Auth mode="in" />} />
        <Route path="/sign-up" element={<Auth mode="up" />} />
        <Route path="/interpreter" element={<Interpreter />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/onboarding" element={<Guard focused><Onboarding /></Guard>} />
        <Route path="/home" element={<Guard><Home /></Guard>} />
        <Route path="/conversation" element={<Guard><NewConversation /></Guard>} />
        <Route path="/conversation/:id" element={<Guard focused><Conversation /></Guard>} />
        <Route path="/phrasebook" element={<Guard><Phrasebook /></Guard>} />
        <Route path="/history" element={<Guard><History /></Guard>} />
        <Route path="/history/:id" element={<Guard focused><Conversation /></Guard>} />
        <Route path="/settings" element={<Guard><Settings /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
