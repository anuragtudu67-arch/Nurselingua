// Initials avatar. The product deliberately uses no <img> imagery (see
// tools/verify-ui.mjs), so identity is shown as initials on a teal mark, with
// the same treatment in the shell and in Settings. Purely decorative here: the
// adjacent name carries the accessible label.
export function initials(name?: string | null, email?: string | null): string {
  const source = (name || email || '').trim();
  if (!source) return 'N';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return 'N';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Avatar({ name, email, size = 36 }: {
  name?: string | null; email?: string | null; size?: number;
}) {
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials(name, email)}
    </span>
  );
}
