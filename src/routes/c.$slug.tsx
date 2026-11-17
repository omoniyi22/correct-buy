import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { PageExtras } from "@/components/PageExtras";
import { zodValidator } from "@tanstack/zod-adapter";
import { SiteFooter } from "@/components/SiteHeader";
import { ProductListing } from "@/components/ProductListing";
import { listingSearchSchema } from "@/lib/listing";
import { catalogQuery } from "@/lib/products";

export const Route = createFileRoute("/c/$slug")({
  validateSearch: zodValidator(listingSearchSchema),
  loader: async ({ params, context }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQuery);
    const category = catalog.categories.find((c) => c.slug === params.slug);
    if (!category) throw notFound();
    return { category, items: catalog.products.filter((p) => p.categorySlug === params.slug) };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Category not found — CorrectBuy" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.category.name} — Shop CorrectBuy`;
    const d = loaderData.category.description || `Shop ${loaderData.category.name} at CorrectBuy.`;
    return {
      meta: [
        { title },
        { name: "description", content: d },
        { property: "og:title", content: title },
        { property: "og:description", content: d },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: `/c/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "/" },
              { "@type": "ListItem", position: 2, name: loaderData.category.name, item: `/c/${params.slug}` },
            ],
          }),
        },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category, items } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/c/$slug" });

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-5 pt-10 sm:px-6 md:pt-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link> / <span className="text-foreground">{category.name}</span>
        </nav>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{category.name}</h1>
        {category.description && <p className="mt-3 max-w-xl text-muted-foreground">{category.description}</p>}
        <ProductListing
          pool={items}
          search={search}
          onChange={(n) => navigate({ search: (p) => ({ ...p, ...n }) })}
          empty={
            <div className="rounded-3xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
              <p className="font-display text-2xl font-bold">Nothing here matches those filters</p>
              <button type="button" onClick={() => navigate({ search: {} })} className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">Clear filters</button>
            </div>
          }
        />
      </main>
      <PageExtras productsTitle="Explore more picks" exclude={items.map((p) => p.id)} />
      <SiteFooter />
    </div>
  );
}
