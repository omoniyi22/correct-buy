import { Link, useRouterState } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { storeConfigQuery } from "@/lib/settings";
import { publicPageId, resolvePublicSections, type PublicSectionId } from "@/lib/public-sections";
import { ArrowRight, Headphones, HelpCircle, Lock, MessageCircle, Package, Truck } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { BrandStrip } from "@/components/BrandStrip";
import { NewsletterForm } from "@/components/NewsletterForm";
import { products, type Product } from "@/lib/products";

/** Shared sections that round out every public page so none of them ends abruptly. */

export function TrustStrip() {
  const items = [
    { icon: Lock, t: "Secure payment", d: "Card, transfer or USSD through a trusted partner." },
    { icon: Truck, t: "Fast delivery", d: "Nationwide, with tracking on every order." },
    { icon: Headphones, t: "Quick support", d: "Real people on chat, phone and email." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-6">
      <div className="grid gap-4 rounded-[2rem] bg-secondary p-6 text-secondary-foreground sm:grid-cols-3 sm:p-8">
        {items.map(({ icon: I, t, d }) => (
          <div key={t} className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-background/10"><I className="h-5 w-5 text-primary" /></span>
            <div><p className="font-display font-bold">{t}</p><p className="mt-0.5 text-sm opacity-80">{d}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductRail({ title, items, exclude = [] }: { title: string; items?: Product[] | undefined; exclude?: string[] | undefined }) {
  const list = (items ?? [...products].sort((a, b) => Number(b.featured) - Number(a.featured))).filter((p) => !exclude.includes(p.id)).slice(0, 4);
  if (!list.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <h2 className="min-w-0 text-2xl font-extrabold sm:text-3xl">{title}</h2>
        <Link to="/search" className="shrink-0 text-sm font-semibold text-primary">View all →</Link>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {list.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

export function HelpCards() {
  const cards = [
    { to: "/track" as const, icon: Package, t: "Track an order", d: "Order number + email or phone." },
    { to: "/faq" as const, icon: HelpCircle, t: "FAQs", d: "Delivery, payment and returns." },
    { to: "/contact" as const, icon: MessageCircle, t: "Contact us", d: "We reply within one working day." },
    { to: "/returns-policy" as const, icon: ArrowRight, t: "Returns", d: "14 days after delivery." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-6">
      <h2 className="text-2xl font-extrabold sm:text-3xl">Need a hand?</h2>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map(({ to, icon: I, t, d }) => (
          <Link key={t} to={to} className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary">
            <I className="h-6 w-6 text-primary" />
            <p className="mt-4 font-display font-bold">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function NewsletterBand() {
  return (
    <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-6">
      <div className="rounded-[2rem] bg-accent p-8 text-center md:p-12">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Get 10% off your first order</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">New drops, honest reviews and members-only deals.</p>
        <div className="mx-auto mt-6 max-w-md"><NewsletterForm variant="light" /></div>
      </div>
    </section>
  );
}

/** The standard tail for content pages: trust, products, brands, help, newsletter. */
export function PageExtras({ productsTitle = "Popular right now", exclude }: { productsTitle?: string; exclude?: string[] | undefined }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useSuspenseQuery(storeConfigQuery);
  const sections = resolvePublicSections(data.settings.public_sections, publicPageId(path));
  const render: Record<PublicSectionId, () => ReactNode> = {
    trust: () => <TrustStrip />,
    products: () => <ProductRail title={productsTitle} exclude={exclude} />,
    brands: () => <div className="pt-6"><BrandStrip /></div>,
    help: () => <HelpCards />,
    newsletter: () => <NewsletterBand />,
  };
  return (
    <>
      {sections.filter((s) => s.visible).map((s) => <Fragment key={s.id}><div data-public-section={s.id}>{render[s.id]()}</div></Fragment>)}
    </>
  );
}
