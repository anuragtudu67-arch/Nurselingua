import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles.css';
import { AuthProvider } from './auth/AuthContext';
import { StoreProvider } from './state/StoreContext';
import { LocaleCtx, translate, type LocaleCode } from './i18n/locale';
import { ToastHost } from './components/ui';
import { initTheme } from './theme';

// Resolve Light/Dark/System once on startup (index.html already applied it
// pre-paint; this keeps System in sync with OS changes at runtime).
initTheme();

// The UI locale is English by default and localizes to the nurse's language
// (spec §7.1). Chosen during onboarding; persisted; 'en' fallback always safe.
function nurseLocale(): LocaleCode {
  try {
    const v = localStorage.getItem('nurselingua-ui-locale');
    return v === 'es' ? 'es' : 'en';
  } catch { return 'en'; }
}
const locale = nurseLocale();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <StoreProvider>
          <LocaleCtx.Provider value={{
            locale,
            setLocale: (l) => { try { localStorage.setItem('nurselingua-ui-locale', l); } catch { /* ignore */ } },
            t: (k) => translate(locale, k),
          }}>
            <ToastHost>
              <App />
            </ToastHost>
          </LocaleCtx.Provider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
