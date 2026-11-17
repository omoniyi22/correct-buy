import { describe, expect, it } from "vitest";
import { chipStyle, DEFAULT_TAG_COLOR, isHexColor, readableChipText, TAG_COLORS } from "@/lib/badge";

describe("chip colours", () => {
  it("keeps light text on the red UK used chip", () => {
    expect(readableChipText("#ee3533")).toBe("var(--primary-foreground)");
  });

  it("switches to dark text on the pale amber Fairly used chip", () => {
    expect(readableChipText("#f0b135")).toBe("var(--secondary)");
  });

  it("paints a chip with its own colour and readable text", () => {
    expect(chipStyle("#1c8742")).toEqual({ backgroundColor: "#1c8742", color: "var(--primary-foreground)" });
  });

  it("leaves the caller's styling alone when the colour is unusable", () => {
    expect(chipStyle("not-a-colour")).toBeUndefined();
    expect(chipStyle(null)).toBeUndefined();
    expect(chipStyle("")).toBeUndefined();
  });

  it("offers the seeded tag colours as swatches", () => {
    const hexes = TAG_COLORS.map((c) => c.hex);
    expect(hexes).toEqual(expect.arrayContaining(["#fca5a5", "#86efac", "#fcd34d", DEFAULT_TAG_COLOR]));
    hexes.forEach((h) => expect(isHexColor(h)).toBe(true));
  });
});
