import type { Product } from "@/lib/products";
import { collectionProducts, type Collection } from "@/lib/collections";

/** Saved collection membership is authoritative; catalog defaults apply only if unconfigured. */
export function homeProductRows(catalog: Product[], featured?: Collection, arrivals?: Collection) {
  return {
    bestSellers: featured ? collectionProducts(featured, catalog).slice(0, 4) : [...catalog].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 4),
    newArrivals: arrivals ? collectionProducts(arrivals, catalog).slice(0, 4) : [...catalog].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4),
  };
}