export const PALETTE = {
  slate: {
    "50": "#f8fafc", "100": "#f1f5f9", "200": "#e2e8f0",
    "300": "#cbd5e1", "400": "#94a3b8", "500": "#64748b",
    "600": "#475569", "700": "#334155", "800": "#1e293b",
    "900": "#0f172a", "950": "#020617",
  },
  gray: {
    "50": "#f9fafb", "100": "#f3f4f6", "200": "#e5e7eb",
    "300": "#d1d5db", "400": "#9ca3af", "500": "#6b7280",
    "600": "#4b5563", "700": "#374151", "800": "#1f2937",
    "900": "#111827", "950": "#030712",
  },
  red: {
    "50": "#fef2f2", "100": "#fee2e2", "200": "#fecaca",
    "300": "#fca5a5", "400": "#f87171", "500": "#ef4444",
    "600": "#dc2626", "700": "#b91c1c", "800": "#991b1b",
    "900": "#7f1d1d", "950": "#450a0a",
  },
  amber: {
    "50": "#fffbeb", "100": "#fef3c7", "200": "#fde68a",
    "300": "#fcd34d", "400": "#fbbf24", "500": "#f59e0b",
    "600": "#d97706", "700": "#b45309", "800": "#92400e",
    "900": "#78350f", "950": "#451a03",
  },
  green: {
    "50": "#f0fdf4", "100": "#dcfce7", "200": "#bbf7d0",
    "300": "#86efac", "400": "#4ade80", "500": "#22c55e",
    "600": "#16a34a", "700": "#15803d", "800": "#166534",
    "900": "#14532d", "950": "#052e16",
  },
  blue: {
    "50": "#eff6ff", "100": "#dbeafe", "200": "#bfdbfe",
    "300": "#93c5fd", "400": "#60a5fa", "500": "#3b82f6",
    "600": "#2563eb", "700": "#1d4ed8", "800": "#1e40af",
    "900": "#1e3a8a", "950": "#172554",
  },
  indigo: {
    "50": "#eef2ff", "100": "#e0e7ff", "200": "#c7d2fe",
    "300": "#a5b4fc", "400": "#818cf8", "500": "#6366f1",
    "600": "#4f46e5", "700": "#4338ca", "800": "#3730a3",
    "900": "#312e81", "950": "#1e1b4b",
  },
  violet: {
    "50": "#f5f3ff", "100": "#ede9fe", "200": "#ddd6fe",
    "300": "#c4b5fd", "400": "#a78bfa", "500": "#8b5cf6",
    "600": "#7c3aed", "700": "#6d28d9", "800": "#5b21b6",
    "900": "#4c1d95", "950": "#2e1065",
  },
} as const;

export type PaletteName = keyof typeof PALETTE;
export type Shade = keyof (typeof PALETTE)[PaletteName];

const roles = new Set(["accent", "neutral", "success", "warning", "danger"]);

export function registerColorRole(name: string): void {
  roles.add(name);
}

export function colorValue(name: string, shade: string): string | undefined {
  const palette = PALETTE[name as PaletteName];
  if (palette && shade in palette) {
    return palette[shade as Shade];
  }
  if (!roles.has(name) || !/^\d+$/.test(shade)) return;
  return `var(--vrui-color-${name}-${shade})`;
}
