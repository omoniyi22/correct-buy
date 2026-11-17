import { describe, expect, it } from "vitest";
import { HOME_SECTIONS, moveSection, resolveHomeSections } from "@/lib/home-sections";

describe("homepage section layout", () => {
  it("uses the default order when nothing is saved", () => {
    expect(resolveHomeSections([]).map((s) => s.id)).toEqual(HOME_SECTIONS.map((s) => s.id));
  });
  it("keeps the admin's saved order and hidden sections", () => {
    const r = resolveHomeSections([{ id: "faq", visible: true }, { id: "hero", visible: false }]);
    expect(r[0]).toEqual({ id: "faq", visible: true });
    expect(r[1]).toEqual({ id: "hero", visible: false });
    expect(r).toHaveLength(HOME_SECTIONS.length);
  });
  it("drops unknown and duplicate ids", () => {
    const r = resolveHomeSections([{ id: "nope" }, { id: "faq" }, { id: "faq", visible: false }]);
    expect(r.filter((s) => s.id === "faq")).toEqual([{ id: "faq", visible: true }]);
  });
  it("moves a section up and down within bounds", () => {
    const base = resolveHomeSections([]);
    expect(moveSection(base, 1, -1)[0]!.id).toBe("perks");
    expect(moveSection(base, 0, -1)).toBe(base);
  });
});
