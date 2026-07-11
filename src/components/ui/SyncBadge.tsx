import { useSync, type SyncStatus } from '../../state/SyncProvider';

const META: Record<SyncStatus, { color: string; label: string }> = {
  'local-only': { color: '#8b97ad', label: 'Local only' },
  offline: { color: '#fb7185', label: 'Offline' },
  syncing: { color: '#22d3ee', label: 'Syncing…' },
  synced: { color: '#a3e635', label: 'Synced' },
  error: { color: '#fb7185', label: 'Sync error' },
};

/** Compact cloud-sync status dot + label. */
export function SyncBadge({ compact = false }: { compact?: boolean }) {
  const { status } = useSync();
  const m = META[status];
  return (
    <span className="row" style={{ gap: 7 }} title={`Cloud sync: ${m.label}`}>
      <span
        style={{
          width: 8, height: 8, borderRadius: 999, background: m.color,
          boxShadow: `0 0 8px ${m.color}`,
          animation: status === 'syncing' ? 'pulse 1s ease-in-out infinite' : undefined,
          flexShrink: 0,
        }}
      />
      {!compact && <span className="small" style={{ color: m.color }}>{m.label}</span>}
    </span>
  );
}
