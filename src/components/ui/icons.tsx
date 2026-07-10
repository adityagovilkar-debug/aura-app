// Small inline SVG icon set, all stroke-based so they inherit currentColor.

interface IconProps { size?: number; }

const base = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24',
  fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const IconDashboard = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

export const IconLog = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const IconCalendar = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M16 2v4M8 2v4M3 9.5h18" />
  </svg>
);

export const IconLibrary = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

export const IconReports = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 3 3 5-6" />
  </svg>
);

export const IconSettings = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
  </svg>
);

export const IconFlame = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 22c4.4 0 7-2.8 7-6.5 0-3-1.8-4.8-3.2-6.3C14.5 7.8 13.5 6 13.5 3c-3 2-4.2 4.6-4 7-1.2-.4-2-1.4-2.3-2.8C5.6 8.6 5 10.7 5 12.7 5 19 7.6 22 12 22Z" />
  </svg>
);

export const IconDrop = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 2.7 6.6 9.8a6.5 6.5 0 1 0 10.8 0Z" />
  </svg>
);

export const IconBolt = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5Z" />
  </svg>
);

export const IconPlus = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconTrash = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

export const IconEdit = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

export const IconChevronLeft = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><path d="m15 18-6-6 6-6" /></svg>
);

export const IconChevronRight = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><path d="m9 18 6-6-6-6" /></svg>
);
