// Phrasebook: reviewed nursing phrases across patient languages, with search, category
// pills, language switcher, favorites, one-tap native audio.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { SpeakButton, Skeleton, Empty } from '../components/ui';
import { Icon } from '../components/icons';
import type { Phrase, Favorite } from '../api/client';
import { LANGUAGES } from '../api/mockData';

export default function Phrasebook() {
  const { token } = useAuth();
  const store = useStore();
  const { t } = useLocale();
  const [params, setParams] = useSearchParams();

  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lang, setLang] = useState(params.get('lang') ?? 'es');
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [showFavs, setShowFavs] = useState(false);

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
    } catch { /* ignore */ }
  };

  const filtered = showFavs
    ? phrases.filter((p) => favorites.some((f) => f.phraseId === p.id && f.languageCode === lang))
    : phrases;

  const langObj = langs.find((l) => l.code === lang);

  return (
    <div className="page">
      <h1 className="title" style={{ marginBottom: '.5rem' }}>Phrasebook</h1>
      <p className="muted small" style={{ marginBottom: '1rem' }}>
        {filtered.length} reviewed phrases · {langObj?.nativeName ?? lang}
      </p>

      {/* Language switcher */}
      <div className="chips-row" style={{ marginBottom: '.75rem' }}>
        {langs.filter((l) => l.code !== 'en').map((l) => (
          <button
            key={l.code}
            className={`chip ${lang === l.code ? 'active' : ''}`}
            onClick={() => setLang(l.code)}
          >
            {l.nativeName}
          </button>
        ))}
      </div>

      {/* Category pills */}
      <div className="chips-row" style={{ marginBottom: '.75rem' }}>
        <button
          className={`chip ${!category ? 'active' : ''}`}
          onClick={() => setCategory('')}
        >
          All
        </button>
        {store.categories.map((c) => (
          <button
            key={c.slug}
            className={`chip ${category === c.slug ? 'active' : ''}`}
            onClick={() => setCategory(c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Search + Favs toggle */}
      <div className="row" style={{ marginBottom: '1rem', gap: '.5rem' }}>
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('phrasebook.searchPlaceholder')}
          style={{ flex: 1 }}
        />
        <button
          className={`btn ${showFavs ? 'btn-primary' : 'btn-secondary'}`}
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
          body={showFavs ? 'No favorites yet. Star phrases to save them here.' : t('phrasebook.empty')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          {filtered.map((p) => {
            const tr = p.translations.find((t) => t.languageCode === lang) ?? p.translations[0];
            const isFav = favorites.some((f) => f.phraseId === p.id && f.languageCode === lang);
            return (
              <div key={p.id} className="phrase-card">
                <div className="phrase-en">
                  {p.isQuestion && <Icon name="help" size={14} className="phrase-q" />}
                  {p.baseText}
                  {p.cardType === 'PAIN_SCALE' && (
                    <span className="badge badge-patient" style={{ marginLeft: '.4rem' }}>Pain Scale</span>
                  )}
                </div>
                {tr && (
                  <>
                    <div className="phrase-trans">{tr.text}</div>
                    {tr.romanization && <div className="phrase-roman">{tr.romanization}</div>}
                  </>
                )}
                <div className="phrase-actions">
                  <button
                    className={`star-btn ${isFav ? 'active' : ''}`}
                    onClick={() => toggleFav(p.id)}
                    aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
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
