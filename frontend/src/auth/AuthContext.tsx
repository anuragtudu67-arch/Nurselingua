// Auth layer. Production: Clerk session token attached to every protected call
// (clerk.session.getToken() in place of the demo token; the flow is identical).
// Local demo: a mock session (any email) producing a dev bearer token.
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthState {
  token: string | null;
  email: string | null;
  name: string | null;
  signIn: (email: string, name?: string) => void;
  signOut: () => void;
}
const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

const KEY = 'nurselingua-auth';
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setToken(s.token); setEmail(s.email); setName(s.name ?? null);
      }
    } catch { /* fresh session */ }
  }, []);

  const signIn = (em: string, nm?: string) => {
    // Production swap: const t = await clerk.session.getToken();
    const t = `dev.${encodeURIComponent(em)}`;
    const n = nm || em.split('@')[0];
    setToken(t); setEmail(em); setName(n);
    localStorage.setItem(KEY, JSON.stringify({ token: t, email: em, name: n }));
  };
  const signOut = () => {
    setToken(null); setEmail(null); setName(null);
    localStorage.removeItem(KEY);
  };
  return <Ctx.Provider value={{ token, email, name, signIn, signOut }}>{children}</Ctx.Provider>;
}
