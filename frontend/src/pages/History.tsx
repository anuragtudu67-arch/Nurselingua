// Progress: this week by default, with an all-time view. Every number is real:
// conversation counts and turns come from your conversation list with their
// timestamps, totals and pipeline health come from GET /usage on the backend.
// The bar chart is a styled table, so screen readers get the same evidence as
// sighted users; bars are decorative. Loading, empty, and error states are
// explicit. No precision the data does not support, no surveillance tone.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { useLocale } from '../i18n/locale';
import { Skeleton, Empty, Confirm, ErrorBox } from '../components/ui';
import { Icon } from '../components/icons';
import type { Conversation, Usage } from '../api/client';
import { LANGUAGES } from '../api/mockData';

function startOfWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d.getTime();
}

type Range = 'week' | 'all';

export default function History() {
  const { token } = useAuth();
  const store = useStore();
  const { t } = useLocale();

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [usageState, setUsageState] = useState<'loading' | 'ok' | 'error' | 'offline'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [range, setRange] = useState<Range>('week');
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);

  const langs = store.offline ? LANGUAGES : store.languages;

  const load = useCallback(() => {
    setLoading(true);
    store.listConversations(token)
      .then((c) => { setConvs(c); setLoading(false); })
      .catch(() => { setConvs([]); setLoading(false); });
    setUsageState('loading');
    store.usage(token)
      .then((u) => { setUsage(u); setUsageState(u ? 'ok' : 'offline'); })
      .catch(() => { setUsage(null); setUsageState('error'); });
  }, [store, token]);

  useEffect(() => { load(); }, [load, attempt]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await store.deleteConversation(deleteTarget.id, token);
      setConvs((c) => c.filter((x) => x.id !== deleteTarget.id));
    } catch { /* the row stays; next refresh resyncs */ }
    setDeleteTarget(null);
  };

  const weekStart = startOfWeek();
  const weekConvs = convs.filter((c) =>
    new Date(c.lastActivityAt ?? c.startedAt ?? 0).getTime() >= weekStart);
  const scopeConvs = range === 'week' ? weekConvs : convs;
  const scopeTurns = scopeConvs.reduce((sum, c) => sum + c.turnCount, 0);
  const scopeLangs = [...new Set(scopeConvs.map((c) => c.patientLanguage))];

  // Language-pair evidence for the visible scope.
  const pairCounts = new Map<string, number>();
  scopeConvs.forEach((c) => {
    const pair = `${c.nurseLanguage}-${c.patientLanguage}`;
    pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
  });
  const pairs = [...pairCounts.entries()].sort((a, b) => b[1] - a[1]);
  const pairLabel = (pair: string) => {
    const [from, to] = pair.split('-');
    const f = langs.find((l) => l.code === from);
    const g = langs.find((l) => l.code === to);
    return `${f?.name ?? from} to ${g?.name ?? to}`;
  };

  const pct = (n: number) =>
    scopeConvs.length === 0 ? 0 : Math.round((n / scopeConvs.length) * 100);
  const topPair = pairs[0];

  return (
    <div className="page">
      <div className="module-head">
        <h1 className="title" style={{ marginBottom: 0 }}>{t('nav.history')}</h1>
        <div className="seg" role="radiogroup" aria-label="Time range" style={{ marginBottom: 0 }}>
          <button role="radio" aria-checked={range === 'week'} onClick={() => setRange('week')}>
            This week
          </button>
          <button role="radio" aria-checked={range === 'all'} onClick={() => setRange('all')}>
            All time
          </button>
        </div>
      </div>
      <p className="muted small" style={{ marginBottom: '1.25rem' }}>
        {range === 'week'
          ? 'Monday to today, from your conversations.'
          : 'Everything recorded on your account so far.'}
      </p>

      {loading ? (
        <Skeleton lines={6} />
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
        <>
          {/* headline numbers, scoped */}
          <section aria-label="Overview" style={{ marginBottom: '1.5rem' }}>
            <div className="grid-3">
              <div className="stat">
                <div className="stat-value" style={{ color: 'var(--accent)' }}>{scopeConvs.length}</div>
                <div className="stat-label">Conversations</div>
              </div>
              <div className="stat">
                <div className="stat-value" style={{ color: 'var(--nurse)' }}>{scopeTurns}</div>
                <div className="stat-label">Turns in them</div>
              </div>
              <div className="stat">
                <div className="stat-value" style={{ color: 'var(--patient)' }}>{scopeLangs.length}</div>
                <div className="stat-label">Patient languages</div>
              </div>
            </div>

            {range === 'all' && usage && (
              <p className="small muted" style={{ marginTop: '.6rem' }}>
                Backend totals: {usage.sessions} sessions, {usage.turns} turns.
              </p>
            )}
            {usageState === 'error' && (
              <p className="small" role="status" style={{ color: 'var(--warning)', marginTop: '.5rem' }}>
                Backend totals are unavailable right now. The numbers above come from
                your conversation list.
              </p>
            )}
            {usageState === 'offline' && (
              <p className="small muted" style={{ marginTop: '.5rem' }}>
                Offline demo mode: totals and pipeline health need the live backend.
              </p>
            )}
          </section>

          {/* language evidence, scoped, with an accessible chart */}
          <section aria-labelledby="pairs-h" style={{ marginBottom: '1.5rem' }}>
            <h2 className="section-h" id="pairs-h" style={{ marginTop: 0 }}>
              Languages in {range === 'week' ? 'your week' : 'your history'}
            </h2>
            {pairs.length === 0 ? (
              <p className="small muted">No conversations in this range yet.</p>
            ) : (
              <>
                <p className="visually-hidden">
                  {topPair
                    ? `${pairLabel(topPair[0])} is your most used direction, with `
                      + `${topPair[1]} of ${scopeConvs.length} conversations.`
                    : ''}
                </p>
                <div className="card" style={{ padding: '.75rem 1rem' }}>
                  <table className="table">
                    <caption className="visually-hidden">
                      Conversations by language direction, {range === 'week' ? 'this week' : 'all time'}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Direction</th>
                        <th scope="col">Conversations</th>
                        <th scope="col" style={{ width: '40%' }}>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pairs.map(([pair, count]) => (
                        <tr key={pair}>
                          <td>{pairLabel(pair)}</td>
                          <td style={{ fontWeight: 700 }}>{count}</td>
                          <td>
                            <span className="bar-row" style={{ padding: 0 }}>
                              <span className="small muted" aria-hidden="true" style={{ minWidth: 40 }}>
                                {pct(count)}%
                              </span>
                              <span className="bar-track" aria-hidden="true">
                                <span className="bar-fill" style={{ width: `${pct(count)}%` }} />
                              </span>
                              <span className="visually-hidden">{pct(count)} percent</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* backend pipeline health: real telemetry, only when available */}
          {usage && (
            <section aria-labelledby="pipe-h" style={{ marginBottom: '1.5rem' }}>
              <h2 className="section-h" id="pipe-h" style={{ marginTop: 0 }}>How the helpers are doing</h2>
              <div className="grid-3">
                <PipelineCard label="Speech to text" stat={usage.stt} />
                <PipelineCard label="Translation" stat={usage.mt} />
                <PipelineCard label="Voice playback" stat={usage.tts} />
              </div>
            </section>
          )}

          {/* top phrases: all-time evidence from the backend */}
          {usage && usage.topPhrases.length > 0 && (
            <section aria-labelledby="top-h" style={{ marginBottom: '1.5rem' }}>
              <h2 className="section-h" id="top-h" style={{ marginTop: 0 }}>Most used phrases</h2>
              <div className="card" style={{ padding: '.75rem 1rem' }}>
                <table className="table">
                  <caption className="visually-hidden">All-time most used phrases</caption>
                  <thead>
                    <tr>
                      <th scope="col">Phrase</th>
                      <th scope="col">Times used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.topPhrases.slice(0, 5).map((p) => (
                      <tr key={p.phraseId}>
                        <td>{p.baseText}</td>
                        <td style={{ fontWeight: 700 }}>{p.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* conversations */}
          <section>
            <h2 className="section-h">Conversations</h2>
            <p className="small muted" style={{ marginBottom: '1rem' }}>{t('history.autoExpiry')}</p>
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
                      aria-label={`${t('history.delete')}: ${lang?.name ?? c.patientLanguage} conversation`}
                      style={{ color: 'var(--error)', minHeight: 36 }}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {usageState === 'error' && (
            <div style={{ marginTop: '1.25rem' }}>
              <ErrorBox
                title="Backend totals could not load"
                body="Your conversations are all here. Only the totals from the server are missing."
                onRetry={() => setAttempt((a) => a + 1)}
              />
            </div>
          )}
        </>
      )}

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

function PipelineCard({ label, stat }: {
  label: string;
  stat: { total: number; failures: number; failureRate: number; avgLatencyMs: number | null };
}) {
  if (stat.total === 0) {
    return (
      <div className="stat">
        <div className="stat-label">{label}</div>
        <div className="tiny muted">No activity yet</div>
      </div>
    );
  }
  return (
    <div className="stat">
      <div className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--success)' }}>
        {stat.total - stat.failures} of {stat.total}
      </div>
      <div className="stat-label">{label}</div>
      <div className="tiny muted">
        {stat.failures === 0
          ? 'All completed'
          : `${stat.failures} failed (${Math.round(stat.failureRate * 100)}%)`}
        {stat.avgLatencyMs != null && `, ${Math.round(stat.avgLatencyMs)} ms average`}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
