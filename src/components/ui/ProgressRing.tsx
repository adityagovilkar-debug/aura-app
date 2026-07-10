interface ProgressRingProps {
  value: number;
  max: number;
  color: string;
  /** Ring turns this color when value exceeds max (e.g. over the calorie limit). */
  overColor?: string;
  size?: number;
  stroke?: number;
  label: string;
  /** Big number shown in the center. */
  display: string;
  sub: string;
}

export function ProgressRing({
  value, max, color, overColor, size = 156, stroke = 11, label, display, sub,
}: ProgressRingProps) {
  const over = overColor !== undefined && value > max;
  const ringColor = over ? overColor : color;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * pct;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="rgba(110,180,255,0.1)" strokeWidth={stroke}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            style={{
              filter: `drop-shadow(0 0 6px ${ringColor})`,
              transition: 'stroke-dasharray 0.6s cubic-bezier(0.3, 0.8, 0.3, 1), stroke 0.3s ease',
            }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="mono" style={{ fontSize: size / 6.2, fontWeight: 700, color: ringColor }}>
            {display}
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
