// Conversation: the two-sided thread. The nurse types or speaks in their language,
// and the patient hears theirs. When the patient speaks, the result is a transcript
// plus an English translation.
// Phrase drawer, library-first suggestions, mic recording, processing states.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { MicRecorder, SpeakButton, Skeleton, Empty, ErrorBox } from '../components/ui';
import { Icon } from '../components/icons';
import type { ConversationDetail, Phrase, Turn, Language } from '../api/client';
import { LANGUAGES } from '../api/mockData';

export default function Conversation() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const store = useStore();
  const { t } = useLocale();
  const nav = useNavigate();

  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // input state
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // phrase drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [phraseSearch, setPhraseSearch] = useState('');
  const [phraseCategory, setPhraseCategory] = useState('');
  const [phrases, setPhrases] = useState<Phrase[]>([]);

  // suggestions (fuzzy match against library)
  const [suggestions, setSuggestions] = useState<Phrase[]>([]);

  // mic state
  const [processing, setProcessing] = useState(false);

  // scroll ref
  const listEnd = useRef<HTMLDivElement>(null);

  const langs = store.offline ? LANGUAGES : store.languages;

  const conv = detail?.conversation;
  const turns = detail?.turns ?? [];
  const patientLang = conv?.patientLanguage ?? 'es';
  const nurseLang = conv?.nurseLanguage ?? 'en';
  const patientLangObj = langs.find((l) => l.code === patientLang);

  // Load conversation
  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    store.getConversation(id, token)
      .then((d) => { setDetail(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [id, store, token]);

  useEffect(() => { load(); }, [load]);

  // Scroll to bottom on new turns
  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length]);

  // Load phrases for drawer
  useEffect(() => {
    if (!drawerOpen) return;
    store.listPhrases({ category: phraseCategory || undefined, search: phraseSearch || undefined, lang: patientLang }, token)
      .then(setPhrases)
      .catch(() => {});
  }, [drawerOpen, phraseCategory, phraseSearch, patientLang, store, token]);

  // Suggest phrases as user types
  useEffect(() => {
    if (!inputText.trim() || inputText.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      store.listPhrases({ search: inputText, lang: patientLang }, token)
        .then((p) => setSuggestions(p.slice(0, 5)))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [inputText, patientLang, store, token]);

  // Send a text turn (nurse)
  const sendText = async () => {
    const text = inputText.trim();
    if (!text || !id || sending) return;
    setSending(true);
    setLastError(null);
    try {
      await store.addTurn(id, { speaker: 'NURSE', text }, token);
      setInputText('');
      setSuggestions([]);
      load();
    } catch (err: any) {
      setLastError(err?.message ?? 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  // Send a phrase turn (nurse)
  const sendPhrase = async (phraseId: string) => {
    if (!id || sending) return;
    setSending(true);
    setLastError(null);
    try {
      await store.addTurn(id, { speaker: 'NURSE', phraseId }, token);
      setDrawerOpen(false);
      load();
    } catch (err: any) {
      setLastError(err?.message ?? 'Failed to send phrase');
    } finally {
      setSending(false);
    }
  };

  // Handle patient audio recording
  const handlePatientAudio = async (blob: Blob | null) => {
    if (!blob || !id) return;
    setProcessing(true);
    setLastError(null);
    try {
      // 1. presign upload
      const presign = await store.submitStt('demo-ref', patientLang, token);
      // 2. poll STT status (simulated)
      const status = await store.sttStatus(presign.id, token);
      if (status.status === 'completed' && status.result?.transcript) {
        await store.addTurn(id, {
          speaker: 'PATIENT',
          text: status.result.transcript,
          sttConfidence: status.result.confidence ?? undefined,
        }, token);
        load();
      } else {
        setLastError(t('conversation.couldntHear'));
      }
    } catch (err: any) {
      setLastError(err?.message ?? 'Could not process audio');
    } finally {
      setProcessing(false);
    }
  };

  // Patient text input (manual entry)
  const [patientInput, setPatientInput] = useState('');
  const sendPatientText = async () => {
    const text = patientInput.trim();
    if (!text || !id || sending) return;
    setSending(true);
    try {
      await store.addTurn(id, { speaker: 'PATIENT', text }, token);
      setPatientInput('');
      load();
    } catch (err: any) {
      setLastError(err?.message ?? 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div className="conv-header">
          <button className="back-btn" onClick={() => nav('/home')} aria-label="Back">
            <Icon name="arrowRight" size={18} className="flip-x" />
          </button>
          <div className="conv-info"><div className="conv-title">Loading…</div></div>
        </div>
        <div style={{ flex: 1, padding: '1rem' }}><Skeleton lines={8} /></div>
      </div>
    );
  }

  if (error || !conv) {
    return (
      <div className="page">
        <ErrorBox
          title="Conversation not found"
          body="This conversation may have been deleted or expired."
          onRetry={() => nav('/home')}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div className="conv-header">
        <button className="back-btn" onClick={() => nav('/home')} aria-label="Back">
          <Icon name="arrowRight" size={18} className="flip-x" />
        </button>
        <div className="conv-info">
          <div className="conv-title">
            <span className="badge badge-nurse" style={{ marginRight: '.4rem' }}>{nurseLang.toUpperCase()}</span>
            <Icon name="swap" size={14} className="lang-swap" />
            <span className="badge badge-patient" style={{ marginLeft: '.4rem' }}>
              {patientLangObj?.nativeName ?? patientLang}
            </span>
          </div>
          <div className="conv-meta">{turns.length} turns</div>
        </div>
        <button className="btn btn-secondary" onClick={() => nav('/interpreter')} aria-label="Request interpreter">
          <Icon name="phone" size={16} /> {t('disclaimer.interpreter')}
        </button>
      </div>

      {/* Turn list */}
      <div className="msg-list" style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
        {turns.length === 0 ? (
          <Empty
            title="Start the conversation"
            body={t('conversation.empty')}
          />
        ) : (
          turns.map((turn) => (
            <TurnBubble key={turn.id} turn={turn} langs={langs} />
          ))
        )}
        <div ref={listEnd} />
      </div>

      {/* Error banner */}
      {lastError && (
        <div className="error-box" style={{ margin: '0 1rem', padding: '.75rem 1rem' }} role="alert">
          <span className="small">{lastError}</span>
          <button className="btn btn-quiet small" onClick={() => setLastError(null)}
            style={{ marginLeft: '.5rem' }} aria-label="Dismiss">
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      {/* Processing indicator */}
      {processing && (
        <div style={{ textAlign: 'center', padding: '.75rem', color: 'var(--accent)', fontWeight: 700 }}>
          {t('conversation.processing')}…
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((s) => {
            const tr = s.translations[0];
            return (
              <button key={s.id} className="chip" onClick={() => sendPhrase(s.id)}
                style={{ cursor: 'pointer' }}>
                <Icon name="clipboard" size={15} /> {s.baseText}
              </button>
            );
          })}
        </div>
      )}

      {/* Nurse input */}
      <div className="input-bar">
        <button
          className="btn btn-secondary"
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-label="Open phrase drawer"
          aria-expanded={drawerOpen}
          style={{ minWidth: 44 }}
        >
          <Icon name="phrasebook" size={18} />
        </button>
        <textarea
          className="input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
          placeholder={t('conversation.typePlaceholder')}
          rows={1}
          style={{ resize: 'none', maxHeight: 100 }}
          disabled={sending}
        />
        <button
          className="btn btn-primary"
          onClick={sendText}
          disabled={!inputText.trim() || sending}
          style={{ minWidth: 44 }}
        >
          {sending ? '…' : t('conversation.send')}
        </button>
      </div>

      {/* Patient input bar (mic + text) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '.5rem',
        padding: '.5rem 1rem',
        background: 'var(--bg-raised)', borderTop: '1px solid var(--border)',
      }}>
        <MicRecorder onRecorded={handlePatientAudio} hint={t('conversation.speak')} />
        <input
          className="input"
          value={patientInput}
          onChange={(e) => setPatientInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendPatientText(); } }}
          placeholder="Patient text (manual entry)…"
          style={{ flex: 1, minHeight: 36, fontSize: '.85rem' }}
          disabled={sending}
        />
        <button
          className="btn btn-patient"
          onClick={sendPatientText}
          disabled={!patientInput.trim() || sending}
          style={{ minHeight: 36, fontSize: '.82rem', padding: '.4rem .8rem' }}
        >
          Patient
        </button>
      </div>

      {/* Phrase drawer */}
      {drawerOpen && (
        <div className="phrase-drawer">
          <div className="between" style={{ marginBottom: '.75rem' }}>
            <h3 style={{ margin: 0 }}>Phrasebook</h3>
            <button className="btn btn-quiet" onClick={() => setDrawerOpen(false)}>
              <Icon name="close" size={15} /> Close
            </button>
          </div>
          <div className="row" style={{ gap: '.5rem', marginBottom: '.75rem', flexWrap: 'wrap' }}>
            <input
              className="input"
              value={phraseSearch}
              onChange={(e) => setPhraseSearch(e.target.value)}
              placeholder={t('phrasebook.searchPlaceholder')}
              style={{ flex: 1, minWidth: 150 }}
            />
            <select className="select" value={phraseCategory}
              onChange={(e) => setPhraseCategory(e.target.value)}
              style={{ width: 'auto', minWidth: 130 }}>
              <option value="">All categories</option>
              {store.categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', maxHeight: '35vh', overflowY: 'auto' }}>
            {phrases.map((p) => {
              const tr = p.translations[0];
              return (
                <button key={p.id} className="phrase-card" onClick={() => sendPhrase(p.id)}
                  style={{ textAlign: 'left', cursor: 'pointer', padding: '.75rem 1rem' }}>
                  <div className="phrase-en">{p.baseText}</div>
                  {tr && <div className="phrase-trans">{tr.romanization || tr.text}</div>}
                </button>
              );
            })}
            {phrases.length === 0 && <p className="muted small" style={{ padding: '1rem', textAlign: 'center' }}>No phrases found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Turn bubble ----------
function TurnBubble({ turn, langs }: { turn: Turn; langs: Language[] }) {
  const isNurse = turn.speaker === 'NURSE';
  const targetLangObj = langs.find((l) => l.code === turn.targetLang);

  return (
    <div className={`turn ${isNurse ? 'nurse' : 'patient'}`}>
      <div className="turn-bubble">
        <div className="turn-speaker">
          {isNurse ? 'Nurse' : 'Patient'}
        </div>
        <div className="turn-source">{turn.sourceText}</div>
        <div className="turn-target">
          <span style={{ fontWeight: 600 }}>{turn.targetText}</span>
          {turn.targetRomanization && (
            <div className="turn-romanization">{turn.targetRomanization}</div>
          )}
        </div>
        <div className="turn-meta">
          {turn.libraryPhraseId ? (
            <span className="badge badge-library">Library</span>
          ) : (
            <span className="badge badge-mt">MT</span>
          )}
          {turn.sttConfidence != null && (
            <span className="tiny muted">STT {Math.round(turn.sttConfidence * 100)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}
