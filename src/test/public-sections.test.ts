import { describe, expect, it } from "vitest";
import { PUBLIC_PAGES, publicPageId, resolvePublicSections, movePublicSection } from "@/lib/public-sections";
import { resolveCardStyle } from "@/lib/card-style";
import { homeProductRows } from "@/lib/home-products";
import type { Product } from "@/lib/products";

describe("public page layout defaults", () => {
  it("shows every expected section in predefined order for unconfigured sales and content pages", () => {
    for (const page of PUBLIC_PAGES.filter((p) => p.id !== "product")) {
      expect(resolvePublicSections({}, page.id)).toEqual(["trust", "products", "brands", "help", "newsletter"].map((id) => ({ id, visible: true })));
    }
  });
  it("does not duplicate the product page's existing recommendations", () => {
    expect(resolvePublicSections({}, "product").map((s) => s.id)).toEqual(["trust", "brands", "help", "newsletter"]);
  });
  it("restores omitted sections in incomplete configuration without overriding explicit hiding or order", () => {
    expect(resolvePublicSections({ search: [{ id: "newsletter", visible: true }, { id: "trust", visible: false }] }, "search")).toEqual([
      { id: "newsletter", visible: true }, { id: "trust", visible: false }, { id: "products", visible: true }, { id: "brands", visible: true }, { id: "help", visible: true },
    ]);
  });
  it("drops unknown and duplicate sections and tolerates malformed configuration", () => {
    const list = resolvePublicSections({ search: [null, { id: "unknown" }, { id: "trust" }, { id: "trust", visible: false }] }, "search");
    expect(list).toHaveLength(5);
    expect(list[0]).toEqual({ id: "trust", visible: true });
    expect(resolvePublicSections(null, "search")).toEqual(list);
  });
  it("keeps arrangements scoped to the selected public page", () => {
    expect(resolvePublicSections({ search: [{ id: "help", visible: false }] }, "about")[0]).toEqual({ id: "trust", visible: true });
    expect(publicPageId("/c/audio")).toBe("category");
    expect(publicPageId("/collections/new-arrivals")).toBe("collection");
    expect(publicPageId("/p/headphones")).toBe("product");
  });
  it("reorders sections without dropping any", () => {
    const defaults = resolvePublicSections({}, "search");
    expect(movePublicSection(defaults, 4, -4).map((s) => s.id)).toEqual(["newsletter", "trust", "products", "brands", "help"]);
  });
});
describe("product card selection", () => {
  it("defaults to the preserved Style 1 when unset or invalid", () => {
    expect(resolveCardStyle(undefined)).toBe("style-1");
    expect(resolveCardStyle("invalid")).toBe("style-1");
  });
  it("honors the administrator's Style 2 selection", () => {
    expect(resolveCardStyle("style-2")).toBe("style-2");
  });
  it("honors the additional large-photo Style 3 selection", () => {
    expect(resolveCardStyle("style-3")).toBe("style-3");
  });
});
describe("unconfigured homepage product sections", () => {
  const catalog = [
    { id: "older", dbId: "a", featured: false, createdAt: "2026-01-01" },
    { id: "newer", dbId: "b", featured: true, createdAt: "2026-11-07" },
  ] as Product[];
  it("restores featured and arrival sections from the catalog when no collections are configured", () => {
    const rows = homeProductRows(catalog);
    expect(rows.bestSellers.map((p) => p.id)).toEqual(["newer", "older"]);
    expect(rows.newArrivals.map((p) => p.id)).toEqual(["newer", "older"]);
  });
  it("does not override deliberately configured empty collection membership", () => {
    const empty = { id: "group", slug: "featured-picks", name: "Featured", description: "", product_ids: [], sort: 0, published: true };
    expect(homeProductRows(catalog, empty, empty)).toEqual({ bestSellers: [], newArrivals: [] });
  });
});