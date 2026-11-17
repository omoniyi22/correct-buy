import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { getProduct, products } from "@/lib/products";
import { POPULAR_SEARCHES, searchProducts, termScore } from "@/lib/search";

const ids = (q: string, cat = "All") => searchProducts(q, cat).map((p) => p.id);
const pulse = getProduct("pulse-headphones")!;

describe("Product search", () => {
  it("finds a product by the start of its name", () => {
    expect(ids("pulse")).toEqual(["pulse-headphones"]);
  });

  it("finds a product by what its description says", () => {
    expect(ids("leather")).toEqual(["metro-backpack"]);
  });

  it("finds a product by its category", () => {
    expect(ids("audio")).toEqual(["pulse-headphones"]);
  });

  it("ignores letter case and extra spaces", () => {
    expect(ids("  ORBIT   watch ")).toEqual(["orbit-watch"]);
  });

  it("needs every word to match something", () => {
    expect(ids("pulse backpack")).toEqual([]);
  });

  it("stacks the search on top of a category", () => {
    expect(ids("er", "Footwear")).toEqual(["stride-runner"]);
    expect(ids("er", "Bags")).toEqual(["metro-backpack"]); // "leather"
    expect(ids("watch", "Footwear")).toEqual([]);
  });

  it("shows the whole catalogue for an empty query, and caps suggestions", () => {
    expect(searchProducts("")).toHaveLength(products.length);
    expect(searchProducts("", "All", 2)).toHaveLength(2);
  });

  it("lists products that merely share a description word in shelf order", () => {
    expect(ids("battery")).toEqual(["pulse-headphones", "orbit-watch"]);
  });

  it("scores a name start above a category above a description", () => {
    expect(termScore(pulse, "pulse")).toBe(100);
    expect(termScore(pulse, "audio")).toBe(60);
    expect(termScore(pulse, "battery")).toBe(20);
    expect(termScore(pulse, "hovercraft")).toBe(0);
  });

  it("offers popular searches that all return something", () => {
    expect(POPULAR_SEARCHES.length).toBeGreaterThan(0);
    for (const term of POPULAR_SEARCHES) expect(searchProducts(term, "All", 1).length).toBe(1);
  });

  it("keeps the shop page reachable with a search in the address bar", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/shop", { q: "pulse" }).at(-1)?.routeId).toBe("/shop");
  });
});
