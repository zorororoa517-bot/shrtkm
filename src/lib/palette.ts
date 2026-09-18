export const PLAYER_PALETTE = [
  "#e8a00f", "#3ecf6e", "#5b9df0", "#f2495b",
  "#b985f4", "#f0a75b", "#3ecfc0", "#e05bd6"
] as const;

export function colorForIndex(i: number): string {
  return PLAYER_PALETTE[i % PLAYER_PALETTE.length]!;
}

export function letterFor(name: string): string {
  const trimmed = name.trim();
  return trimmed.length ? trimmed.charAt(0).toUpperCase() : "?";
}

/** Picks readable text color (near-black or near-white) against a given hex background. */
export function contrastText(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
}
