import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  casa: (<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" /></>),
  comer: (<><path d="M7 3v8" /><path d="M4 3v5a3 3 0 0 0 6 0V3" /><path d="M7 11v10" /><path d="M17 21V3c-2.2 1.2-3 3.6-3 7h3" /></>),
  ocio: (<><path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>),
  deporte: (<><path d="M6.5 6.5v11" /><path d="M17.5 6.5v11" /><path d="M3.5 9v6" /><path d="M20.5 9v6" /><path d="M6.5 12h11" /></>),
  personal: (<><path d="M5 8h14l-1 13H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>),
  efectivo: (<><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></>),
  ahorro: (<><path d="M12 21v-9" /><path d="M12 12c0-4 3-7 8-7 0 5-3 7-8 7z" /><path d="M12 14c0-3-2.5-5.5-7-5.5 0 4 2.5 5.5 7 5.5z" /></>),
  libre: (<path d="M12 3l2.3 5.2 5.7.6-4.3 3.8 1.3 5.6L12 15.3 7 18.2l1.3-5.6L4 8.8l5.7-.6L12 3z" />),
  // iconos de interfaz
  home: (<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /></>),
  list: (<><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>),
  jar: (<><path d="M7 4h10" /><path d="M8 4v3l-2 3v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-9l-2-3V4" /><path d="M6 13h12" /></>),
  sliders: (<><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>),
  chevron: <path d="m9 6 6 6-6 6" />,
  back: <path d="m15 6-6 6 6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  alert: (<><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17h.01" /></>),
  copy: (<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>),
  scale: (<><path d="M12 3v18" /><path d="M5 21h14" /><path d="M3 7h18" /><path d="m6 7-3 7a3 3 0 0 0 6 0L6 7z" /><path d="m18 7-3 7a3 3 0 0 0 6 0l-3-7z" /></>),
  undo: (<><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>),
};

export default function Icon({ name, size = 24, color = "currentColor", stroke = 2 }: { name: string; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name] ?? PATHS.libre}
    </svg>
  );
}

export function FamilyBox({ family, color, tint, size = 44 }: { family: string; color: string; tint: string; size?: number }) {
  return (
    <span className="famBox" style={{ width: size, height: size, background: tint }}>
      <Icon name={family} color={color} size={Math.round(size / 2)} />
    </span>
  );
}
