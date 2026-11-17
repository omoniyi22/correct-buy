import { describe, it, expect } from "vitest";
import { collectionProducts } from "@/lib/collections";
import { products } from "@/lib/products";

describe("Admin-selected collection membership", () => {
  it("shows only selected live products in selection order", () => {
    const first = products[0]; const second = products[1];
    if (!first || !second) throw new Error("Two catalog fixtures are required");
    expect(collectionProducts({ product_ids: [second.dbId, first.dbId] }, products).map((p) => p.id)).toEqual([second.id, first.id]);
  });
  it("removing a product excludes it from the public collection", () => {
    const first = products[0]; const second = products[1];
    if (!first || !second) throw new Error("Two catalog fixtures are required");
    expect(collectionProducts({ product_ids: [second.dbId] }, products).map((p) => p.id)).toEqual([second.id]);
  });
  it("never includes unpublished or missing products outside the public catalog", () => {
    expect(collectionProducts({ product_ids: ["private-product"] }, products)).toEqual([]);
  });
});