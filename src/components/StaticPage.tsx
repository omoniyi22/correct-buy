import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteHeader";
import { PageExtras } from "@/components/PageExtras";

export function staticHead(title: string, description: string) {
  const t = `${title} — CorrectBuy`;
  return {
    meta: [
      { title: t },
      { name: "description", content: description },
      { property: "og:title", content: t },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}

export function StaticPage({ title, intro, children, after }: { title: string; intro?: string; children: ReactNode; after?: ReactNode }) {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-3xl px-5 pt-10 sm:px-6 md:pt-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link> / <span className="text-foreground">{title}</span>
        </nav>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{title}</h1>
        {intro && <p className="mt-4 text-lg text-muted-foreground">{intro}</p>}
        <div className="prose-store mt-10">{children}</div>
      </main>
      {after}
      <PageExtras />
      <SiteFooter />
    </div>
  );
}

export function Block({ h, children }: { h: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold">{h}</h2>
      <div className="mt-2 space-y-3 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
