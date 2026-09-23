/** Shared color, type, and spacing. Web CSS variables mirror these values. */

export const color = {
  ink: "#07080a",
  panel: "#0e1116",
  card: "#141821",
  line: "#262c38",
  cream: "#f3efe6",
  mute: "#8d95a8",
  acid: "#d6ff3f",
  sky: "#5cc8ff",
  violet: "#8b7cff",
  heat: "#ff6b4a",
  gold: "#ffc857",
  paper: "#f6f1e7",
  inkOnPaper: "#1a1814",
} as const;

export const space = {
  tap: 44,
  radius: 24,
  page: 16,
} as const;

export const type = {
  sans: "Outfit, system-ui, sans-serif",
  display: "Syne, Outfit, system-ui, sans-serif",
  mono: "Geist Mono, ui-monospace, monospace",
} as const;
