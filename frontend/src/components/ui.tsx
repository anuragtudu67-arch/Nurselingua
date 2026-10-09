// Shared Ningua components: sheets, toasts, states, native-voice audio,
// recorder with explicit states, first-run disclaimer.
import React, { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n/locale';
import { Icon } from './icons';

// ---------- toast ----------
type ToastFn = (msg: string) => void;
export const ToastCtx = React.createContext<ToastFn>(() => undefined);
export const useToast = () => React.useContext(ToastCtx);
export function ToastHost({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  const id = useRef(0);
  const push: ToastFn = (msg) => {
    const i = ++id.current;
    setItems((s) => [...s, { id: i, msg }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== i)), 3400);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div className="toast" key={t.id}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- sheet ----------
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const wide = typeof window !== 'undefined' && window.innerWidth > 900;
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => { window.removeEventListener('keydown', h); prev?.focus?.(); };
  }, [onClose]);
  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div ref={panel} tabIndex={-1} className={wide ? 'sheet side' : 'sheet bottom'}
        role="dialog" aria-modal="true" aria-label={title}>
        <div className="between">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="btn btn-quiet" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>
        </div>
        <div style={{ marginTop: '0.75rem' }}>{children}</div>
      </div>
    </>
  );
}

export function Confirm({ title, body, confirmLabel, onConfirm, onClose }: {
  title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div className="modal" role="alertdialog" aria-modal="true" aria-label={title}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p className="muted">{body}</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onConfirm(); onClose(); }} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </>
  );
}

// ---------- states ----------
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden="true" style={{ display: 'grid', gap: '0.6rem' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div className="sk" key={i} style={{ height: i === 0 ? 28 : 16, width: `${100 - i * 12}%` }} />
      ))}
    </div>
  );
}
export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty"><h3 style={{ marginBottom: 4 }}>{title}</h3><p className="muted">{body}</p>{action}</div>;
}
export function ErrorBox({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  const { t } = useLocale();
  return (
    <div className="error-box" role="alert">
      <h3 style={{ margin: '0 0 4px' }}>{title}</h3>
      <p className="muted small">{body}</p>
      {onRetry && <button className="btn btn-secondary" onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  );
}

// ---------- native-voice audio player ----------
/** Plays text with the language's native TTS locale voice at a comfortable rate. */
export function SpeakButton({ text, ttsLocale, rate = 0.8, label }: {
  text: string; ttsLocale: string; rate?: number; label: string;
}) {
  const [playing, setPlaying] = useState(false);
  const { t } = useLocale();
  const play = () => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = ttsLocale;                 // native voice: es-MX, hi-IN, bn-IN, ar-SA…
      u.rate = rate;                      // slow default for patient-facing audio
      u.onend = () => setPlaying(false);
      u.onerror = () => setPlaying(false);
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      setPlaying(true);
      // Safety net: some engines never fire onend.
      setTimeout(() => setPlaying(false), Math.min(20000, 2500 + text.length * 90));
    } catch { setPlaying(false); }
  };
  return (
    <button className="btn btn-secondary speak-btn" onClick={play}
      aria-label={`${t('common.play')}: ${label}`} aria-pressed={playing}>
      <Icon name="speaker" size={16} /> {playing ? t('common.playing') : t('common.play')}
    </button>
  );
}

// ---------- first-run disclaimer ----------
export function FirstRunDisclaimer() {
  const { t } = useLocale();
  const KEY = 'nurselingua-disclaimer-ok';
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { setOpen(localStorage.getItem(KEY) !== '1'); } catch { setOpen(false); }
  }, []);
  if (!open) return null;
  const dismiss = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ }
    setOpen(false);
  };
  return (
    <div className="sheet-back" style={{ zIndex: 70 }}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-label="Scope of use">
        <h2 style={{ marginTop: 0 }}>Before you begin</h2>
        <p>{t('disclaimer.body')}</p>
        <p className="small muted">
          Ningua is a communication aid for routine interactions, not a medical
          device and not a diagnosis tool. For informed consent, serious news, or any
          critical conversation, use a professional interpreter.
        </p>
        <button className="btn btn-primary btn-block" onClick={dismiss}>I understand</button>
      </div>
    </div>
  );
}

// ---------- mic recorder (real capture; graceful without permission) ----------
export type RecState = 'idle' | 'recording' | 'ready' | 'failed';
export function MicRecorder({ onRecorded, hint }: {
  onRecorded: (blob: Blob | null) => void; hint?: string;
}) {
  const [st, setSt] = useState<RecState>('idle');
  const [secs, setSecs] = useState(0);
  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  useEffect(() => {
    if (st !== 'recording') return;
    const timer = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [st]);

  const start = async () => {
    setSecs(0); chunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        setSt('ready');
        onRecorded(blob.size > 0 ? blob : null);
      };
      media.current = rec;
      rec.start();
      setSt('recording');
    } catch {
      setSt('failed');
      onRecorded(null);
    }
  };
  const stop = () => {
    if (media.current && media.current.state === 'recording') media.current.stop();
  };

  const label = st === 'recording' ? `Listening (${secs}s). Tap to finish.`
    : st === 'ready' ? 'Recorded. Tap to record again.'
    : st === 'failed' ? 'Microphone unavailable. Please type instead.'
    : (hint ?? 'Tap to record the patient');
  return (
    <div style={{ textAlign: 'center', padding: '0.75rem 0' }}>
      <button className={`rec-btn ${st === 'recording' ? 'recording' : ''}`} onClick={st === 'recording' ? stop : start}
        aria-label={label} aria-pressed={st === 'recording'} disabled={st === 'failed'}>
        {st === 'recording' ? <Icon name="stop" size={22} /> : <Icon name="mic" size={26} />}
      </button>
      <p className="small muted" role="status">{label}</p>
    </div>
  );
}
