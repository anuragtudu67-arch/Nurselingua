// New Conversation: pick a patient language, review past conversations, start a new one.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { Skeleton } from '../components/ui';
import { Icon } from '../components/icons';
import type { Conversation } from '../api/client';
import { LANGUAGES } from '../api/mockData';

export default function NewConversation() {
  const { token } = useAuth();
  const store = useStore();
  const { t } = useLocale();
  const nav = useNavigate();

  const [patientLang, setPatientLang] = useState('');
  const [creating, setCreating] = useState(false);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const langs = store.offline ? LANGUAGES : store.languages;
  const patientLangs = langs.filter((l) => l.code !== 'en');

  useEffect(() => {
    store.listConversations(token)
      .then((c) => { setConvs(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, [store, token]);

  const start = async () => {
    if (!patientLang || creating) return;
    setCreating(true);
    try {
      const conv = await store.createConversation(patientLang, token);
      nav(`/conversation/${conv.id}`);
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <h1 className="title" style={{ marginBottom: '.5rem' }}>New Conversation</h1>
      <p className="muted small" style={{ marginBottom: '1.5rem' }}>
        Pick the patient's language and begin translating.
      </p>

      {/* Language picker */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 className="onb-q">Patient language</h2>
        <div className="tile-grid" role="radiogroup" aria-label="Patient language">
          {patientLangs.map((l) => (
            <button
              key={l.code}
              className="tile"
              role="radio"
              aria-checked={patientLang === l.code}
              onClick={() => setPatientLang(l.code)}
            >
              <strong>{l.nativeName}</strong><br />
              <span className="small muted">{l.name}</span>
            </button>
          ))}
        </div>
        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: '1.25rem', maxWidth: 320 }}
          disabled={!patientLang || creating}
          onClick={start}
        >
          {creating ? 'Starting…' : (<>Start conversation <Icon name="arrowRight" size={16} /></>)}
        </button>
      </section>

      {/* Past conversations */}
      <section>
        <h2 className="section-h">Past Conversations</h2>
        {loading ? (
          <Skeleton lines={4} />
        ) : convs.length === 0 ? (
          <p className="muted small">No past conversations yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {convs.slice(0, 10).map((c) => {
              const lang = langs.find((l) => l.code === c.patientLanguage);
              return (
                <Link
                  key={c.id}
                  to={`/conversation/${c.id}`}
                  className="card"
                  style={{ textDecoration: 'none', padding: '.75rem 1rem', display: 'flex', alignItems: 'center', gap: '.75rem' }}
                >
                  <span className="badge badge-patient">{lang?.nativeName ?? c.patientLanguage}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '.9rem' }}>
                      {c.title ?? `${lang?.name ?? c.patientLanguage} conversation`}
                    </div>
                    <div className="small muted">{c.turnCount} turns</div>
                  </div>
                  <span style={{ color: 'var(--ink-faint)' }}><Icon name="arrowRight" size={16} /></span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
