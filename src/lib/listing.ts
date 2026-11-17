import { fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import type { Product } from "@/lib/products";
import { totalAvailable } from "@/lib/products";

export const SORTS = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
} as const;
export type SortKey = keyof typeof SORTS;

export const PAGE_SIZE = 12;

export const listingSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  min: fallback(z.number().int().nonnegative().optional(), undefined),
  max: fallback(z.number().int().nonnegative().optional(), undefined),
  brand: fallback(z.string(), "").default(""),
  stock: fallback(z.boolean(), false).default(false),
  sort: fallback(z.enum(["featured", "newest", "price-asc", "price-desc"]), "featured").default("featured"),
  page: fallback(z.number().int().min(1), 1).default(1),
});
export type ListingSearch = z.infer<typeof listingSearchSchema>;

/** Price filters are in whole Naira in the URL; product prices are kobo. */
export function applyFilters(list: Product[], s: ListingSearch, keepOrder: boolean) {
  const brands = s.brand ? s.brand.split(",") : [];
  let out = list.filter(
    (p) =>
      (s.min === undefined || p.price >= s.min * 100) &&
      (s.max === undefined || p.price <= s.max * 100) &&
      (!brands.length || brands.includes(p.brand)) &&
      (!s.stock || totalAvailable(p) > 0),
  );
  if (s.sort === "price-asc") out = [...out].sort((a, b) => a.price - b.price);
  else if (s.sort === "price-desc") out = [...out].sort((a, b) => b.price - a.price);
  else if (s.sort === "newest") out = [...out].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else if (!keepOrder) out = [...out].sort((a, b) => Number(b.featured) - Number(a.featured));
  const pages = Math.max(1, Math.ceil(out.length / PAGE_SIZE));
  const page = Math.min(s.page, pages);
  return { total: out.length, pages, page, items: out.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}
