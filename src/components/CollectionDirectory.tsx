import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { collections, collectionProducts } from "@/lib/collections";
import { categories, products } from "@/lib/products";
import { SiteFooter } from "@/components/SiteHeader";
import { PageExtras } from "@/components/PageExtras";

export function CollectionDirectory({ mode }: { mode: "categories" | "collections" }) {
  const isCategory = mode === "categories";
  const entries = isCategory
    ? categories.map((c) => ({ ...c, items: products.filter((p) => p.categorySlug === c.slug) }))
    : collections.map((c) => ({ ...c, items: collectionProducts(c, products) }));
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 md:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground"><Link to="/" className="hover:text-foreground">Home</Link> / {isCategory ? "Categories" : "Collections"}</nav>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">{isCategory ? "Shop by category" : "CorrectBuy collections"}</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">{isCategory ? "Find your next great choice in audio, wearables, footwear and bags." : "Fresh finds and everyday gear, brought together for the way you shop."}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
          <Link to="/search" className="text-primary hover:underline">All products</Link>
          <Link to={isCategory ? "/collections" : "/categories"} className="text-primary hover:underline">{isCategory ? "Explore collections" : "Browse categories"}</Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-6 lg:grid-cols-3">
          {entries.map((entry) => (
            <Link key={entry.slug} to={isCategory ? "/c/$slug" : "/collections/$slug"} params={{ slug: entry.slug }} className="group min-w-0">
              <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                {entry.items[0]?.image && <img src={entry.items[0].image} alt={entry.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
              </div>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <h2 className="min-w-0 font-display text-lg font-bold sm:text-xl">{entry.name}</h2><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{entry.items.length} {entry.items.length === 1 ? "product" : "products"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p>
            </Link>
          ))}
        </div>
      </main>
      <PageExtras productsTitle={isCategory ? "Trending across categories" : "Picked for you"} />
      <SiteFooter />
    </div>
  );
}