import { products, type Product } from "@/lib/products";

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Higher is a better match. 0 means this word matches nothing about this product. */
export function termScore(product: Product, term: string): number {
  const name = normalize(product.name);
  const category = normalize(product.category);
  const id = normalize(product.id);
  const brand = normalize(product.brand ?? "");
  const description = normalize(product.description);

  if (name.startsWith(term)) return 100;
  if (name.includes(term)) return 70;
  if (brand && brand === term) return 65;
  if (category === term) return 60;
  if (category.includes(term)) return 50;
  if (brand.includes(term)) return 45;
  if (id.includes(term)) return 40;
  if (description.includes(term)) return 20;
  return 0;
}

/**
 * Products matching every word of `query`, best match first.
 * An empty query returns the whole (category-filtered) catalogue in shelf order.
 */
export function searchProducts(query: string, category = "All", limit?: number): Product[] {
  const pool =
    !category || category === "All" ? products : products.filter((p) => p.category === category);

  const q = normalize(query);
  if (!q) return typeof limit === "number" ? pool.slice(0, limit) : [...pool];

  const terms = q.split(" ");
  const scored = pool
    .map((product, order) => {
      const scores = terms.map((t) => termScore(product, t));
      return { product, order, score: scores.every((s) => s > 0) ? scores.reduce((a, b) => a + b, 0) : 0 };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((row) => row.product);

  return typeof limit === "number" ? scored.slice(0, limit) : scored;
}

export const POPULAR_SEARCHES = ["Headphones", "Smartwatch", "Runner", "Leather"];
