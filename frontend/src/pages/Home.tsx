// Home: one dominant next action (continue the most recent conversation, or
// start the first one), the current support stage, and three honest modules:
// phrases due for review, a reasoned suggestion, and this week's snapshot
// against a personal goal. Every number comes from the real API or from
// local preferences; nothing here is invented.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { SpeakButton, Skeleton, Empty, ErrorBox } from '../components/ui';
import StageControl from '../components/StageControl';
import { Icon } from '../components/icons';
import type { Conversation, Favorite, Phrase, Recent, UsersMe } from '../api/client';
import { LANGUAGES } from '../api/mockData';
import {
  getActiveLang, getGoal, getStage, isDue, isSuggestionDismissed,
  dismissSuggestion, usePrefs,
} from '../state/prefs';

function startOfWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d.getTime();
}

export default function Home() {
  const { token } = useAuth();
  const store = useStore();
  const { t } = useLocale();
  const nav = useNavigate();
  usePrefs();

  const [me, setMe] = useState<UsersMe | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [newConvLang, setNewConvLang] = useState('');
  const [creating, setCreating] = useState(false);

  const langs = store.offline ? LANGUAGES : store.languages;
  const patientLangs = langs.filter((l) => l.code !== 'en');

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    Promise.all([
      store.usersMe(token),
      store.listConversations(token),
      store.listRecents(token),
      store.listFavorites(token),
    ]).then(([m, c, r, f]) => {
      setMe(m); setConvs(c); setRecents(r); setFavorites(f); setLoading(false);
    }).catch(() => { setLoadError(true); setLoading(false); });
  }, [store, token]);

  useEffect(() => { load(); }, [load, attempt]);

  const settings = me?.settings;
  const activeLang = getActiveLang()
    ?? settings?.patientLanguages[0]
    ?? patientLangs[0]?.code
    ?? null;
  const stage = activeLang ? getStage(activeLang) : 'blend';

  // Phrase catalog for recents + suggestion (one fetch, reused).
  useEffect(() => {
    if (loading || !activeLang) return;
    store.listPhrases({ lang: activeLang }, token)
      .then(setPhrases)
      .catch(() => { /* modules simply hide */ });
  }, [loading, activeLang, store, token]);

  const recentDetails = recents
    .map((r) => phrases.find((p) => p.id === r.phraseId))
    .filter((p): p is Phrase => Boolean(p))
    .slice(0, 6);

  const latest = [...convs].sort((a, b) =>
    (b.lastActivityAt ?? b.startedAt ?? '').localeCompare(a.lastActivityAt ?? a.startedAt ?? ''))[0];

  const weekStart = startOfWeek();
  const weekConvs = convs.filter((c) =>
    new Date(c.lastActivityAt ?? c.startedAt ?? 0).getTime() >= weekStart);
  const weekTurns = weekConvs.reduce((sum, c) => sum + c.turnCount, 0);
  const goal = activeLang ? getGoal(activeLang) : 0;
  const goalConvs = activeLang
    ? weekConvs.filter((c) => c.patientLanguage === activeLang).length
    : weekConvs.length;

  const profileFavs = activeLang
    ? favorites.filter((f) => f.languageCode === activeLang)
    : favorites;
  const now = Date.now();
  const dueIds = profileFavs.map((f) => f.phraseId)
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .filter((id) => activeLang ? isDue(activeLang, id, now) : true);

  // Reasoned suggestion from real recents: the category behind the last phrase used.
  const recentPhrase = recents.length > 0
    ? phrases.find((p) => p.id === recents[0].phraseId)
    : undefined;
  const suggestionCat = recentPhrase
    ? store.categories.find((c) => c.slug === recentPhrase.categorySlug)
    : undefined;
  const showSuggestion = Boolean(suggestionCat) && !isSuggestionDismissed();

  const startConversation = async () => {
    if (!newConvLang) return;
    setCreating(true);
    try {
      const conv = await store.createConversation(newConvLang, token);
      nav(`/conversation/${conv.id}`);
    } catch {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="page"><Skeleton lines={6} /></div>;
  }
  if (loadError && !me) {
    return (
      <div className="page">
        <ErrorBox
          title="We couldn't load your home screen"
          body="You're signed in, but the request failed just now. Nothing was lost."
          onRetry={() => setAttempt((a) => a + 1)}
        />
      </div>
    );
  }

  const activeLangObj = activeLang ? langs.find((l) => l.code === activeLang) : undefined;
  const nurseLang = settings?.nurseLanguage ?? 'en';
  const nurseLangObj = langs.find((l) => l.code === nurseLang);

  return (
    <div className="page">
      {/* ---------- dominant next action ---------- */}
      {latest ? (
        <section className="continue-card" aria-labelledby="continue-h" style={{ marginBottom: '1.25rem' }}>
          <p className="eyebrow">Continue where you left off</p>
          <div className="direction" id="continue-h">
            <span className="dir-from">{nurseLangObj?.name ?? nurseLang}</span>
            <span className="dir-arrow" aria-hidden="true"><Icon name="arrowRight" size={15} /></span>
            <span>{langs.find((l) => l.code === latest.patientLanguage)?.nativeName ?? latest.patientLanguage}</span>
          </div>
          <h1 className="title" style={{ fontSize: '1.35rem' }}>
            {latest.title
              ?? `${langs.find((l) => l.code === latest.patientLanguage)?.name ?? latest.patientLanguage} conversation`}
          </h1>
          <p className="small muted" style={{ margin: 0 }}>
            {latest.turnCount} turns · {latest.lastActivityAt ? `last active ${timeAgo(latest.lastActivityAt)}` : 'just now'}
          </p>
          <div className="row" style={{ gap: '.9rem', flexWrap: 'wrap', marginTop: '.25rem' }}>
            <Link to={`/conversation/${latest.id}`} className="btn btn-primary">
              Continue conversation <Icon name="arrowRight" size={16} />
            </Link>
            <Link to="/conversation" className="hero-alt">Start a new conversation</Link>
          </div>
        </section>
      ) : (
        <section className="continue-card" aria-labelledby="continue-h" style={{ marginBottom: '1.25rem' }}>
          <p className="eyebrow">Start here</p>
          <h1 className="title" id="continue-h" style={{ fontSize: '1.35rem' }}>
            Who are you caring for today?
          </h1>
          <p className="small muted" style={{ margin: 0 }}>
            Pick a patient language and start a conversation.
          </p>
          <div className="row" style={{ gap: '.75rem', flexWrap: 'wrap' }}>
            <select
              className="select"
              style={{ maxWidth: 260 }}
              value={newConvLang}
              onChange={(e) => setNewConvLang(e.target.value)}
              aria-label="Patient language"
            >
              <option value="">Select patient language…</option>
              {patientLangs.map((l) => (
                <option key={l.code} value={l.code}>{l.nativeName} ({l.name})</option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              disabled={!newConvLang || creating}
              onClick={startConversation}
            >
              {creating ? 'Starting…' : (<>{t('home.start')} <Icon name="arrowRight" size={16} /></>)}
            </button>
          </div>
        </section>
      )}

      {/* ---------- support stage ---------- */}
      <section className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="module-head">
          <h2 style={{ fontSize: '1.05rem' }}>{t('stage.title')}</h2>
          <span className="stage-chip">
            <Icon name="swap" size={13} />
            {t(`stage.${stage}` as 'stage.support')}
          </span>
        </div>
        <p className="small muted" style={{ marginTop: '-.35rem', marginBottom: '.6rem' }}>
          {activeLangObj
            ? `Active profile: ${nurseLangObj?.name ?? 'English'} to ${activeLangObj.name}`
            : 'Account-wide default'}
        </p>
        <StageControl lang={activeLang} />
      </section>

      {/* ---------- supporting modules ---------- */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* due review */}
        <section className="card" aria-labelledby="due-h">
          <div className="module-head">
            <h3 id="due-h" style={{ fontSize: '1rem' }}>Ready to review</h3>
            <span className="badge badge-library">{dueIds.length} due</span>
          </div>
          {profileFavs.length === 0 ? (
            <>
              <p className="small muted" style={{ marginTop: 0 }}>
                Nothing saved yet. Star phrases in Learn and they land here for quick review.
              </p>
              <Link to="/phrasebook" className="btn btn-secondary" style={{ marginTop: '.35rem' }}>
                Browse phrases
              </Link>
            </>
          ) : (
            <>
              <p className="small muted" style={{ marginTop: 0 }}>
                {dueIds.length > 0
                  ? `${dueIds.length} of your ${profileFavs.length} saved phrases are ready right now.`
                  : `All ${profileFavs.length} saved phrases are done for now. They come back tomorrow.`}
              </p>
              <Link to="/review" className="btn btn-secondary" style={{ marginTop: '.35rem' }}>
                <Icon name="star" size={16} /> Review now
              </Link>
            </>
          )}
        </section>

        {/* reasoned suggestion */}
        {showSuggestion && suggestionCat && (
          <section className="card" aria-labelledby="sug-h">
            <div className="module-head">
              <h3 id="sug-h" style={{ fontSize: '1rem' }}>Suggested for you</h3>
            </div>
            <p className="suggest-reason" style={{ marginBottom: '.6rem' }}>
              <Icon name="help" size={15} />
              <span>Suggested because you used the {suggestionCat.name} phrases most recently.</span>
            </p>
            <div className="row" style={{ gap: '.6rem' }}>
              <Link to={`/phrasebook?category=${suggestionCat.slug}`} className="btn btn-secondary">
                Open {suggestionCat.name}
              </Link>
              <button className="btn btn-quiet" onClick={dismissSuggestion}>Not now</button>
            </div>
          </section>
        )}

        {/* weekly snapshot + goal */}
        <section className="card" aria-labelledby="week-h">
          <div className="module-head">
            <h3 id="week-h" style={{ fontSize: '1rem' }}>This week</h3>
            <span className="small muted">Monday to today</span>
          </div>
          <div className="row" style={{ gap: '1.5rem', marginBottom: '.5rem' }}>
            <div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{weekConvs.length}</div>
              <div className="stat-label">Conversations</div>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{weekTurns}</div>
              <div className="stat-label">Turns</div>
            </div>
          </div>
          {goal > 0 ? (
            <div className="goal-line" style={{ marginTop: '.35rem' }}>
              <strong>{goalConvs} of {goal}</strong>
              <span>conversations {activeLangObj ? `in ${activeLangObj.name}` : ''} this week</span>
            </div>
          ) : (
            <Link to="/settings" className="small" style={{ fontWeight: 600 }}>
              Set a weekly goal in your profile
            </Link>
          )}
        </section>
      </div>

      {/* ---------- recently used ---------- */}
      <section>
        <div className="module-head">
          <h2 className="section-h" style={{ margin: 0 }}>{t('home.recents')}</h2>
          <Link to="/phrasebook" className="small" style={{ fontWeight: 600 }}>Open Learn</Link>
        </div>
        {recentDetails.length === 0 ? (
          <Empty title="No recent phrases" body={t('home.noRecents')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginTop: '.75rem' }}>
            {recentDetails.map((p) => {
              const tr = p.translations[0];
              return (
                <div key={p.id} className="phrase-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div className="phrase-en">{p.baseText}</div>
                    {tr && <div className="phrase-trans">{tr.text}</div>}
                    {tr?.romanization && <div className="phrase-roman">{tr.romanization}</div>}
                  </div>
                  {tr && (
                    <SpeakButton
                      text={tr.romanization || tr.text}
                      ttsLocale={langs.find((l) => l.code === tr.languageCode)?.ttsLocale ?? 'es-MX'}
                      label={tr.text}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
