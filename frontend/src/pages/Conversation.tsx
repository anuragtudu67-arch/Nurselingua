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
import { getStage, STAGES, usePrefs, type Stage } from '../state/prefs';

export default function Conversation() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const store = useStore();
  const { t } = useLocale();
  const nav = useNavigate();
  usePrefs(); // stage changes reflect immediately inside the session

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
  const [sttTimeout, setSttTimeout] = useState(false);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const sttAbort = useRef<AbortController | null>(null);

  // scroll ref
  const listEnd = useRef<HTMLDivElement>(null);

  // stage-driven familiar-language display (immersion folds all turns at once)
  const [showAllFamiliar, setShowAllFamiliar] = useState(false);

  const langs = store.offline ? LANGUAGES : store.languages;

  const conv = detail?.conversation;
  const turns = detail?.turns ?? [];
  const patientLang = conv?.patientLanguage ?? 'es';
  const nurseLang = conv?.nurseLanguage ?? 'en';
  const patientLangObj = langs.find((l) => l.code === patientLang);
  const stage: Stage = conv ? getStage(conv.patientLanguage) : 'blend';
  const stageMeta = STAGES.find((s) => s.id === stage)!;
  const foldsFamiliar = stage === 'focus' || stage === 'immersion';

  // checkpoint: what should happen next in this session
  const nextAction = turns.length === 0
    ? 'Start with a phrasebook phrase, your voice, or typing below.'
    : turns[turns.length - 1].speaker === 'NURSE'
      ? 'Now capture the patient’s reply: record their voice or type it below.'
      : 'Your turn: reply with a phrase, your voice, or typing.';

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

  // Handle patient audio recording. Deadline-based polling: ~300ms first,
  // backing off to ~1s, total <=20s. Pending shows a neutral Listening state
  // (never error styling); an empty backend result means "couldn't hear";
  // hitting the deadline offers a retry instead of falsely blaming the patient.
  const handlePatientAudio = async (blob: Blob | null) => {
    if (!blob || !id) return;
    setLastBlob(blob);
    sttAbort.current?.abort();
    const ctrl = new AbortController();
    sttAbort.current = ctrl;
    setProcessing(true);
    setSttTimeout(false);
    setLastError(null);
    try {
      const presign = await store.submitStt('demo-ref', patientLang, token);
      const deadline = Date.now() + 20000;
      let delay = 300;
      let status = await store.sttStatus(presign.id, token);
      while (status.status !== 'completed' && status.status !== 'failed' && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, delay));
        if (ctrl.signal.aborted) return;
        delay = Math.min(Math.round(delay * 1.6), 1000);
        status = await store.sttStatus(presign.id, token);
      }
      if (ctrl.signal.aborted) return;
      if (status.status === 'completed' && status.result?.transcript) {
        await store.addTurn(id, {
          speaker: 'PATIENT',
          text: status.result.transcript,
          sttConfidence: status.result.confidence ?? undefined,
        }, token);
        load();
      } else if (status.status === 'failed' || status.status === 'completed') {
        // backend settled with nothing usable
        setLastError(t('conversation.couldntHear'));
      } else {
        // deadline hit while the backend is still working
        setSttTimeout(true);
      }
    } catch (err: any) {
      if (!ctrl.signal.aborted) setLastError(err?.message ?? 'Could not process audio');
    } finally {
      if (!ctrl.signal.aborted) setProcessing(false);
    }
  };

  // Abort the in-flight poll when the conversation changes or we unmount,
  // so no dangling fetch keeps a dead component busy.
  useEffect(() => {
    return () => sttAbort.current?.abort();
  }, [id]);

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
          <div className="conv-meta">
            {turns.length} turns · {t('stage.title')}:{' '}
            <span className="stage-chip" style={{ marginLeft: '.3rem' }}>
              <Icon name="swap" size={12} /> {t(stageMeta.nameKey)}
            </span>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => nav('/interpreter')} aria-label="Request interpreter">
          <Icon name="phone" size={16} /> {t('disclaimer.interpreter')}
        </button>
      </div>

      {/* checkpoint: the next real action in this session */}
      <div className="next-hint" role="status">
        <Icon name="arrowRight" size={14} />
        <span>{nextAction}</span>
      </div>

      {/* Immersion: one tap unfolds (or folds) the familiar line on every turn */}
      {stage === 'immersion' && (
        <div className="row" style={{ padding: '.5rem 1.5rem 0' }}>
          <button
            className="btn btn-secondary"
            aria-pressed={showAllFamiliar}
            onClick={() => setShowAllFamiliar((v) => !v)}
            style={{ minHeight: 40, fontSize: '.85rem' }}
          >
            <Icon name={showAllFamiliar ? 'close' : 'help'} size={15} />
            {showAllFamiliar ? 'Hide English' : 'Show English for all turns'}
          </button>
        </div>
      )}

      {/* Turn list */}
      <div className="msg-list" style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
        {turns.length === 0 ? (
          <Empty
            title="Start the conversation"
            body={t('conversation.empty')}
          />
        ) : (
          turns.map((turn) => (
            <TurnBubble
              key={turn.id}
              turn={turn}
              langs={langs}
              familiarLang={conv.nurseLanguage}
              stage={stage}
              showAll={showAllFamiliar}
            />
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

      {/* STT pending: neutral progress, never error styling */}
      {processing && (
        <div className="stt-pending" role="status">
          <span className="dot" aria-hidden="true" /> Listening…
        </div>
      )}

      {/* Deadline hit while backend still transcribing: honest timeout + retry */}
      {sttTimeout && !processing && (
        <div className="stt-pending" role="status" style={{ justifyContent: 'space-between' }}>
          <span>Still transcribing. Check the backend, then retry.</span>
          <button className="btn btn-secondary" style={{ minHeight: 36 }}
            onClick={() => handlePatientAudio(lastBlob)}>
            Retry
          </button>
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
// The stage decides whether the familiar-language line of this turn is folded.
// The target-language line is never folded: removing comprehension support
// from the conversation itself would be unsafe, so only the duplicate
// familiar line moves behind a reveal.
function TurnBubble({ turn, langs, familiarLang, stage, showAll }: {
  turn: Turn; langs: Language[]; familiarLang: string; stage: Stage; showAll: boolean;
}) {
  const isNurse = turn.speaker === 'NURSE';
  const [open, setOpen] = useState(false);
  const folds = (stage === 'focus' && !showAll) || (stage === 'immersion' && !showAll);
  const labels = stage === 'support';

  const sourceIsFamiliar = turn.sourceLang === familiarLang;
  const sourceLangName = langs.find((l) => l.code === turn.sourceLang)?.name ?? turn.sourceLang;
  const targetLangName = langs.find((l) => l.code === turn.targetLang)?.name ?? turn.targetLang;

  const familiarVisible = !folds || open || showAll;
  const showSource = sourceIsFamiliar ? familiarVisible : true;
  const showTarget = sourceIsFamiliar ? true : familiarVisible;

  const familiarToggle = folds && (
    <button
      className="reveal-btn"
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
    >
      <Icon name={open ? 'close' : 'help'} size={13} />
      {open ? 'Hide English' : 'Show English'}
    </button>
  );

  return (
    <div className={`turn ${isNurse ? 'nurse' : 'patient'}`}>
      <div className="turn-bubble">
        <div className="turn-speaker">
          {isNurse ? 'Nurse' : 'Patient'}
        </div>
        {showSource && (
          <div className="turn-source">
            {labels && <span className="line-lang">{sourceLangName}</span>}
            {turn.sourceText}
          </div>
        )}
        {showTarget && (
          <div className="turn-target">
            {labels && <span className="line-lang">{targetLangName}</span>}
            <span style={{ fontWeight: 600 }}>{turn.targetText}</span>
            {turn.targetRomanization && (
              <div className="turn-romanization">{turn.targetRomanization}</div>
            )}
          </div>
        )}
        {familiarToggle}
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
