// Home: the dominant action is starting a conversation. Active conversations,
// category tiles, recent phrases, and a quick weekly usage snapshot.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { SpeakButton, Skeleton, Empty } from '../components/ui';
import { Icon, type IconName } from '../components/icons';
import type { Conversation, Phrase, Recent, Language } from '../api/client';
import { LANGUAGES } from '../api/mockData';

const CAT_ICONS: Record<string, IconName> = {
  symptoms: 'pulse', medication: 'doc', pain: 'alert', allergies: 'shield', patient_care: 'heart',
};

export default function Home() {
  const { token } = useAuth();
  const store = useStore();
  const { t } = useLocale();
  const nav = useNavigate();

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [recentPhrases, setRecentPhrases] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newConvLang, setNewConvLang] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([
      store.listConversations(token),
      store.listRecents(token),
    ]).then(([c, r]) => {
      if (live) { setConvs(c); setRecentPhrases(r); setLoading(false); }
    }).catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [store, token]);

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

  const langs = store.offline ? LANGUAGES : store.languages;
  const patientLangs = langs.filter((l) => l.code !== 'en');

  // recent phrase details for display
  const recentIds = recentPhrases.slice(0, 6).map((r) => r.phraseId);
  const [recentDetails, setRecentDetails] = useState<Phrase[]>([]);
  useEffect(() => {
    if (recentIds.length === 0) return;
    // For demo, we fetch from the list; in production this would be a batch endpoint.
    store.listPhrases({ lang: 'es' }, token).then((all) => {
      setRecentDetails(all.filter((p) => recentIds.includes(p.id)).slice(0, 6));
    }).catch(() => {});
  }, [recentIds.join(','), store, token]);

  return (
    <div className="page">
      {/* Hero CTA */}
      <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
        <h1 className="title" style={{ fontSize: '1.6rem' }}>Who are you caring for today?</h1>
        <p className="muted" style={{ margin: '.5rem 0 1.25rem' }}>
          Pick a patient language and start a conversation.
        </p>
        <div className="row" style={{ justifyContent: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
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
      </div>

      {/* Active conversations */}
      {loading ? (
        <Skeleton lines={4} />
      ) : (
        <>
          {convs.length > 0 && (
            <section>
              <h2 className="section-h">Active Conversations</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.5rem' }}>
                {convs.slice(0, 5).map((c) => {
                  const lang = langs.find((l) => l.code === c.patientLanguage);
                  return (
                    <Link
                      key={c.id}
                      to={`/conversation/${c.id}`}
                      className="card"
                      style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}
                    >
                      <span className="badge badge-patient">{lang?.nativeName ?? c.patientLanguage}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '.95rem' }}>
                          {c.title ?? `Conversation with ${lang?.name ?? c.patientLanguage} patient`}
                        </div>
                        <div className="small muted">
                          {c.turnCount} turns · {c.lastActivityAt ? timeAgo(c.lastActivityAt) : 'just now'}
                        </div>
                      </div>
                      <span style={{ color: 'var(--ink-faint)' }}><Icon name="arrowRight" size={16} /></span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Category tiles */}
          <section>
            <h2 className="section-h">{t('home.categories')}</h2>
            <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
              {store.categories.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/phrasebook?category=${cat.slug}`}
                  className="tile"
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.3rem' }}
                >
                  <span className="tile-ico" aria-hidden="true">
                    <Icon name={CAT_ICONS[cat.slug] ?? 'clipboard'} size={26} />
                  </span>
                  <strong>{cat.name}</strong>
                  <span className="small muted">{cat.description}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Recent phrases */}
          <section>
            <h2 className="section-h">{t('home.recents')}</h2>
            {recentDetails.length === 0 ? (
              <Empty title="No recent phrases" body={t('home.noRecents')} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
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
        </>
      )}
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
