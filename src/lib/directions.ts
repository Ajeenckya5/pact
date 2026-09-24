export type Tone = "light" | "dark";

export type DirectionPalette = {
  bg: string;
  surface: string;
  ink: string;
  mute: string;
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  line: string;
  done: string;
  partial: string;
  open: string;
  shadow: string;
  radius: string;
};

export type Direction = {
  id: string;
  name: string;
  explore: boolean;
  summary: string;
  display: string;
  body: string;
  light: DirectionPalette;
  dark: DirectionPalette;
};

const hearthLight: DirectionPalette = {
  bg: "#f6efe6",
  surface: "#fffaf4",
  ink: "#2c2118",
  mute: "#6f6256",
  primary: "#c24d32",
  onPrimary: "#fffaf4",
  secondary: "#3f6b4c",
  onSecondary: "#f3f7f1",
  line: "#eadfd2",
  done: "#3f6b4c",
  partial: "#c4842a",
  open: "#c9b8a6",
  shadow: "0 12px 32px rgba(44, 33, 24, 0.08)",
  radius: "20px",
};

const hearthDark: DirectionPalette = {
  bg: "#241c16",
  surface: "#31261e",
  ink: "#f6efe6",
  mute: "#cbbbaa",
  primary: "#e8836a",
  onPrimary: "#2c2118",
  secondary: "#8fbf7a",
  onSecondary: "#1c2818",
  line: "#4a3b30",
  done: "#8fbf7a",
  partial: "#e0aa55",
  open: "#6d5c4e",
  shadow: "0 12px 32px rgba(0, 0, 0, 0.28)",
  radius: "20px",
};

const daylightLight: DirectionPalette = {
  bg: "#eef2ef",
  surface: "#ffffff",
  ink: "#14241c",
  mute: "#5c6b63",
  primary: "#e39b12",
  onPrimary: "#1c1606",
  secondary: "#1c7c72",
  onSecondary: "#f3fbf9",
  line: "#d5ddd8",
  done: "#1c7c72",
  partial: "#c4842a",
  open: "#b7c2bb",
  shadow: "0 8px 24px rgba(20, 36, 28, 0.06)",
  radius: "16px",
};

const daylightDark: DirectionPalette = {
  bg: "#121a17",
  surface: "#1c2823",
  ink: "#eef2ef",
  mute: "#a8b5ae",
  primary: "#f0b429",
  onPrimary: "#1c1606",
  secondary: "#3dbea8",
  onSecondary: "#06221c",
  line: "#2d3c36",
  done: "#3dbea8",
  partial: "#f0b429",
  open: "#4d5e56",
  shadow: "0 8px 24px rgba(0, 0, 0, 0.32)",
  radius: "16px",
};

const studioLight: DirectionPalette = {
  bg: "#efe8df",
  surface: "#f7f3ed",
  ink: "#241f1a",
  mute: "#6a6258",
  primary: "#d2653c",
  onPrimary: "#fff8f4",
  secondary: "#3c4d86",
  onSecondary: "#f4f6fb",
  line: "#ddd3c6",
  done: "#3c4d86",
  partial: "#d2653c",
  open: "#c9bfb2",
  shadow: "none",
  radius: "12px",
};

const studioDark: DirectionPalette = {
  bg: "#1c1916",
  surface: "#28241f",
  ink: "#f3ece3",
  mute: "#b7ab9e",
  primary: "#e88962",
  onPrimary: "#241810",
  secondary: "#9aabd4",
  onSecondary: "#161a28",
  line: "#3d362e",
  done: "#9aabd4",
  partial: "#e88962",
  open: "#5c534a",
  shadow: "none",
  radius: "12px",
};

export const DIRECTIONS: Direction[] = [
  {
    id: "hearth",
    name: "Hearth",
    explore: true,
    summary: "Warm paper, terracotta, and olive. Rounded tiles. The four boxes are the hero.",
    display: "var(--font-hearth-display), Georgia, serif",
    body: "var(--font-hearth-body), system-ui, sans-serif",
    light: hearthLight,
    dark: hearthDark,
  },
  {
    id: "daylight",
    name: "Daylight",
    explore: false,
    summary: "Mist, marigold, and teal. A social club. The partner row leads.",
    display: "var(--font-daylight), system-ui, sans-serif",
    body: "var(--font-daylight), system-ui, sans-serif",
    light: daylightLight,
    dark: daylightDark,
  },
  {
    id: "studio",
    name: "Studio",
    explore: false,
    summary: "Linen, clay, and indigo. Flat tiles, a 12 px radius, and a quiet grid.",
    display: "var(--font-studio), Georgia, serif",
    body: "var(--font-outfit), system-ui, sans-serif",
    light: studioLight,
    dark: studioDark,
  },
];

export function directionById(id: string) {
  return DIRECTIONS.find((item) => item.id === id);
}
