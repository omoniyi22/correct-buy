import { describe, expect, it } from "vitest";
import { applyFilters, listingSearchSchema } from "@/lib/listing";
import { products } from "@/lib/products";
import { formatMoney, toMinor } from "@/lib/money";
import { safeRedirect } from "@/hooks/useAuth";

const base = listingSearchSchema.parse({});

describe("Store rules", () => {
  it("stores money as kobo: ₦189,000 is 18,900,000 kobo", () => {
    expect(toMinor("189,000")).toBe(18900000);
    expect(formatMoney(18900000)).toContain("189,000");
  });

  it("price filter in the address bar is whole Naira", () => {
    const r = applyFilters(products, { ...base, max: 160000 }, false);
    expect(r.items.map((p) => p.id).sort()).toEqual(["metro-backpack", "stride-runner"]);
  });

  it("in-stock filter hides sold-out products", () => {
    const r = applyFilters(products, { ...base, stock: true }, false);
    expect(r.items.map((p) => p.id)).not.toContain("stride-runner");
  });

  it("sorts by price low to high", () => {
    const r = applyFilters(products, { ...base, sort: "price-asc" }, false);
    expect(r.items[0]!.id).toBe("stride-runner");
  });

  it("only allows same-site paths after sign-in", () => {
    expect(safeRedirect("/checkout")).toBe("/checkout");
    expect(safeRedirect("//evil.example")).toBe("/account");
    expect(safeRedirect("https://evil.example")).toBe("/account");
  });
});
