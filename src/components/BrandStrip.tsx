import { Link } from "@tanstack/react-router";
import { products } from "@/lib/products";

/** Every brand we stock, on one line. Tapping a brand searches for its products. */
export function BrandStrip() {
  const brands = [...new Set(products.map((p) => p.brand.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (!brands.length) return null;
  return (
    <section aria-label="Shop by brand" className="mx-auto max-w-6xl py-10 sm:px-6 md:py-12">
      <ul className="no-scrollbar flex snap-x flex-nowrap items-center gap-3 overflow-x-auto px-5 sm:flex-wrap sm:justify-center sm:gap-x-10 sm:gap-y-3 sm:overflow-visible sm:px-0">
        {brands.map((b) => (
          <li key={b} className="shrink-0 snap-start">
            <Link
              to="/search"
              search={{ q: b }}
              className="block whitespace-nowrap rounded-full border border-border px-4 py-2 font-display text-base font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:border-transparent sm:px-2 sm:text-xl"
            >
              {b}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
