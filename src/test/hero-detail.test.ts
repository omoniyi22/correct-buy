import { describe, expect, it } from "vitest";
import { heroDetailImage } from "../lib/hero";

describe("hero detail photo", () => {
  it("keeps the small card populated for a product with only one photo", () => {
    expect(heroDetailImage({ image: "/api/public/media/1/catalog/phone-titan.jpg", gallery: [] })).toBe("/api/public/media/1/catalog/phone-titan.jpg");
  });
  it("prefers a different saved gallery photo when available", () => {
    expect(heroDetailImage({ image: "/api/public/media/1/main.jpg", gallery: ["/api/public/media/1/main.jpg", "/api/public/media/2/detail.jpg"] })).toBe("/api/public/media/2/detail.jpg");
  });
});