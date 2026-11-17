import type { Product } from "@/lib/products";

export type Collection = { id: string; slug: string; name: string; description: string; product_ids: string[]; sort: number; published: boolean };
export let collections: Collection[] = [];
export function setCollections(items: Collection[]) { collections = items; }
export const getCollection = (slug: string) => collections.find((c) => c.slug === slug);
/** Resolve explicit membership against live public products, preserving selection order. */
export function collectionProducts(collection: Pick<Collection, "product_ids">, products: Product[]): Product[] {
  const byId = new Map(products.map((p) => [p.dbId, p]));
  return [...new Set(collection.product_ids)].flatMap((id) => { const p = byId.get(id); return p ? [p] : []; });
}