// Inline SVG icon set. Decorative by default (aria-hidden); pass a `title`
// only when the icon is the sole content of an interactive control.

export type IconName =
  | 'home' | 'phrasebook' | 'history' | 'settings' | 'phone' | 'shield'
  | 'mic' | 'swap' | 'star' | 'check' | 'close' | 'alert' | 'arrowRight'
  | 'globe' | 'lock' | 'doc' | 'speaker' | 'clock' | 'stop'
  | 'help' | 'clipboard' | 'heart' | 'pulse' | 'trash';

const PATHS: Record<IconName, JSX.Element> = {
  home: <><path d="M4 10.4 12 3.6l8 6.8" /><path d="M6.2 9.4V19a1.4 1.4 0 0 0 1.4 1.4h3V15h2.8v5.4h3A1.4 1.4 0 0 0 17.8 19V9.4" /></>,
  phrasebook: <><path d="M5 5.2A1.8 1.8 0 0 1 6.8 3.4H19v17.2H6.8A1.8 1.8 0 0 1 5 18.8z" /><path d="M9 7.8h6.4M9 11.4h6.4M9 15h4" /></>,
  history: <><circle cx="12" cy="12" r="8.2" /><path d="M12 7.6V12l3 2" /></>,
  settings: <><path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9" /><circle cx="15" cy="7.5" r="2.1" /><circle cx="9" cy="16.5" r="2.1" /></>,
  phone: <path d="M6.4 3.4h2.9l1.5 4.3-2 1.4a11.6 11.6 0 0 0 5.7 5.7l1.4-2 4.3 1.5v2.9a1.9 1.9 0 0 1-2.1 1.9A16.4 16.4 0 0 1 4.5 5.5a1.9 1.9 0 0 1 1.9-2.1z" />,
  shield: <><path d="M12 3.2 19 6v6.1c0 4.4-2.9 7.5-7 8.7-4.1-1.2-7-4.3-7-8.7V6z" /><path d="M9.2 12.1l2 2 3.7-4" /></>,
  mic: <><path d="M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3z" /><path d="M5.8 11.4a6.2 6.2 0 0 0 12.4 0M12 17.6V21" /></>,
  swap: <><path d="M4 8.2h13.6l-3.4-3.4M20 15.8H6.4l3.4 3.4" /></>,
  star: <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />,
  check: <path d="M4.8 12.6l4.8 5L19.2 6.8" />,
  close: <path d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6" />,
  alert: <><path d="M12 4.2 21 19.6H3z" /><path d="M12 10v4.2M12 17.1h.01" /></>,
  arrowRight: <path d="M4.5 12h14M13 6.5l5.5 5.5L13 17.5" />,
  globe: <><circle cx="12" cy="12" r="8.4" /><path d="M3.6 12h16.8M12 3.6a15.5 15.5 0 0 1 0 16.8 15.5 15.5 0 0 1 0-16.8" /></>,
  lock: <><rect x="5.6" y="10.8" width="12.8" height="9.2" rx="1.8" /><path d="M9 10.8V8a3 3 0 0 1 6 0v2.8" /></>,
  doc: <><path d="M7 3.4h6.4L18.6 8.6V20.6H7z" /><path d="M13.2 3.4v5.2h5.2" /></>,
  speaker: <><path d="M11.4 5.6 6.8 9.6H3.6v5.2h3.2l4.6 4z" /><path d="M15.4 9.4a4.2 4.2 0 0 1 0 5.4M18 7a7.6 7.6 0 0 1 0 10.2" /></>,
  clock: <><circle cx="12" cy="12" r="8.2" /><path d="M12 7.6V12l3 2" /></>,
  stop: <rect x="7.5" y="7.5" width="9" height="9" rx="1.6" fill="currentColor" stroke="none" />,
  help: <><circle cx="12" cy="12" r="8.4" /><path d="M9.7 9.5a2.4 2.4 0 0 1 4.7.7c0 1.6-2.4 1.9-2.4 3.3" /><path d="M12 17.2h.01" /></>,
  clipboard: <><path d="M9.2 4.4h5.6v2.2H9.2z" /><path d="M9.2 5.2H7.1A1.6 1.6 0 0 0 5.5 6.8v11.4a1.6 1.6 0 0 0 1.6 1.6h9.8a1.6 1.6 0 0 0 1.6-1.6V6.8a1.6 1.6 0 0 0-1.6-1.6h-2.1" /><path d="M9 12.4h6M9 15.6h4" /></>,
  heart: <path d="M12 20.2s-7.2-4.4-7.2-9.2a4.2 4.2 0 0 1 7.2-2.9 4.2 4.2 0 0 1 7.2 2.9c0 4.8-7.2 9.2-7.2 9.2z" />,
  pulse: <path d="M3 12.4h4.2l2.4-6.2 3.6 12 2.4-5.8H21" />,
  trash: <><path d="M4.8 6.6h14.4" /><path d="M9.4 6.6V4.9h5.2v1.7" /><path d="M6.6 6.6 7.5 20a1.4 1.4 0 0 0 1.4 1.3h6.2A1.4 1.4 0 0 0 16.5 20l.9-13.4" /><path d="M10.4 10.6v6.8M13.6 10.6v6.8" /></>,
};

export function Icon({ name, size = 18, className, title }: {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
