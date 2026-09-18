// History: usage analytics plus the conversation list, with replay and delete.
// Shows sessions, turns, language pairs, top phrases, pipeline stats.
// Conversations auto-expire per retention setting.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { Skeleton, Empty, Confirm } from '../components/ui';
import { Icon } from '../components/icons';
import type { Conversation } from '../api/client';
import { LANGUAGES } from '../api/mockData';

export default function History() {
  const { token } = useAuth();
  const store = useStore();
  const { t } = useLocale();
  const nav = useNavigate();

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);

  const langs = store.offline ? LANGUAGES : store.languages;

  useEffect(() => {
    store.listConversations(token)
      .then((c) => { setConvs(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, [store, token]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await store.deleteConversation(deleteTarget.id, token);
      setConvs((c) => c.filter((x) => x.id !== deleteTarget.id));
    } catch { /* ignore */ }
    setDeleteTarget(null);
  };

  // Aggregate stats from conversations (demo analytics)
  const totalTurns = convs.reduce((sum, c) => sum + c.turnCount, 0);
  const langPairs = new Map<string, number>();
  convs.forEach((c) => {
    const pair = `${c.nurseLanguage}|${c.patientLanguage}`;
    langPairs.set(pair, (langPairs.get(pair) ?? 0) + 1);
  });
  const topPairs = [...langPairs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="page">
      <h1 className="title" style={{ marginBottom: '1rem' }}>History</h1>

      {/* Usage Analytics */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 className="section-h">Usage Overview</h2>
        <div className="grid-3" style={{ marginBottom: '1rem' }}>
          <div className="stat">
            <div className="stat-value" style={{ color: 'var(--nurse)' }}>{convs.length}</div>
            <div className="stat-label">Conversations</div>
          </div>
          <div className="stat">
            <div className="stat-value" style={{ color: 'var(--patient)' }}>{totalTurns}</div>
            <div className="stat-label">Total Turns</div>
          </div>
          <div className="stat">
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{langPairs.size}</div>
            <div className="stat-label">Language Pairs</div>
          </div>
        </div>

        {topPairs.length > 0 && (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '.75rem' }}>Top Language Pairs</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Count</th>
                  <th style={{ width: '40%' }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {topPairs.map(([pair, count]) => {
                  const pct = Math.round((count / convs.length) * 100);
                  const [from, to] = pair.split('|');
                  const fromLang = langs.find((l) => l.code === from);
                  const toLang = langs.find((l) => l.code === to);
                  return (
                    <tr key={pair}>
                      <td>
                        <span className="badge badge-nurse">{fromLang?.name ?? from}</span>
                        <span className="swap-sep"><Icon name="swap" size={13} /></span>
                        <span className="badge badge-patient">{toLang?.name ?? to}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{count}</td>
                      <td>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pipeline stats placeholder */}
        <div className="grid-3">
          <div className="stat">
            <div className="stat-value stat-ico"><Icon name="check" size={22} /></div>
            <div className="stat-label">STT</div>
            <div className="tiny muted">Speech to text</div>
          </div>
          <div className="stat">
            <div className="stat-value stat-ico"><Icon name="check" size={22} /></div>
            <div className="stat-label">Library Match</div>
            <div className="tiny muted">Phrasebook-first</div>
          </div>
          <div className="stat">
            <div className="stat-value stat-ico"><Icon name="check" size={22} /></div>
            <div className="stat-label">TTS</div>
            <div className="tiny muted">Native voice</div>
          </div>
        </div>
      </section>

      {/* Conversation list */}
      <section>
        <h2 className="section-h">Conversations</h2>
        <p className="small muted" style={{ marginBottom: '1rem' }}>{t('history.autoExpiry')}</p>

        {loading ? (
          <Skeleton lines={5} />
        ) : convs.length === 0 ? (
          <Empty
            title="No conversations yet"
            body={t('history.empty')}
            action={
              <Link to="/home" className="btn btn-primary" style={{ marginTop: '.75rem' }}>
                {t('home.start')} <Icon name="arrowRight" size={16} />
              </Link>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {convs.map((c) => {
              const lang = langs.find((l) => l.code === c.patientLanguage);
              return (
                <div key={c.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '.95rem' }}>
                      <span className="badge badge-patient" style={{ marginRight: '.3rem' }}>
                        {lang?.nativeName ?? c.patientLanguage}
                      </span>
                      {c.title ?? `${lang?.name ?? c.patientLanguage} conversation`}
                    </div>
                    <div className="small muted" style={{ marginTop: '.2rem' }}>
                      {c.turnCount} turns · {c.startedAt ? formatDate(c.startedAt) : ''}
                      {c.expiresAt && (
                        <span className="tiny" style={{ marginLeft: '.5rem' }}>
                          expires {formatDate(c.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link to={`/conversation/${c.id}`} className="btn btn-secondary" style={{ minHeight: 36, fontSize: '.82rem' }}>
                    Open
                  </Link>
                  <button
                    className="btn btn-quiet"
                    onClick={() => setDeleteTarget(c)}
                    aria-label={t('history.delete')}
                    style={{ color: 'var(--error)', minHeight: 36 }}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete confirmation */}
      {deleteTarget && (
        <Confirm
          title="Delete conversation?"
          body="This action cannot be undone. All turns in this conversation will be permanently removed."
          confirmLabel="Delete"
          onConfirm={doDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
