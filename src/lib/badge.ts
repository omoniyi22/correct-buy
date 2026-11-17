import type { CSSProperties } from "react";

/**
 * Product tags and the brand label are chips whose colour is chosen in admin,
 * so the text colour is derived from the chip colour: a pale chip gets dark
 * text, a deep chip gets light text. Both values are theme tokens, so the chips
 * stay correct in light and dark mode.
 */
const LIGHT_TEXT = "var(--primary-foreground)";
const DARK_TEXT = "var(--secondary)";

/** Above this relative luminance a chip is pale enough to need dark text. */
const PALE_AT = 0.4;

/** Colours offered in the admin tag editor. */
export const TAG_COLORS = [
  { hex: "#fca5a5", name: "Red" },
  { hex: "#86efac", name: "Green" },
  { hex: "#fcd34d", name: "Amber" },
  { hex: "#93c5fd", name: "Blue" },
  { hex: "#5eead4", name: "Teal" },
  { hex: "#d8b4fe", name: "Plum" },
  { hex: "#cbd5e1", name: "Grey" },
] as const;

/** A tag created without a colour of its own. */
export const DEFAULT_TAG_COLOR = "#cbd5e1";

export function isHexColor(value: string | null | undefined): value is string {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value ?? "");
}

/** The text colour that stays readable on a chip of this colour. */
export function readableChipText(hex: string): string {
  const full = /^#[0-9a-f]{3}$/i.test(hex)
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const channels = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
  return luminance > PALE_AT ? DARK_TEXT : LIGHT_TEXT;
}

/**
 * Inline style for a coloured chip, or undefined when the colour is missing or
 * unusable so the caller's own classes show through instead.
 */
export function chipStyle(color: string | null | undefined): CSSProperties | undefined {
  if (!isHexColor(color)) return undefined;
  return { backgroundColor: color, color: readableChipText(color) };
}
