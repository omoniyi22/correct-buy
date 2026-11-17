import { formatMoney } from "@/lib/money";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Truck, RotateCcw, Headphones, Star, BadgeCheck, Search, PackageCheck, Quote } from "lucide-react";
import { SiteFooter } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { products, categories as catalogCategories } from "@/lib/products";
import { collections, collectionProducts, getCollection } from "@/lib/collections";
import { NewsletterForm } from "@/components/NewsletterForm";
import { cart } from "@/lib/cart";
import media from "@/lib/media";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HeroSection } from "@/components/HeroSection";
import { heroSettingsQuery } from "@/lib/hero";
import { ProductFinder } from "@/components/ProductFinder";
import { BrandStrip } from "@/components/BrandStrip";
import { storeConfigQuery } from "@/lib/settings";
import { resolveHomeSections, type HomeSectionId } from "@/lib/home-sections";
import { Fragment, type ReactNode } from "react";
import { homeProductRows } from "@/lib/home-products";

const hero = media["p-headphones.jpg"];
const watch = media["p-watch.jpg"];
const sneaker = media["p-sneaker.jpg"];
const backpack = media["p-backpack.jpg"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CorrectBuy — Buy right, the first time" },
      { name: "description", content: "Hand-picked tech, footwear and everyday gear from CorrectBuy." },
      { property: "og:title", content: "CorrectBuy — Buy right, the first time" },
      { property: "og:description", content: "Hand-picked tech, footwear and everyday gear from CorrectBuy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(heroSettingsQuery), context.queryClient.ensureQueryData(storeConfigQuery)]),
  component: Index,
});

const perks = [
  { icon: Truck, t: "Free delivery over ₦200,000" },
  { icon: RotateCcw, t: "14-day easy returns" },
  { icon: ShieldCheck, t: "2-year warranty" },
  { icon: Headphones, t: "Real human support" },
];

const categories = [
  { name: "Audio", slug: "audio", img: hero },
  { name: "Wearables", slug: "wearables", img: watch },
  { name: "Footwear", slug: "footwear", img: sneaker },
  { name: "Bags", slug: "bags", img: backpack },
];

const steps = [
  { icon: Search, t: "We research", d: "Our team compares hundreds of products in every category." },
  { icon: BadgeCheck, t: "We test", d: "Only the ones that survive weeks of real use make the cut." },
  { icon: PackageCheck, t: "You buy right", d: "One great choice per need. No regret, no returns hassle." },
];

const reviews = [
  { n: "Amaka O.", q: "The Pulse headphones are the best thing I've bought this year. Delivery was quick too." },
  { n: "Tunde B.", q: "I love that they only sell things they've tested. It saves me hours of research." },
  { n: "Grace E.", q: "My Metro backpack still looks brand new after six months of daily commuting." },
];

const faqs = [
  { q: "How fast is delivery?", a: "Most orders arrive within 2–4 working days." },
  { q: "Can I return an item?", a: "Yes, any item can be returned within 14 days of delivery for a full refund." },
  { q: "Do products come with a warranty?", a: "Every product is covered by our 2-year CorrectBuy warranty." },
  { q: "How do you choose products?", a: "We research, test for weeks, and only stock the ones we'd buy ourselves." },
];


function Index() {
  const { data: heroSettings } = useSuspenseQuery(heroSettingsQuery);
  const { data: config } = useSuspenseQuery(storeConfigQuery);
  const sections = resolveHomeSections(config.settings.home_sections);
  const featured = products.find((p) => p.featured) ?? products[0];
  const categoryCards = catalogCategories.map((c) => ({ ...c, img: products.find((p) => p.categorySlug === c.slug)?.image ?? categories.find((old) => old.slug === c.slug)?.img }));
  const featuredCollection = getCollection("featured-picks");
  const arrivalsCollection = getCollection("new-arrivals");
  const { bestSellers, newArrivals } = homeProductRows(products, featuredCollection, arrivalsCollection);
  const render: Record<HomeSectionId, () => ReactNode> = {
    "hero": () => (
      <>
      <HeroSection settings={heroSettings} catalog={products} />
      </>
    ),
    "perks": () => (
      <>
      {/* Perks */}
      <section className="bg-secondary text-secondary-foreground">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map(({ icon: I, t }) => (
            <div key={t} className="flex items-center gap-3 text-sm font-medium"><I className="h-5 w-5 text-primary" />{t}</div>
          ))}
        </div>
      </section>
      </>
    ),
    "brands": () => (
      <>
      <BrandStrip />
      </>
    ),
    "categories": () => (
      <>
      {/* Categories */}
      <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3"><h2 className="min-w-0 text-2xl font-extrabold sm:text-4xl">Shop by category</h2><Link to="/categories" className="shrink-0 text-sm font-semibold text-primary">View all →</Link></div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {categoryCards.map((c) => (
            <Link key={c.name} to="/c/$slug" params={{ slug: c.slug }} className="group relative block overflow-hidden rounded-2xl">
              <div className="aspect-[4/5] bg-muted">{c.img && <img src={c.img} alt={c.name} width={1024} height={1024} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}</div>
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl bg-background/90 px-4 py-3 backdrop-blur">
                <span className="font-display font-bold">{c.name}</span>
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </section>
      </>
    ),
    "collections": () => (
      <>
      <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3"><h2 className="min-w-0 text-2xl font-extrabold sm:text-4xl">Shop collections</h2><Link to="/collections" className="shrink-0 text-sm font-semibold text-primary">View all →</Link></div>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {collections.filter((c) => !["new-arrivals", "featured-picks"].includes(c.slug)).map((c) => {
            const image = collectionProducts(c, products)[0]?.image;
            return <Link key={c.slug} to="/collections/$slug" params={{ slug: c.slug }} className="group min-w-0"><div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">{image && <img src={image} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />}</div><div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3"><h3 className="text-xl font-bold">{c.name}</h3><ArrowRight className="h-5 w-5 shrink-0 text-primary" /></div><p className="mt-2 text-sm text-muted-foreground">{c.description}</p></Link>;
          })}
        </div>
      </section>
      </>
    ),
    "best-sellers": () => (
      <>
      {/* Best sellers */}
      {bestSellers.length > 0 && <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-6 md:pt-24">
        <div className="rounded-[2rem] border border-border bg-accent/60 px-4 py-8 sm:px-8 sm:py-10">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <h2 className="min-w-0 text-2xl font-extrabold sm:text-4xl">{featuredCollection?.name ?? "Featured picks"}</h2>
            {featuredCollection ? <Link to="/collections/$slug" params={{ slug: featuredCollection.slug }} className="shrink-0 text-sm font-semibold text-primary">View all →</Link> : <Link to="/search" className="shrink-0 text-sm font-semibold text-primary">View all →</Link>}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>}
      </>
    ),
    "new-arrivals": () => (
      <>
      {newArrivals.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <h2 className="min-w-0 text-2xl font-extrabold sm:text-4xl">{arrivalsCollection?.name ?? "New arrivals"}</h2>
            {arrivalsCollection ? <Link to="/collections/$slug" params={{ slug: arrivalsCollection.slug }} className="shrink-0 text-sm font-semibold text-primary">View all →</Link> : <Link to="/search" search={{ sort: "newest" }} className="shrink-0 text-sm font-semibold text-primary">View all →</Link>}
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-4">
            {newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
      </>
    ),
    "condition": () => (
      <>
      {([["New", "Brand new"], ["Fairly used", "Fairly used"], ["UK used", "UK used"]] as const).map(([tag, title]) => {
        const list = products.filter((p) => p.tags.includes(tag)).slice(0, 4);
        if (!list.length) return null;
        return (
          <section key={tag} className="mx-auto max-w-6xl px-5 pt-16 sm:px-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <h2 className="min-w-0 text-2xl font-extrabold sm:text-4xl">{title}</h2>
              <Link to="/search" className="shrink-0 text-sm font-semibold text-primary">View all →</Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-4">
              {list.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        );
      })}
      </>
    ),
    "finder": () => (
      <>
      <ProductFinder />
      </>
    ),
    "featured": () => (
      <>
      {/* Featured product */}
      {featured && <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-6 md:mt-24">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-accent via-background to-accent p-6 shadow-xl sm:p-10 md:grid-cols-2 md:gap-12 md:p-14">
          <div className="text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Product of the month</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl md:mt-4 md:text-5xl">{featured.name}</h2>
            <p className="mx-auto mt-4 max-w-md opacity-75 md:mx-0">{featured.description}</p>
            <p className="mt-5 font-display text-2xl font-bold text-primary sm:text-3xl md:mt-6">{formatMoney(featured.price)}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 md:mt-8 md:justify-start">
              <button onClick={() => cart.add(featured.id)} className="rounded-full bg-primary px-7 py-4 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">Add to cart</button>
              <Link to="/p/$slug" params={{ slug: featured.id }} className="rounded-full border border-foreground/25 px-7 py-4 font-semibold">Details</Link>
            </div>
          </div>
          <img src={featured.image} alt={featured.name} width={1024} height={1024} loading="lazy" className="w-full rounded-2xl shadow-2xl ring-1 ring-border" />
        </div>
      </section>}
      </>
    ),
    "how": () => (
      <>
      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-6 md:pt-24">
        <h2 className="max-w-xl text-3xl font-extrabold sm:text-4xl">How CorrectBuy picks every product</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: I, t, d }, i) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-8">
              <div className="flex items-center justify-between">
                <I className="h-8 w-8 text-primary" />
                <span className="font-display text-5xl font-extrabold text-muted">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-xl font-bold">{t}</h3>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>
      </>
    ),
    "stats": () => (
      <>
      {/* Stats */}
      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-6 md:mt-24">
        <div className="grid gap-8 rounded-[2rem] bg-secondary p-8 text-secondary-foreground sm:grid-cols-2 sm:p-10 lg:grid-cols-4">
          {[["2,000+", "Happy customers"], ["300+", "Products tested"], ["4.9★", "Average rating"], ["48h", "Average delivery"]].map(([n, l]) => (
            <div key={l}>
              <p className="font-display text-3xl font-extrabold sm:text-4xl">{n}</p>
              <p className="mt-1 text-sm opacity-85">{l}</p>
            </div>
          ))}
        </div>
      </section>
      </>
    ),
    "reviews": () => (
      <>
      {/* Reviews */}
      <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-6 md:pt-24">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Loved by real buyers</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.n} className="rounded-2xl bg-card p-8">
              <Quote className="h-6 w-6 text-primary" />
              <blockquote className="mt-4 text-lg">"{r.q}"</blockquote>
              <figcaption className="mt-6 flex items-center justify-between text-sm">
                <span className="font-semibold">{r.n}</span>
                <span className="flex text-primary">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
      </>
    ),
    "faq": () => (
      <>
      {/* FAQ */}
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pt-16 sm:px-6 md:pt-24 md:grid-cols-[1fr_2fr]">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Questions? Answered.</h2>
        <div className="divide-y divide-border border-y border-border">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-semibold">
                {f.q}<span className="text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      </>
    ),
    "newsletter": () => (
      <>
      {/* Newsletter */}
      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-6 md:mt-24">
        <div className="rounded-[2rem] bg-accent p-10 text-center md:p-16">
          <h2 className="text-3xl font-extrabold sm:text-4xl md:text-5xl">Get 10% off your first order</h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">Join our list for new drops, honest reviews and members-only deals.</p>
          <div className="mx-auto mt-8 max-w-md"><NewsletterForm variant="light" /></div>
        </div>
      </section>
      </>
    ),
  };
  return (
    <div className="min-h-screen">
      {sections.filter((x) => x.visible).map((x) => <Fragment key={x.id}>{render[x.id]()}</Fragment>)}
      <SiteFooter />
    </div>
  );
}
