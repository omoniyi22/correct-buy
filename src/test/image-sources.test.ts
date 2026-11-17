import { describe, expect, it, vi } from "vitest";
import media from "../lib/media";
import { cdnImage, productImages, storage } from "../lib/storage";

const BASE_1 = "https://correctbuyecommerce.t3.tigrisfiles.io";

describe("store image sources", () => {
  it("keeps both logos on the local origin rather than object storage", () => {
    for (const key of ["correctbuy-logo-full.png", "correctbuy-logo-icon.png"] as const) {
      expect(media[key].startsWith("/")).toBe(true);
      expect(media[key]).not.toContain("/api/public/media/");
      expect(media[key]).not.toContain("tigris");
    }
  });
  it("resolves every non-logo store photo through direct Tigris public URLs", () => {
    for (const [key, url] of Object.entries(media)) {
      if (key.startsWith("correctbuy-logo-")) continue;
      expect(url).toBe(`${BASE_1}/${key.startsWith("catalog/") ? key : `store/${key}`}`);
    }
  });
  it("uses the saved Tigris bucket for product photos", () => {
    expect(productImages([{ key: "catalog/phone-titan.jpg", storage: 1 }, { key: "products/new photo.jpg", storage: 2 }])).toEqual([
      `${BASE_1}/catalog/phone-titan.jpg`,
      "/api/public/media/2/products/new%20photo.jpg", // no VITE_BASE_2 set -> server redirect fallback
    ]);
  });
  it("uses VITE_BASE_<n> for the matching storage index", () => {
    vi.stubEnv("VITE_BASE_2", "https://second.example.com/");
    expect(storage.urlFor(2, "products/new photo.jpg")).toBe("https://second.example.com/products/new%20photo.jpg");
    vi.unstubAllEnvs();
  });
  it("rewrites stored /api/public/media links (any host) to the direct CDN URL", () => {
    const cdn = `${BASE_1}/catalog/phone-titan.jpg`;
    expect(cdnImage("https://www.correctbuy.ng/api/public/media/1/catalog/phone-titan.jpg")).toBe(cdn);
    expect(cdnImage("/api/public/media/1/catalog/phone-titan.jpg")).toBe(cdn);
    expect(cdnImage(cdn)).toBe(cdn);
    expect(cdnImage("")).toBe("");
    expect(cdnImage(null)).toBe("");
  });
});