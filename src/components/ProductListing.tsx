import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { applyFilters, SORTS, type ListingSearch, type SortKey } from "@/lib/listing";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  pool: Product[];
  search: ListingSearch;
  keepOrder?: boolean;
  onChange: (next: Partial<ListingSearch>) => void;
  empty: React.ReactNode;
};

/** Filter sidebar + sort + grid + pagination, shared by category and search pages. */
export function ProductListing({ pool, search, keepOrder = false, onChange, empty }: Props) {
  const [open, setOpen] = useState(false);
  const { items, total, pages, page } = applyFilters(pool, search, keepOrder);
  const brands = Array.from(new Set(pool.map((p) => p.brand).filter(Boolean))).sort();
  const picked = search.brand ? search.brand.split(",") : [];
  const set = (n: Partial<ListingSearch>) => onChange({ ...n, page: 1 });

  const filters = (
    <div className="space-y-6 text-sm">
      <fieldset>
        <legend className="font-semibold">Price (₦)</legend>
        <div className="mt-2 flex items-center gap-2">
          <label className="sr-only" htmlFor="f-min">Minimum price</label>
          <input id="f-min" type="number" min={0} inputMode="numeric" placeholder="Min" defaultValue={search.min}
            onBlur={(e) => set({ min: e.target.value ? Number(e.target.value) : undefined })}
            className="min-w-0 w-full rounded-lg border border-input bg-background px-3 py-2" />
          <span className="text-muted-foreground">–</span>
          <label className="sr-only" htmlFor="f-max">Maximum price</label>
          <input id="f-max" type="number" min={0} inputMode="numeric" placeholder="Max" defaultValue={search.max}
            onBlur={(e) => set({ max: e.target.value ? Number(e.target.value) : undefined })}
            className="min-w-0 w-full rounded-lg border border-input bg-background px-3 py-2" />
        </div>
      </fieldset>
      {brands.length > 1 && (
        <fieldset>
          <legend className="font-semibold">Brand</legend>
          <div className="mt-2 space-y-2">
            {brands.map((b) => (
              <label key={b} className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={picked.includes(b)}
                  onChange={(e) => set({ brand: (e.target.checked ? [...picked, b] : picked.filter((x) => x !== b)).join(",") })} />
                {b}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" className="h-4 w-4 accent-primary" checked={search.stock} onChange={(e) => set({ stock: e.target.checked })} />
        In stock only
      </label>
      {(search.min !== undefined || search.max !== undefined || search.brand || search.stock) && (
        <Button variant="link" type="button" onClick={() => set({ min: undefined, max: undefined, brand: "", stock: false })} className="px-0 font-semibold text-primary">
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="mt-8 grid min-w-0 gap-6 md:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
      <aside className="hidden md:block">{filters}</aside>
      <div className="min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">{total} {total === 1 ? "product" : "products"}</p>
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Toggle filters"
              className="h-10 shrink-0 rounded-lg px-3 md:hidden">
              <SlidersHorizontal className="h-4 w-4" /><span className="hidden sm:inline">Filters</span>
            </Button>
            <label htmlFor="sort" className="sr-only">Sort by</label>
            <select id="sort" value={search.sort} onChange={(e) => set({ sort: e.target.value as SortKey })}
              className="min-w-0 max-w-[170px] rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium sm:max-w-none">
              {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        </div>
        {open && <div className="mt-4 rounded-2xl border border-border p-4 md:hidden">{filters}</div>}

        {items.length === 0 ? (
          <div className="mt-8">{empty}</div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-3">
            {items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex flex-wrap justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Button variant="outline" key={n} type="button" aria-current={n === page ? "page" : undefined} onClick={() => onChange({ page: n })}
                className={cn("h-10 w-10 rounded-full border text-sm font-semibold", n === page ? "border-secondary bg-secondary text-secondary-foreground" : "border-border hover:bg-muted")}>
                {n}
              </Button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
