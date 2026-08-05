export const universeTheme = {
  colors: {
    background: "#030712",
    backgroundElevated: "#07111F",
    backgroundSoft: "#0A1728",

    surface: "rgba(7, 17, 31, 0.92)",
    surfaceStrong: "rgba(9, 24, 42, 0.97)",

    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",

    border: "rgba(79, 209, 255, 0.16)",
    borderStrong: "rgba(79, 209, 255, 0.42)",

    primary: "#38BDF8",
    primaryBright: "#67E8F9",
    primaryDark: "#0369A1",

    cyan: "#22D3EE",
    blue: "#3B82F6",
    violet: "#8B5CF6",
    purple: "#A855F7",
    green: "#4ADE80",
    orange: "#FB923C",
    yellow: "#FACC15",
    pink: "#EC4899",

    danger: "#F87171",
  },

  glow: {
    small: 8,
    medium: 16,
    large: 28,
  },

  node: {
    centerSize: 104,
    rootSize: 68,
    rootSelectedSize: 92,
    childSize: 26,
  },

  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    pill: 999,
  },
} as const;

export type UniverseColor =
  | "cyan"
  | "blue"
  | "violet"
  | "purple"
  | "green"
  | "orange"
  | "yellow"
  | "pink";