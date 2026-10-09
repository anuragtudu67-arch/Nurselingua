// Review: practice the phrases you saved in Learn. Real data only: the queue
// is your favorites for the chosen language, and the schedule (due times) is
// kept on this device by the prefs adapter, because the frozen backend has no
// review/progress endpoint. Every control does something: reveal, response,
// short/full choice, restart, leave. No points, no streaks, no fake mastery.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { SpeakButton, Skeleton, Empty } from '../components/ui';
import { Icon } from '../components/icons';
import type { Favorite, Phrase } from '../api/client';
import { LANGUAGES } from '../api/mockData';
import { getActiveLang, isDue, recordReview, usePrefs } from '../state/prefs';

const SHORT_SESSION = 5;

type Phase = 'pick' | 'running' | 'summary';

export default function Review() {
  const { token } = useAuth();
  const store = useStore();
  const { t } = useLocale();
  usePrefs();

  const [favorites, setFavorites] = useState<Favorite[] | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [lang, setLang] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('pick');
  const [size, setSize] = useState<'short' | 'full'>('short');
  const [queue, setQueue] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState<{ ok: number; again: number }>({ ok: 0, again: 0 });

  const langs = store.offline ? LANGUAGES : store.languages;

  useEffect(() => {
    store.listFavorites(token).then((favs) => {
      setFavorites(favs);
      const codes = [...new Set(favs.map((f) => f.languageCode))];
      const preferred = getActiveLang();
      setLang((cur) => cur ?? (preferred && codes.includes(preferred) ? preferred : codes[0] ?? null));
    }).catch(() => setFavorites([]));
  }, [store, token]);

  useEffect(() => {
    if (!lang) return;
    store.listPhrases({ lang }, token).then(setPhrases).catch(() => setPhrases([]));
  }, [lang, store, token]);

  const savedForLang = useMemo(
    () => (favorites ?? []).filter((f) => f.languageCode === lang),
    [favorites, lang],
  );
  const savedIds = useMemo(
    () => [...new Set(savedForLang.map((f) => f.phraseId))],
    [savedForLang],
  );
  const now = Date.now();
  const dueIds = savedIds.filter((id) => isDue(lang ?? '', id, now));
  const phraseOf = (id: string) => phrases.find((p) => p.id === id);

  const langCodes = useMemo(
    () => [...new Set((favorites ?? []).map((f) => f.languageCode))],
    [favorites],
  );
  const langObj = lang ? langs.find((l) => l.code === lang) : undefined;

  const start = (mode: 'short' | 'full') => {
    const base = dueIds.length > 0 ? dueIds : savedIds; // "review anyway" when none due
    const order = mode === 'short' ? base.slice(0, SHORT_SESSION) : base;
    if (order.length === 0) return;
    setSize(mode);
    setQueue(order);
    setDone({ ok: 0, again: 0 });
    setRevealed(false);
    setPhase('running');
  };

  const respond = (ok: boolean) => {
    const [current, ...rest] = queue;
    if (!current || !lang) return;
    recordReview(lang, current, ok);
    setDone((d) => ({ ok: d.ok + (ok ? 1 : 0), again: d.again + (ok ? 0 : 1) }));
    setQueue(rest);
    setRevealed(false);
    if (rest.length === 0) setPhase('summary');
  };

  if (favorites === null) {
    return <div className="page"><Skeleton lines={6} /></div>;
  }

  const activeLangs = langCodes.length > 0 ? langCodes : (lang ? [lang] : []);

  // ---------- summary ----------
  if (phase === 'summary' && lang) {
    const total = done.ok + done.again;
    return (
      <div className="page" style={{ maxWidth: 560 }}>
        <h1 className="title" style={{ marginBottom: '1rem' }}>Session complete</h1>
        <div className="card">
          <p style={{ marginTop: 0 }}>
            You reviewed <strong>{total}</strong> {total === 1 ? 'phrase' : ' phrases'} in{' '}
            {langObj?.name ?? lang}.
          </p>
          <div className="row" style={{ gap: '1.5rem', marginBottom: '.75rem' }}>
            <div>
              <div className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--success)' }}>{done.ok}</div>
              <div className="stat-label">Got it</div>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--warning)' }}>{done.again}</div>
              <div className="stat-label">Again</div>
            </div>
          </div>
          <p className="small muted">
            “Got it” brings a phrase back in a day; “Again” brings it back in ten minutes.
            The schedule lives on this device.
          </p>
          <div className="row" style={{ gap: '.75rem', marginTop: '.5rem' }}>
            <button className="btn btn-primary" onClick={() => setPhase('pick')}>
              Review more
            </button>
            <Link to="/home" className="btn btn-secondary">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------- running a session ----------
  if (phase === 'running' && lang) {
    const currentId = queue[0];
    const phrase = currentId ? phraseOf(currentId) : undefined;
    const tr = phrase?.translations.find((x) => x.languageCode === lang) ?? phrase?.translations[0];
    const total = queue.length + (done.ok + done.again);
    const position = total - queue.length + 1;

    if (!phrase || !tr) {
      return (
        <div className="page">
          <Errorish
            title="This phrase is unavailable right now"
            body="It may have been removed from the catalog. Skip it or end the session."
            onSkip={() => respond(true)}
          />
        </div>
      );
    }

    return (
      <div className="page" style={{ maxWidth: 560 }}>
        <div className="review-progress" style={{ marginBottom: '.75rem' }}>
          <span aria-hidden="true">{position} of {total}</span>
          <span className="bar-track" style={{ flex: 1 }} role="presentation">
            <span className="bar-fill" style={{ width: `${Math.round((position / total) * 100)}%` }} />
          </span>
          <Link to="/home" className="btn btn-quiet" style={{ minHeight: 36, fontSize: '.82rem' }}>
            Leave
          </Link>
        </div>
        <p className="visually-hidden" role="status">
          {`Phrase ${position} of ${total}`}
        </p>

        <div className="review-card">
          <div>
            <p className="small muted" style={{ marginBottom: '.35rem' }}>
              Say this in {langObj?.nativeName ?? lang}
            </p>
            <p className="review-prompt">{phrase.baseText}</p>
          </div>

          {revealed ? (
            <div>
              <p className="review-answer">{tr.text}</p>
              {tr.romanization && <p className="review-roman">{tr.romanization}</p>}
              <div style={{ marginTop: '.6rem' }}>
                <SpeakButton
                  text={tr.romanization || tr.text}
                  ttsLocale={langObj?.ttsLocale ?? 'es-MX'}
                  label={tr.text}
                />
              </div>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={() => setRevealed(true)}>
              Reveal translation
            </button>
          )}

          {revealed && (
            <div className="review-actions">
              <button className="btn btn-secondary" onClick={() => respond(false)}>
                <Icon name="close" size={16} /> Again
              </button>
              <button className="btn btn-primary" onClick={() => respond(true)}>
                <Icon name="check" size={16} /> Got it
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- pick a session ----------
  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <h1 className="title" style={{ marginBottom: '.35rem' }}>Review</h1>
      <p className="muted small" style={{ marginBottom: '1.25rem' }}>
        Practice the phrases you saved. Short picks {SHORT_SESSION}; full runs everything ready.
      </p>

      {langCodes.length > 1 && (
        <div className="chips-row" style={{ marginBottom: '1rem' }} role="group" aria-label="Language">
          {langCodes.map((code) => (
            <button
              key={code}
              className={`chip ${lang === code ? 'active' : ''}`}
              aria-pressed={lang === code}
              onClick={() => setLang(code)}
            >
              {langs.find((l) => l.code === code)?.nativeName ?? code}
            </button>
          ))}
        </div>
      )}

      {savedIds.length === 0 ? (
        <Empty
          title="Nothing saved yet"
          body="Star phrases in Learn and they land here, ready to practice."
          action={<Link to="/phrasebook" className="btn btn-primary" style={{ marginTop: '.75rem' }}>Open Learn</Link>}
        />
      ) : (
        <div className="card">
          <div className="module-head">
            <h2 style={{ fontSize: '1.05rem' }}>Ready now</h2>
            <span className="badge badge-library">{dueIds.length} of {savedIds.length} due</span>
          </div>
          <p className="small muted" style={{ marginTop: '-.35rem' }}>
            {dueIds.length > 0
              ? 'These phrases have not been practiced recently, so they are waiting for you.'
              : 'Nothing is due right now. You can still practice if you want.'}
          </p>
          <div className="row" style={{ gap: '.75rem', flexWrap: 'wrap', marginTop: '.75rem' }}>
            <button
              className="btn btn-primary"
              disabled={dueIds.length === 0}
              onClick={() => start('short')}
            >
              Short session
            </button>
            <button
              className="btn btn-secondary"
              disabled={dueIds.length === 0}
              onClick={() => start('full')}
            >
              Full session
            </button>
            {dueIds.length === 0 && (
              <button className="btn btn-quiet" onClick={() => start('full')}>
                Practice anyway
              </button>
            )}
          </div>
        </div>
      )}

      <p className="small muted" style={{ marginTop: '1rem' }}>
        Saved phrases and review timing stay on this device. Your favorites themselves live
        with your account.
      </p>
    </div>
  );
}

/** Unavailable phrase mid-session: honest error with a way forward. */
function Errorish({ title, body, onSkip }: { title: string; body: string; onSkip: () => void }) {
  return (
    <div className="error-box" role="alert">
      <h3 style={{ margin: '0 0 4px' }}>{title}</h3>
      <p className="muted small">{body}</p>
      <button className="btn btn-secondary" onClick={onSkip}>Skip this phrase</button>
    </div>
  );
}
