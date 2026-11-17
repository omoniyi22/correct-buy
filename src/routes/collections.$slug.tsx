import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { PageExtras } from "@/components/PageExtras";
import { zodValidator } from "@tanstack/zod-adapter";
import { SiteFooter } from "@/components/SiteHeader";
import { ProductListing } from "@/components/ProductListing";
import { Button } from "@/components/ui/button";
import { listingSearchSchema } from "@/lib/listing";
import { catalogQuery } from "@/lib/products";
import { collections, collectionProducts } from "@/lib/collections";

export const Route = createFileRoute("/collections/$slug")({
  validateSearch: zodValidator(listingSearchSchema),
  loader: async ({ params, context }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQuery);
    const collection = catalog.collections?.find((c) => c.slug === params.slug);
    if (!collection) throw notFound();
    return { slug: collection.slug, name: collection.name, description: collection.description, items: collectionProducts(collection, catalog.products) };
  },
  head: ({ loaderData }) => {
    const title = `${loaderData?.name ?? "Collection unavailable"} — CorrectBuy`;
    const description = loaderData?.description ?? "Explore curated collections at CorrectBuy.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...(!loaderData ? [{ name: "robots", content: "noindex" }] : [])] };
  },
  component: CollectionPage,
});

function CollectionPage() {
  const collection = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/collections/$slug" });
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 md:py-14">
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-x-2 text-sm text-muted-foreground"><Link to="/">Home</Link> / <Link to="/collections">Collections</Link> / <span className="text-foreground">{collection.name}</span></nav>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">{collection.name}</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">{collection.description}</p>
        <nav aria-label="Collections" className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold">
          {collections.map((c) => <Link key={c.slug} to="/collections/$slug" params={{ slug: c.slug }} search={{}} className="text-muted-foreground hover:text-primary" activeProps={{ className: "text-primary underline underline-offset-4" }}>{c.name}</Link>)}
        </nav>
        <ProductListing pool={collection.items} keepOrder={collection.slug === "new-arrivals"} search={search} onChange={(next) => navigate({ search: (prev) => ({ ...prev, ...next }) })} empty={<div className="py-14 text-center"><h2 className="text-xl font-bold">No products match these filters</h2><Button variant="outline" className="mt-4" onClick={() => navigate({ search: {} })}>Clear filters</Button></div>} />
      </main>
      <PageExtras productsTitle="More to discover" exclude={collection.items.map((p) => p.id)} />
      <SiteFooter />
    </div>
  );
}