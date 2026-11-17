import "@testing-library/jest-dom/vitest";
import { setCatalog } from "@/lib/products";
import { fixtureCatalog } from "@/test/fixtures/catalog";

setCatalog(fixtureCatalog);

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
