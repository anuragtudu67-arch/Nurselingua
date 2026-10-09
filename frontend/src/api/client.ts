// Ningua API client, mirroring the Spring Boot /api/v1 contract (docs/API.md).
// Offline demo mode: if the backend is unreachable, in-browser mockData serves the
// exact same shapes (documented swap; see README "Demo-first data layer").

const BASE = ''; // same-origin; vite proxies /api to the backend in dev

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, opts: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.headers) Object.assign(headers, opts.headers as Record<string, string>);
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${BASE}/api/v1${path}`, { ...opts, headers, signal: ctrl.signal });
    if (!res.ok) throw new ApiError(res.status, `Request failed (${res.status})`);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export const get = <T,>(p: string, token?: string | null) => api<T>(p, {}, token);
export const post = <T,>(p: string, body: unknown, token?: string | null) =>
  api<T>(p, { method: 'POST', body: JSON.stringify(body) }, token);
export const put = <T,>(p: string, body: unknown, token?: string | null) =>
  api<T>(p, { method: 'PUT', body: JSON.stringify(body) }, token);
export const del = <T,>(p: string, token?: string | null) =>
  api<T>(p, { method: 'DELETE' }, token);

// ---- Shared types (mirror backend DTOs) ----

export interface Language {
  code: string; name: string; nativeName: string; ttsLocale: string;
  sttSupported: boolean; script: string; hasRomanization: boolean;
  uiLocaleSupport: boolean; rtl: boolean;
}

export interface Category { slug: string; name: string; description: string; position: number }

export interface PhraseTranslation {
  languageCode: string; text: string; romanization?: string | null;
  audioRef?: string | null; professionallyReviewed: boolean;
}

export interface Phrase {
  id: string; categorySlug: string; baseText: string; isQuestion: boolean;
  cardType: 'STANDARD' | 'PAIN_SCALE'; tags: string[]; priority: number;
  translations: PhraseTranslation[]; favorite: boolean | null;
}

export interface Settings {
  nurseLanguage: string; patientLanguages: string[]; speechRate: 'slow' | 'normal';
  retention: '24h' | '7days' | 'off';
}

export interface UsersMe {
  userId: string; email: string; name: string | null;
  settings: Settings; onboardingComplete: boolean;
}

export interface Conversation {
  id: string; nurseLanguage: string; patientLanguage: string; title: string | null;
  startedAt: string | null; lastActivityAt: string | null; expiresAt: string | null;
  turnCount: number;
}

export interface Turn {
  id: string; speaker: 'NURSE' | 'PATIENT'; sourceText: string; sourceLang: string;
  targetText: string; targetLang: string; targetRomanization?: string | null;
  libraryPhraseId?: string | null; sttConfidence?: number | null;
  audioRef?: string | null; status: string; createdAt: string | null;
}

export interface ConversationDetail { conversation: Conversation; turns: Turn[] }

export interface TranslationResponse {
  sourceText: string; sourceLang: string; text: string; targetLang: string;
  romanization?: string | null; matchedLibrary: boolean; phraseId?: string | null;
  professionallyReviewed: boolean;
}

export interface Presign { url: string | null; ref: string; expiresIn: number; mode: 'r2' | 'inline' }

export interface WorkflowSubmission { id: string; status: string }

export interface WorkflowStatus {
  id: string; kind: 'stt' | 'tts'; status: 'processing' | 'completed' | 'failed';
  result?: { transcript?: string; confidence?: number; audioRef?: string; ttsLocale?: string; rate?: string } | null;
  error?: string | null;
}

export interface Favorite { phraseId: string; languageCode: string; createdAt: string | null }
export interface Recent { phraseId: string; languageCode: string; usedAt: string | null }

// GET /usage (docs/API.md): totals and pipeline health computed by the backend.
export interface PipelineStat {
  total: number; failures: number; failureRate: number; avgLatencyMs: number | null;
}
export interface Usage {
  sessions: number; turns: number;
  languagePairs: { pair: string; count: number }[];
  topPhrases: { phraseId: string; baseText: string; count: number }[];
  stt: PipelineStat; mt: PipelineStat; tts: PipelineStat;
}

// ---- Endpoints ----

export const usersMe = (token?: string | null) => get<UsersMe>('/users/me', token);
export const saveOnboarding = (body: Partial<Settings>, token?: string | null) =>
  post<UsersMe>('/onboarding', body, token);
export const saveSettings = (body: Partial<Settings>, token?: string | null) =>
  put<UsersMe>('/settings', body, token);

export const listLanguages = (token?: string | null) => get<Language[]>('/languages', token);
export const listCategories = (token?: string | null) => get<Category[]>('/categories', token);
export const listPhrases = (q: { category?: string; search?: string; lang: string }, token?: string | null) => {
  const params = new URLSearchParams({ lang: q.lang });
  if (q.category) params.set('category', q.category);
  if (q.search) params.set('q', q.search);
  return get<Phrase[]>(`/phrases?${params.toString()}`, token);
};

export const createConversation = (patientLanguage: string, token?: string | null) =>
  post<Conversation>('/conversations', { patientLanguage }, token);
export const listConversations = (token?: string | null) =>
  get<Conversation[]>('/conversations', token);
export const getConversation = (id: string, token?: string | null) =>
  get<ConversationDetail>(`/conversations/${id}`, token);
export const deleteConversation = (id: string, token?: string | null) =>
  del<{ ok: boolean }>(`/conversations/${id}`, token);
export interface AddTurnBody {
  speaker: 'NURSE' | 'PATIENT'; text?: string; phraseId?: string; sttConfidence?: number;
}

export const addTurn = (id: string, body: AddTurnBody, token?: string | null) =>
  post<Turn>(`/conversations/${id}/turns`, body, token);

export const translate = (text: string, to: string, token?: string | null) =>
  post<TranslationResponse>('/translations', { text, to }, token);

export const presignUpload = (extension: string, token?: string | null) =>
  post<Presign>('/uploads/presign', { extension }, token);
export const submitStt = (storageRef: string, languageHint: string, token?: string | null) =>
  post<WorkflowSubmission>('/speech/submissions', { storageRef, languageHint }, token);
export const sttStatus = (id: string, token?: string | null) =>
  get<WorkflowStatus>(`/speech/${id}/status`, token);
export const submitTts = (text: string, language: string, rate: string, token?: string | null) =>
  post<WorkflowSubmission>('/tts', { text, language, rate }, token);
export const ttsStatus = (id: string, token?: string | null) =>
  get<WorkflowStatus>(`/tts/${id}/status`, token);

export const listFavorites = (token?: string | null) => get<Favorite[]>('/favorites', token);
export const addFavorite = (phraseId: string, languageCode: string, token?: string | null) =>
  post<Favorite>('/favorites', { phraseId, languageCode }, token);
export const removeFavorite = (phraseId: string, languageCode: string, token?: string | null) =>
  del<{ ok: boolean }>(`/favorites/${phraseId}/${languageCode}`, token);
export const listRecents = (token?: string | null) => get<Recent[]>('/recents', token);
export const getUsage = (token?: string | null) => get<Usage>('/usage', token);
