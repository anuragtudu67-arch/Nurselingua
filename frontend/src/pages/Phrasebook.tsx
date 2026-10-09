// Learn: the reviewed phrase catalog, organized by category with the category
// objective shown up front. Display follows the support stage of the language
// being read: Full Support/Guided Blend show both languages, Target Focus
// folds the familiar line behind a per-phrase reveal, and Immersion keeps only
// the target line with one page-level tap to unfold.
// Search, filters, favorites, and native audio all work against the real API.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { SpeakButton, Skeleton, Empty } from '../components/ui';
import { Icon } from '../components/icons';
import type { Phrase, Favorite } from '../api/client';
import { LANGUAGES } from '../api/mockData';
import { getStage, STAGES, type Stage } from '../state/prefs';

export default function Phrasebook() {
  const { token } = useAuth();
  const store = useStore();
  const { t } = useLocale();
  const [params] = useSearchParams();

  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lang, setLang] = useState(params.get('lang') ?? 'es');
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [showFavs, setShowFavs] = useState(false);
  const [revealedAll, setRevealedAll] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);

  const langs = store.offline ? LANGUAGES : store.languages;

  useEffect(() => {
    setLoading(true);
    store.listPhrases({ category: category || undefined, search: search || undefined, lang }, token)
      .then((p) => { setPhrases(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, [store, token, lang, category, search]);

  useEffect(() => {
    store.listFavorites(token).then(setFavorites).catch(() => {});
  }, [store, token]);

  // New language or category: reset the reveal state so nothing is half-shown.
  useEffect(() => { setRevealed([]); setRevealedAll(false); }, [lang, category]);

  const toggleFav = async (phraseId: string) => {
    const isFav = favorites.some((f) => f.phraseId === phraseId && f.languageCode === lang);
    try {
      if (isFav) {
        await store.removeFavorite(phraseId, lang, token);
        setFavorites((f) => f.filter((x) => !(x.phraseId === phraseId && x.languageCode === lang)));
      } else {
        await store.addFavorite(phraseId, lang, token);
        setFavorites((f) => [{ phraseId, languageCode: lang, createdAt: new Date().toISOString() }, ...f]);
      }
    } catch { /* star is optimistic; the next load resyncs */ }
  };

  const filtered = showFavs
    ? phrases.filter((p) => favorites.some((f) => f.phraseId === p.id && f.languageCode === lang))
    : phrases;

  const langObj = langs.find((l) => l.code === lang);
  const stage: Stage = getStage(lang);
  const stageMeta = STAGES.find((s) => s.id === stage)!;
  const foldsFamiliar = stage === 'focus' || stage === 'immersion';
  const catObj = store.categories.find((c) => c.slug === category);

  const toggleReveal = (id: string) =>
    setRevealed((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  return (
    <div className="page">
      <div className="module-head">
        <h1 className="title" style={{ marginBottom: 0 }}>{t('nav.phrasebook')}</h1>
        <span className="stage-chip" title={t(stageMeta.descKey)}>
          <Icon name="swap" size={13} /> {t(stageMeta.nameKey)}
        </span>
      </div>
      <p className="muted small" style={{ marginBottom: '.5rem' }}>
        {filtered.length} reviewed phrases · {langObj?.nativeName ?? lang}
      </p>
      <p className="tiny muted" style={{ marginBottom: '1rem' }}>
        {t(stageMeta.descKey)}{' '}
        <Link to="/settings" style={{ fontWeight: 600 }}>Change support level</Link>
      </p>

      {/* Language switcher */}
      <div className="chips-row" style={{ marginBottom: '.75rem' }} role="group" aria-label="Phrase language">
        {langs.filter((l) => l.code !== 'en').map((l) => (
          <button
            key={l.code}
            className={`chip ${lang === l.code ? 'active' : ''}`}
            aria-pressed={lang === l.code}
            onClick={() => setLang(l.code)}
          >
            {l.nativeName}
          </button>
        ))}
      </div>

      {/* Category filters */}
      <div className="chips-row" style={{ marginBottom: '.75rem' }} role="group" aria-label="Category">
        <button className={`chip ${!category ? 'active' : ''}`} aria-pressed={!category}
          onClick={() => setCategory('')}>
          All
        </button>
        {store.categories.map((c) => (
          <button
            key={c.slug}
            className={`chip ${category === c.slug ? 'active' : ''}`}
            aria-pressed={category === c.slug}
            onClick={() => setCategory(c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Objective for the selected module (category) */}
      {catObj && (
        <div className="card" style={{ padding: '.9rem 1.1rem', marginBottom: '1rem' }}>
          <div className="module-head" style={{ marginBottom: '.25rem' }}>
            <h2 style={{ fontSize: '1rem' }}>{catObj.name}</h2>
            <Link to="/phrasebook" className="btn btn-quiet" style={{ minHeight: 32, fontSize: '.8rem' }}
              onClick={() => setCategory('')}>
              <Icon name="close" size={14} /> Clear
            </Link>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Objective: {catObj.description}
          </p>
        </div>
      )}

      {/* Immersion: one page-level tap unfolds every familiar line */}
      {stage === 'immersion' && (
        <div className="row" style={{ marginBottom: '.75rem' }}>
          <button
            className="btn btn-secondary"
            aria-pressed={revealedAll}
            onClick={() => setRevealedAll((v) => !v)}
            style={{ minHeight: 40, fontSize: '.85rem' }}
          >
            <Icon name={revealedAll ? 'close' : 'help'} size={15} />
            {revealedAll ? 'Hide English' : 'Show English everywhere'}
          </button>
        </div>
      )}

      {/* Search + favorites toggle */}
      <div className="row" style={{ marginBottom: '1rem', gap: '.5rem' }}>
        <label className="visually-hidden" htmlFor="learn-search">{t('common.search')}</label>
        <input
          id="learn-search"
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('phrasebook.searchPlaceholder')}
          style={{ flex: 1 }}
        />
        <button
          className={`btn ${showFavs ? 'btn-primary' : 'btn-secondary'}`}
          aria-pressed={showFavs}
          onClick={() => setShowFavs(!showFavs)}
        >
          <Icon name="star" size={16} /> Favorites
        </button>
      </div>

      {/* Phrase list */}
      {loading ? (
        <Skeleton lines={6} />
      ) : filtered.length === 0 ? (
        <Empty
          title="No phrases found"
          body={showFavs ? 'No favorites here yet. Star phrases to save them for review.' : t('phrasebook.empty')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          {filtered.map((p) => {
            const tr = p.translations.find((x) => x.languageCode === lang) ?? p.translations[0];
            const isFav = favorites.some((f) => f.phraseId === p.id && f.languageCode === lang);
            const familiarOpen = !foldsFamiliar
              || revealedAll
              || revealed.includes(p.id);
            return (
              <div key={p.id} className="phrase-card">
                {familiarOpen && (
                  <div className="phrase-en" style={foldsFamiliar ? { order: 2 } : undefined}>
                    {p.isQuestion && <Icon name="help" size={14} className="phrase-q" />}
                    {p.baseText}
                    {p.cardType === 'PAIN_SCALE' && (
                      <span className="badge badge-patient" style={{ marginLeft: '.4rem' }}>Pain Scale</span>
                    )}
                  </div>
                )}
                {tr && (
                  <div style={{ order: foldsFamiliar ? 1 : 0 }}>
                    <div className="phrase-trans" style={{ fontSize: '1rem', fontWeight: 600 }}>
                      {tr.text}
                    </div>
                    {tr.romanization && <div className="phrase-roman">{tr.romanization}</div>}
                  </div>
                )}
                {foldsFamiliar && stage === 'focus' && (
                  <button
                    className="reveal-btn"
                    aria-expanded={familiarOpen}
                    style={{ order: 3 }}
                    onClick={() => toggleReveal(p.id)}
                  >
                    <Icon name={familiarOpen ? 'close' : 'help'} size={13} />
                    {familiarOpen ? 'Hide English' : 'Show English'}
                  </button>
                )}
                <div className="phrase-actions" style={{ order: foldsFamiliar ? 4 : 0 }}>
                  <button
                    className={`star-btn ${isFav ? 'active' : ''}`}
                    onClick={() => toggleFav(p.id)}
                    aria-label={isFav ? `Remove ${p.baseText} from favorites` : `Save ${p.baseText} for review`}
                    aria-pressed={isFav}
                  >
                    <Icon name="star" size={18} />
                  </button>
                  {tr && (
                    <SpeakButton
                      text={tr.romanization || tr.text}
                      ttsLocale={langObj?.ttsLocale ?? 'es-MX'}
                      label={tr.text}
                    />
                  )}
                  {tr?.professionallyReviewed && (
                    <span className="badge badge-library" style={{ marginLeft: 'auto' }}>Reviewed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
