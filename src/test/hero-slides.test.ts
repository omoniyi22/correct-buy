import { describe, expect, it } from "vitest";
import { defaultCarousel, resolveHeroSlides, type HeroPromotion } from "@/lib/hero";
import type { Product } from "@/lib/products";

const p = (n: number, featured = false) => ({ id: `p${n}`, dbId: `db${n}`, name: `P${n}`, featured } as unknown as Product);
const catalog = [p(1), p(2, true), p(3), p(4), p(5)];
const promo = (n: number) => ({ id: `pr${n}`, title: `Promo ${n}` } as HeroPromotion);

describe("hero carousel slides", () => {
  it("shows exactly the chosen number of product slides, picked products first in order", () => {
    const slides = resolveHeroSlides({ ...defaultCarousel("main"), product_count: 3, product_ids: ["db4", "db1"] }, catalog, []);
    expect(slides.map((s) => (s.kind === "product" ? s.product.id : ""))).toEqual(["p4", "p1", "p2"]);
  });

  it("limits promotion cards to the chosen number and only uses selected ones", () => {
    const slides = resolveHeroSlides({ ...defaultCarousel("featured"), product_count: 0, promo_count: 1, promo_ids: ["pr2", "pr1"] }, catalog, [promo(1), promo(2)]);
    expect(slides).toEqual([{ kind: "promo", promo: promo(2) }]);
  });
});
