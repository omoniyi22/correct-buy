import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Check, Headphones, Lock, Minus, Plus, ShoppingBag, Truck, Zap } from "lucide-react";
import { toast } from "sonner";
import { SiteFooter } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { catalogQuery, defaultVariant } from "@/lib/products";
import { formatMoney } from "@/lib/money";
import { cart } from "@/lib/cart";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { PageExtras } from "@/components/PageExtras";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params, context }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQuery);
    const product = catalog.products.find((p) => p.id === params.slug);
    if (!product) throw notFound();
    const related = catalog.products.filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id).slice(0, 4);
    const fill = catalog.products.filter((p) => p.id !== product.id && !related.includes(p)).slice(0, 4 - related.length);
    return { product, related: [...related, ...fill] };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Product not found — CorrectBuy" }, { name: "robots", content: "noindex" }] };
    const p = loaderData.product;
    const title = p.seoTitle || `${p.name} — CorrectBuy`;
    const d = p.seoDescription || p.description;
    return {
      meta: [
        { title },
        { name: "description", content: d },
        { property: "og:title", content: title },
        { property: "og:description", content: d },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(/^https:\/\//.test(p.image) ? [{ property: "og:image", content: p.image }, { name: "twitter:image", content: p.image }] : []),
      ],
      links: [{ rel: "canonical", href: `/p/${p.id}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            brand: p.brand,
            description: p.description,
            sku: p.variants[0]?.sku,
            image: p.image,
            offers: p.variants.map((v) => ({
              "@type": "Offer",
              sku: v.sku,
              priceCurrency: "NGN",
              price: (v.price / 100).toFixed(2),
              availability: v.available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "/" },
              { "@type": "ListItem", position: 2, name: p.category, item: `/c/${p.categorySlug}` },
              { "@type": "ListItem", position: 3, name: p.name, item: `/p/${p.id}` },
            ],
          }),
        },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, related } = Route.useLoaderData();
  const [variantId, setVariantId] = useState(() => defaultVariant(product)?.id ?? "");
  const [qty, setQty] = useState(1);
  const [image, setImage] = useState(product.gallery[0] ?? product.image);
  const [added, setAdded] = useState(false);
  const variant = useMemo(() => product.variants.find((v) => v.id === variantId) ?? product.variants[0]!, [product, variantId]);
  const out = variant.available <= 0;
  const low = !out && variant.available <= variant.lowStock;

  useEffect(() => {
    setVariantId(defaultVariant(product)?.id ?? "");
    setImage(product.gallery[0] ?? product.image);
    setQty(1);
    track("view_item", { value: product.price, items: [{ item_id: product.id, item_name: product.name, price: product.price / 100, quantity: 1 }] });
  }, [product]);

  useEffect(() => setQty((q) => Math.max(1, Math.min(q, variant.available || 1))), [variant]);

  const add = () => {
    if (out) return;
    cart.add(variant.id, qty);
    track("add_to_cart", { value: variant.price * qty, items: [{ item_id: variant.sku, item_name: product.name, price: variant.price / 100, quantity: qty }] });
    toast.success(`${product.name} added to your cart`, { action: { label: "View cart", onClick: () => (window.location.href = "/cart") } });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const navigate = useNavigate();
  const buyNow = () => {
    if (out) return;
    cart.add(variant.id, qty);
    track("add_to_cart", { value: variant.price * qty, items: [{ item_id: variant.sku, item_name: product.name, price: variant.price / 100, quantity: qty }] });
    void navigate({ to: "/checkout" });
  };

  const buyButton = (extra?: string) => (
    <button
      type="button"
      onClick={buyNow}
      disabled={out}
      className={cn("flex items-center justify-center gap-2 rounded-full border-2 border-foreground bg-foreground px-8 py-4 font-semibold text-background transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-muted disabled:bg-muted disabled:text-muted-foreground", extra)}
    >
      <Zap className="h-5 w-5" />
      Buy now
    </button>
  );

  const label = product.variants.some((v) => v.size) ? "Size" : "Colour";

  const addButton = (extra?: string) => (
    <button
      type="button"
      onClick={add}
      disabled={out}
      className={cn("flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground", extra)}
    >
      {added ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
      {out ? "Out of stock" : added ? "Added to cart" : "Add to cart"}
    </button>
  );

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <main className="mx-auto max-w-6xl px-5 pt-8 sm:px-6 md:pt-12">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link> /{" "}
          <Link to="/c/$slug" params={{ slug: product.categorySlug }} className="hover:text-foreground">{product.category}</Link> /{" "}
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 md:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-3xl bg-muted">
              <img src={image} alt={product.name} width={1024} height={1024} className="aspect-square w-full object-cover" />
            </div>
            {product.gallery.length > 1 && (
              <div className="mt-3 flex gap-3">
                {product.gallery.map((g) => (
                  <button key={g} type="button" onClick={() => setImage(g)} aria-label="Show image"
                    className={cn("h-20 w-20 overflow-hidden rounded-xl border-2", g === image ? "border-primary" : "border-transparent")}>
                    <img src={g} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {product.brand && <p className="text-xs font-bold uppercase tracking-widest text-brand-badge">{product.brand}</p>}
            <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">{product.name}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <p className="font-display text-3xl font-bold text-primary">{formatMoney(variant.price)}</p>
              {variant.compareAt && variant.compareAt > variant.price && (
                <p className="text-lg text-muted-foreground line-through">{formatMoney(variant.compareAt)}</p>
              )}
            </div>
            <p className="mt-5 leading-relaxed text-muted-foreground">{product.description}</p>

            {product.variants.length > 1 && (
              <fieldset className="mt-6">
                <legend className="text-sm font-semibold">{label}: <span className="font-normal">{variant.name}</span></legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button key={v.id} type="button" onClick={() => setVariantId(v.id)} aria-pressed={v.id === variant.id}
                      className={cn("rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        v.id === variant.id ? "border-secondary bg-secondary text-secondary-foreground" : "border-border hover:border-foreground",
                        v.available <= 0 && "text-muted-foreground line-through")}>
                      {v.name}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <p className={cn("mt-5 text-sm font-semibold", out ? "text-destructive" : low ? "text-primary" : "text-success")} aria-live="polite">
              {out ? "Out of stock" : low ? `Only ${variant.available} left — order soon` : "In stock, ready to ship"}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-full border border-border">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-12 w-12 place-items-center"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center font-semibold" aria-label="Quantity">{qty}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(variant.available || 1, q + 1))} className="grid h-12 w-12 place-items-center"><Plus className="h-4 w-4" /></button>
              </div>
              <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
                {addButton("px-4 sm:px-8")}
                {buyButton("px-4 sm:px-8")}
              </div>
            </div>

            <ul className="mt-8 space-y-3 rounded-2xl border border-border p-5 text-sm">
              <li className="flex gap-3"><Lock className="h-5 w-5 shrink-0 text-primary" /> Secure payment</li>
              <li className="flex gap-3"><Truck className="h-5 w-5 shrink-0 text-primary" /> Fast delivery</li>
              <li className="flex gap-3"><Headphones className="h-5 w-5 shrink-0 text-primary" /> Quick support</li>
            </ul>

            {product.specs.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold">Specifications</h2>
                <dl className="mt-3 divide-y divide-border border-y border-border text-sm">
                  {product.specs.map((s) => (
                    <div key={s.k} className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">{s.k}</dt><dd className="text-right font-medium">{s.v}</dd></div>
                  ))}
                  <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">SKU</dt><dd className="font-mono text-xs">{variant.sku}</dd></div>
                </dl>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="text-3xl font-extrabold">You may also like</h2>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </main>
      <PageExtras exclude={[product.id]} />

      {/* Sticky add to cart on phones */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{product.name}</p>
          <p className="text-sm font-bold text-primary">{formatMoney(variant.price)}</p>
        </div>
        {addButton("px-6 py-3")}
      </div>
      <SiteFooter />
    </div>
  );
}
