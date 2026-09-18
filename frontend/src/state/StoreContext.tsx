// Demo-first data layer: the store exposes async accessors with the SAME shapes
// as the real /api/v1 client. When the backend is reachable it proxies to it;
// otherwise it falls back to in-browser localStorage-backed simulation
// (simulated STT/TTS workflows included). Swapping to backend-only is deleting
// the mock branch, and the screens never change.
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as api from '../api/client';
import { useAuth } from '../auth/AuthContext';
export type AddTurnBody = api.AddTurnBody;
import type {
  Category, Conversation, ConversationDetail, Favorite, Language, Phrase, Recent,
  Settings, Turn, UsersMe, WorkflowStatus,
} from '../api/client';
import { CATEGORIES, LANGUAGES, PHRASES } from '../api/mockData';

const OFFLINE_KEY = 'nurselingua-offline-state';

interface OfflineState {
  settings: Settings & { onboardingComplete: boolean };
  conversations: Conversation[];
  turns: Record<string, Turn[]>;
  favorites: Favorite[];
  recents: Recent[];
}

const emptyState = (): OfflineState => ({
  settings: {
    nurseLanguage: 'en', patientLanguages: ['es'], speechRate: 'slow',
    retention: '7days', onboardingComplete: false,
  },
  conversations: [], turns: {}, favorites: [], recents: [],
});

function loadOffline(): OfflineState {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    if (raw) return { ...emptyState(), ...JSON.parse(raw) };
  } catch { /* fresh */ }
  return emptyState();
}

function saveOffline(s: OfflineState) {
  try { localStorage.setItem(OFFLINE_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

let offline: OfflineState = loadOffline();
const commit = () => saveOffline(offline);

export interface StoreValue {
  offline: boolean;
  languages: Language[];
  categories: Category[];
  // data accessors (same shapes as the API client)
  usersMe: (token: string | null) => Promise<UsersMe>;
  saveOnboarding: (s: Partial<Settings>, token: string | null) => Promise<UsersMe>;
  saveSettings: (s: Partial<Settings>, token: string | null) => Promise<UsersMe>;
  listPhrases: (q: { category?: string; search?: string; lang: string }, token: string | null) => Promise<Phrase[]>;
  createConversation: (patientLanguage: string, token: string | null) => Promise<Conversation>;
  listConversations: (token: string | null) => Promise<Conversation[]>;
  getConversation: (id: string, token: string | null) => Promise<ConversationDetail>;
  deleteConversation: (id: string, token: string | null) => Promise<void>;
  addTurn: (id: string, body: api.AddTurnBody, token: string | null) => Promise<Turn>;
  translate: (text: string, to: string, token: string | null) => Promise<api.TranslationResponse>;
  submitStt: (ref: string, hint: string, token: string | null) => Promise<{ id: string }>;
  sttStatus: (id: string, token: string | null) => Promise<WorkflowStatus>;
  submitTts: (text: string, language: string, rate: string, token: string | null) => Promise<{ id: string }>;
  ttsStatus: (id: string, token: string | null) => Promise<WorkflowStatus>;
  listFavorites: (token: string | null) => Promise<Favorite[]>;
  addFavorite: (phraseId: string, lang: string, token: string | null) => Promise<void>;
  removeFavorite: (phraseId: string, lang: string, token: string | null) => Promise<void>;
  listRecents: (token: string | null) => Promise<Recent[]>;
}

const Ctx = createContext<StoreValue>(null as unknown as StoreValue);
export const useStore = () => useContext(Ctx);

/** True when a health probe succeeds, which decides live backend vs offline demo. */
async function probe(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch('/api/health', { signal: ctrl.signal });
    return res.ok;
  } catch { return false; }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [offlineMode, setOfflineMode] = useState<boolean | null>(null);
  // Catalog for live mode (offline mode serves mockData instead). Loaded once
  // there is a session, so the public landing page stays request-free.
  const { token } = useAuth();
  const [catalog, setCatalog] = useState<{ languages: Language[]; categories: Category[] }>(
    { languages: [], categories: [] },
  );

  useEffect(() => { probe().then((ok) => setOfflineMode(!ok)); }, []);

  useEffect(() => {
    if (offlineMode !== false || !token) return;
    let live = true;
    Promise.all([
      api.listLanguages(token).catch(() => [] as Language[]),
      api.listCategories(token).catch(() => [] as Category[]),
    ]).then(([languages, categories]) => { if (live) setCatalog({ languages, categories }); });
    return () => { live = false; };
  }, [offlineMode, token]);

  if (offlineMode === null) {
    return <div style={{ padding: '2rem' }} className="muted">Connecting…</div>;
  }

  // ---------------- offline simulation ----------------

  const simMe = (): UsersMe => ({
    userId: 'demo-user', email: 'demo@nurselingua.health', name: 'Demo Nurse',
    settings: offline.settings, onboardingComplete: offline.settings.onboardingComplete,
  });

  const simPhrase = (id: string): Phrase => {
    const p = PHRASES.find((x) => x.id === id);
    if (!p) throw new api.ApiError(404, 'Unknown phrase');
    return p;
  };

  const simAddTurn = (convId: string, body: api.AddTurnBody): Turn => {
    const conv = offline.conversations.find((c) => c.id === convId);
    if (!conv) throw new api.ApiError(404, 'Conversation not found');
    const nurse = body.speaker === 'NURSE';
    const sourceLang = nurse ? conv.nurseLanguage : conv.patientLanguage;
    const targetLang = nurse ? conv.patientLanguage : conv.nurseLanguage;

    let sourceText = body.text ?? '';
    let targetText = '';
    let targetRomanization: string | null = null;
    let libraryPhraseId: string | null = null;

    if (body.phraseId) {
      const p = simPhrase(body.phraseId);
      sourceText = p.baseText;
      const t = p.translations.find((x) => x.languageCode === targetLang)
        ?? p.translations[0];
      if (!t) throw new api.ApiError(400, `No ${targetLang} translation for phrase ${body.phraseId}`);
      targetText = t.text;
      targetRomanization = t.romanization ?? null;
      libraryPhraseId = p.id;
    } else {
      // Library-first fuzzy match on the base text; "MT fallback" otherwise.
      const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{Nd}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
      const match = PHRASES.find((p) => norm(p.baseText) === norm(sourceText))
        ?? PHRASES.find((p) => {
          const a = new Set(norm(p.baseText).split(' '));
          const b = new Set(norm(sourceText).split(' '));
          const overlap = [...a].filter((x) => b.has(x)).length;
          return overlap / Math.max(a.size, b.size, 1) >= 0.8;
        });
      if (match) {
        const t = match.translations.find((x) => x.languageCode === targetLang)
          ?? match.translations[0];
        if (t) { targetText = t.text; targetRomanization = t.romanization ?? null; libraryPhraseId = match.id; }
      }
      if (!targetText) {
        // Honest offline MT: unavailable. Calm error per spec §2.
        throw new api.ApiError(503, 'Translation is unavailable offline for this phrase. Use a phrasebook phrase.');
      }
    }

    const turn: Turn = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      speaker: body.speaker, sourceText, sourceLang, targetText, targetLang,
      targetRomanization, libraryPhraseId,
      sttConfidence: body.sttConfidence ?? null,
      audioRef: null, status: 'READY',
      createdAt: new Date().toISOString(),
    };
    offline.turns[convId] = [...(offline.turns[convId] ?? []), turn];
    conv.turnCount = offline.turns[convId].length;
    conv.lastActivityAt = turn.createdAt;
    commit();
    return turn;
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const simValue: StoreValue = {
    offline: true,
    languages: LANGUAGES,
    categories: CATEGORIES,
    usersMe: async () => simMe(),
    saveOnboarding: async (s) => {
      offline.settings = { ...offline.settings, ...s, onboardingComplete: true } as OfflineState['settings'];
      commit();
      return simMe();
    },
    saveSettings: async (s) => {
      offline.settings = { ...offline.settings, ...s } as OfflineState['settings'];
      commit();
      return simMe();
    },
    listPhrases: async ({ category, search, lang }) => {
      let list = PHRASES;
      if (category) list = list.filter((p) => p.categorySlug === category);
      if (search) list = list.filter((p) => p.baseText.toLowerCase().includes(search.toLowerCase()));
      return list.map((p) => ({
        ...p,
        translations: p.translations.filter((t) => t.languageCode === lang),
        favorite: offline.favorites.some((f) => f.phraseId === p.id && f.languageCode === lang),
      }));
    },
    createConversation: async (patientLanguage) => {
      const c: Conversation = {
        id: `c-${Date.now()}`, nurseLanguage: offline.settings.nurseLanguage,
        patientLanguage, title: null, startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        expiresAt: offline.settings.retention === 'off' ? null
          : new Date(Date.now() + (offline.settings.retention === '24h' ? 24 : 168) * 3600_000).toISOString(),
        turnCount: 0,
      };
      offline.conversations = [c, ...offline.conversations];
      commit();
      return c;
    },
    listConversations: async () =>
      offline.conversations.map((c) => ({ ...c })),
    getConversation: async (id) => {
      const c = offline.conversations.find((x) => x.id === id);
      if (!c) throw new api.ApiError(404, 'Conversation not found');
      return { conversation: { ...c }, turns: offline.turns[id] ?? [] };
    },
    deleteConversation: async (id) => {
      offline.conversations = offline.conversations.filter((c) => c.id !== id);
      delete offline.turns[id];
      commit();
    },
    addTurn: async (id, body) => simAddTurn(id, body),
    translate: async () => {
      throw new api.ApiError(503, 'Free-text translation is unavailable offline. Use the phrasebook.');
    },
    submitStt: async (_ref, hint) => {
      const id = `stt-demo-${Date.now()}`;
      void _ref; void hint;
      (window as unknown as { __sttJobs?: Record<string, string> }).__sttJobs = {
        ...((window as unknown as { __sttJobs?: Record<string, string> }).__sttJobs ?? {}),
        [id]: 'processing',
      };
      return { id };
    },
    sttStatus: async (id) => {
      const jobs = (window as unknown as { __sttJobs?: Record<string, string> }).__sttJobs ?? {};
      if (jobs[id] === 'processing') {
        await sleep(1200);
        jobs[id] = 'done';
        return {
          id, kind: 'stt', status: 'completed',
          result: { transcript: 'Me duele aquí desde esta mañana.', confidence: 0.92 },
        };
      }
      return { id, kind: 'stt', status: 'completed',
        result: { transcript: 'Me duele aquí desde esta mañana.', confidence: 0.92 } };
    },
    submitTts: async (text, language) => {
      void text; void language;
      return { id: `tts-demo-${Date.now()}` };
    },
    ttsStatus: async (id) => ({ id, kind: 'tts', status: 'completed', result: { audioRef: 'demo' } }),
    listFavorites: async () => offline.favorites,
    addFavorite: async (phraseId, lang) => {
      if (!offline.favorites.some((f) => f.phraseId === phraseId && f.languageCode === lang)) {
        offline.favorites = [{ phraseId, languageCode: lang, createdAt: new Date().toISOString() },
          ...offline.favorites];
        commit();
      }
    },
    removeFavorite: async (phraseId, lang) => {
      offline.favorites = offline.favorites.filter(
        (f) => !(f.phraseId === phraseId && f.languageCode === lang));
      commit();
    },
    listRecents: async () => offline.recents.slice(0, 12),
  };

  // Wire recents into the sim addTurn path (one-tap reuse on Home).
  const origAddTurn = simValue.addTurn;
  simValue.addTurn = async (id, body, token) => {
    const turn = await origAddTurn(id, body, token);
    const conv = offline.conversations.find((c) => c.id === id);
    const pid = turn.libraryPhraseId;
    if (conv && pid) {
      offline.recents = [
        { phraseId: pid, languageCode: turn.targetLang, usedAt: new Date().toISOString() },
        ...offline.recents.filter((r) => !(r.phraseId === pid && r.languageCode === turn.targetLang)),
      ].slice(0, 12);
      commit();
    }
    return turn;
  };

  // ---------------- live backend ----------------

  const liveValue: StoreValue = {
    offline: false,
    languages: catalog.languages,
    categories: catalog.categories,
    usersMe: (token) => api.usersMe(token),
    saveOnboarding: (s, token) => api.saveOnboarding(s, token),
    saveSettings: (s, token) => api.saveSettings(s, token),
    listPhrases: (q, token) => api.listPhrases(q, token),
    createConversation: (lang, token) => api.createConversation(lang, token),
    listConversations: (token) => api.listConversations(token),
    getConversation: (id, token) => api.getConversation(id, token),
    deleteConversation: async (id, token) => { await api.deleteConversation(id, token); },
    addTurn: (id, body, token) => api.addTurn(id, body, token),
    translate: (text, to, token) => api.translate(text, to, token),
    submitStt: (ref, hint, token) => api.submitStt(ref, hint, token),
    sttStatus: (id, token) => api.sttStatus(id, token),
    submitTts: (text, language, rate, token) => api.submitTts(text, language, rate, token),
    ttsStatus: (id, token) => api.ttsStatus(id, token),
    listFavorites: (token) => api.listFavorites(token),
    addFavorite: async (p, l, token) => { await api.addFavorite(p, l, token); },
    removeFavorite: async (p, l, token) => { await api.removeFavorite(p, l, token); },
    listRecents: (token) => api.listRecents(token),
  };

  // Catalog for live mode is fetched once by App via loadCatalog.
  return <Ctx.Provider value={offlineMode ? simValue : liveValue}>{children}</Ctx.Provider>;
}

// Hook the landing/settings pages use to know which mode they're in.
export function useOfflineMode(): boolean | null {
  const s = useStore();
  return s?.offline ?? null;
}
