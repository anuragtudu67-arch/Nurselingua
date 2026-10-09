// The four-stage support control: Full Support, Guided Blend, Target Focus,
// Immersion. A reversible preference, never a score. Edits the language
// profile passed in, or the account-wide default when lang is null.
import { useLocale } from '../i18n/locale';
import {
  getStage, setStage, getDefaultStage, setDefaultStage, STAGES, type Stage,
} from '../state/prefs';

export default function StageControl({ lang, label }: {
  lang: string | null;
  label?: string;
}) {
  const { t } = useLocale();
  const current: Stage = lang ? getStage(lang) : getDefaultStage();
  const idx = STAGES.findIndex((s) => s.id === current);
  const choose = (s: Stage) => (lang ? setStage(lang, s) : setDefaultStage(s));

  return (
    <div>
      <p className="label" style={{ marginBottom: '.4rem' }}>{label ?? t('stage.title')}</p>
      <div className="stage-track" role="group" aria-label={label ?? t('stage.title')}>
        {STAGES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`stage-step${i < idx ? ' done' : ''}${i === idx ? ' now' : ''}`}
            aria-pressed={current === s.id}
            onClick={() => choose(s.id)}
          >
            <span className="stage-dot" aria-hidden="true">{i + 1}</span>
            <span className="stage-label">{t(s.nameKey)}</span>
          </button>
        ))}
      </div>
      <p className="stage-desc">{t(STAGES[idx].descKey)}</p>
      <p className="tiny muted" style={{ marginTop: '.35rem' }}>{t('stage.help')}</p>
    </div>
  );
}
