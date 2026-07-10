// Shared Recharts styling so every chart matches the AURA theme.

export const COLORS = {
  cyan: '#22d3ee',
  magenta: '#e879f9',
  lime: '#a3e635',
  amber: '#fbbf24',
  red: '#fb7185',
  blue: '#60a5fa',
  muted: '#8b97ad',
  grid: 'rgba(110,180,255,0.1)',
};

export const tooltipProps = {
  contentStyle: {
    background: '#0d1326',
    border: '1px solid rgba(110,180,255,0.32)',
    borderRadius: 10,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    color: '#e6edf7',
  },
  labelStyle: { color: '#8b97ad', marginBottom: 4 },
  cursor: { fill: 'rgba(110,180,255,0.06)' },
};

export const axisProps = {
  stroke: 'rgba(110,180,255,0.2)',
  tick: { fill: '#8b97ad', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" },
  tickLine: false as const,
  axisLine: false as const,
};
