import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageExtras } from "@/components/PageExtras";
import { zodValidator } from "@tanstack/zod-adapter";
import { X } from "lucide-react";
import { SiteFooter } from "@/components/SiteHeader";
import { ProductListing } from "@/components/ProductListing";
import { SearchBox } from "@/components/SearchBox";
import { listingSearchSchema } from "@/lib/listing";
import { categories, products } from "@/lib/products";
import { searchProducts, POPULAR_SEARCHES } from "@/lib/search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(listingSearchSchema),
  head: ({ match }) => {
    const q = (match.search as { q?: string }).q?.trim();
    const title = q ? `“${q}” — Search CorrectBuy` : "All products — CorrectBuy";
    const description = q ? `Products matching “${q}” at CorrectBuy.` : "Browse every product at CorrectBuy: audio, wearables, footwear and bags.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        ...(q ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: [{ rel: "canonical", href: "/search" }],
    };
  },
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const q = search.q.trim();
  const catName = categories.find((c) => c.slug === search.cat)?.name ?? "All";
  const pool = searchProducts(q, catName);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-5 pt-10 sm:px-6 md:pt-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link> / <span className="text-foreground">{q ? "Search" : "All products"}</span>
        </nav>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{q ? <>Results for “{q}”</> : "All products"}</h1>
        <div className="mt-6 max-w-xl md:hidden"><SearchBox /></div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {q && (
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
              “{q}”
              <button type="button" aria-label="Clear search" onClick={() => navigate({ search: (p) => ({ ...p, q: "", page: 1 }) })} className="grid h-5 w-5 place-items-center rounded-full hover:bg-background/60">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {[{ slug: "", name: "All" }, ...categories].map((c) => (
            <button key={c.slug || "all"} onClick={() => navigate({ search: (p) => ({ ...p, cat: c.slug, page: 1 }) })}
              className={cn("rounded-full border px-5 py-2 text-sm font-medium transition-colors", c.slug === search.cat ? "border-secondary bg-secondary text-secondary-foreground" : "border-border hover:bg-muted")}>
              {c.name}
            </button>
          ))}
        </div>

        <ProductListing
          pool={pool}
          search={search}
          keepOrder={!!q}
          onChange={(n) => navigate({ search: (p) => ({ ...p, ...n }) })}
          empty={
            <div className="rounded-3xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
              <p className="font-display text-2xl font-bold">{q ? <>Nothing matches “{q}”</> : "No products match these filters"}</p>
              <p className="mt-2 text-sm text-muted-foreground">Try a shorter word or one of these:</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {POPULAR_SEARCHES.map((t) => (
                  <button key={t} onClick={() => navigate({ search: { q: t } })} className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary">{t}</button>
                ))}
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Still can't find it? <Link to="/" hash="finder" className="font-semibold text-primary">Ask us to source it</Link>
              </p>
              {products.length > 0 && (
                <button type="button" onClick={() => navigate({ search: {} })} className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">Show everything</button>
              )}
            </div>
          }
        />
      </main>
      <PageExtras />
      <SiteFooter />
    </div>
  );
}
