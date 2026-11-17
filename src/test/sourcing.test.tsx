import { describe, expect, it } from "vitest";

import { searchProducts } from "@/lib/search";
import { sourcingSchema } from "@/lib/sourcing";

describe("Find what's yours hand-off", () => {
  it("has nothing on the shelf for a request the finder should pass to a person", () => {
    expect(searchProducts("waterproof speaker under 80 dollars")).toEqual([]);
  });

  it("still routes a stocked ask to the shop", () => {
    expect(searchProducts("watch").map((p) => p.id)).toEqual(["orbit-watch"]);
  });

  it("rejects a request too short to act on", () => {
    const result = sourcingSchema.safeParse({ request: "tv", email: "ada@example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects an address nobody can be reached at", () => {
    const result = sourcingSchema.safeParse({
      request: "a waterproof Bluetooth speaker under $80",
      email: "ada-at-example",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a real ask with a real address", () => {
    const result = sourcingSchema.safeParse({
      request: "  a waterproof Bluetooth speaker under $80  ",
      email: "ada@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.request).toBe("a waterproof Bluetooth speaker under $80");
  });
});
