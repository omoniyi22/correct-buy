import { formatMoney } from "@/lib/money";
import { cdnImage } from "@/lib/storage";
import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingBag, Star } from "lucide-react";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/products";
import type { HeroSlide } from "@/lib/hero";
import { heroDetailImage } from "@/lib/hero";
import { cart } from "@/lib/cart";
import { cn } from "@/lib/utils";
import media from "@/lib/media";

const lifeHeadphones = media["life-headphones.jpg"];
const lifeWatch = media["life-watch.jpg"];
const lifeSneaker = media["life-sneaker.jpg"];
const lifeBackpack = media["life-backpack.jpg"];

type Copy = { eyebrow: string; title: string; accent: string; copy: string; lifestyle?: string | undefined; lifestyleAlt?: string | undefined };

// Hand-written copy for the launch products; any other product falls back to its catalog details.
const COPY: Record<string, Copy> = {
  "pulse-headphones": { eyebrow: "Buy right, the first time", title: "Silence,", accent: "on demand.", copy: "Active noise cancelling, a 40-hour battery and cushions soft enough to forget you're wearing them.", lifestyle: lifeHeadphones, lifestyleAlt: "A woman enjoying music on the Pulse ANC headphones in a cafe" },
  "orbit-watch": { eyebrow: "Wearables", title: "Your day,", accent: "measured.", copy: "A brushed steel case, heart-rate tracking and a full week of battery on a single charge.", lifestyle: lifeWatch, lifestyleAlt: "A man checking his Orbit watch over coffee at golden hour" },
  "stride-runner": { eyebrow: "Footwear", title: "Go the", accent: "distance.", copy: "Breathable mesh and a responsive foam sole tuned for everyday miles and long weekends.", lifestyle: lifeSneaker, lifestyleAlt: "A runner mid-stride wearing Stride Runner sneakers in the park" },
  "metro-backpack": { eyebrow: "Bags", title: "Carry it like", accent: "you mean it.", copy: "Full-grain leather, a padded laptop sleeve and metal zips that never snag.", lifestyle: lifeBackpack, lifestyleAlt: "A man walking through the city wearing the Metro leather backpack" },
};

function copyFor(p: Product): Copy {
  const known = COPY[p.id];
  if (known) return known;
  const words = p.name.split(" ");
  const alt = heroDetailImage(p);
  return { eyebrow: p.category || "Featured", title: words.slice(0, -1).join(" ") || p.name, accent: words.length > 1 ? words[words.length - 1] + "." : "", copy: p.description, lifestyle: alt, lifestyleAlt: `${p.name} detail` };
}

export function HeroCarousel({ embedded = false, slides, autoplay = true, intervalMs = 5000 }: { embedded?: boolean; slides: HeroSlide[]; autoplay?: boolean; intervalMs?: number }) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  // False while the big card is sliding; the small "closer look" card only shows once it has settled.
  const [settled, setSettled] = React.useState(true);
  const [added, setAdded] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<{ p: Product; c: Copy } | null>(null);

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => { setCurrent(api.selectedScrollSnap()); setSettled(false); };
    const onSettle = () => setSettled(true);
    const onReInit = () => { setCurrent(api.selectedScrollSnap()); setSettled(true); };
    setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("settle", onSettle);
    api.on("reInit", onReInit);
    return () => {
      api.off("select", onSelect);
      api.off("settle", onSettle);
      api.off("reInit", onReInit);
    };
  }, [api]);

  React.useEffect(() => {
    if (!api || paused || !autoplay || slides.length < 2) return;
    const t = window.setInterval(() => api.scrollNext(), intervalMs);
    return () => window.clearInterval(t);
  }, [api, paused, autoplay, intervalMs, slides.length]);

  if (!slides.length) return null;

  const addToBag = (id: string) => {
    cart.add(id);
    setAdded(id);
    window.setTimeout(() => setAdded((cur) => (cur === id ? null : cur)), 2200);
  };

  const keyOf = (s: HeroSlide) => (s.kind === "product" ? s.product.id : `promo-${s.promo.id}`);

  return (
    <section className={embedded ? "min-w-0 lg:relative lg:h-full" : "mx-auto max-w-6xl px-4 pt-6 sm:px-6 md:pt-12"}>
      <h1 className="sr-only">CorrectBuy — buy right, the first time</h1>

      <Carousel
        setApi={setApi}
        opts={{ loop: slides.length > 1 }}
        className={cn("flex w-full flex-col overflow-hidden bg-hero-surface", embedded ? "rounded-lg lg:absolute lg:inset-0 lg:[&>div:first-child]:min-h-0 lg:[&>div:first-child]:flex-1" : "rounded-[2rem]")}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <CarouselContent className={embedded ? "lg:h-full" : undefined}>
          {slides.map((s, i) => {
            const active = i === current;
            if (s.kind === "promo") {
              const promo = s.promo;
              return (
                <CarouselItem key={keyOf(s)} className={embedded ? "lg:h-full" : undefined}>
                  <div className={cn("relative grid h-full items-center gap-6 overflow-hidden bg-hero-surface", embedded ? "px-5 pt-12 pb-6 sm:px-8 sm:pt-14 sm:pb-8 lg:grid-cols-2 lg:pt-10" : "rounded-[2rem] px-6 pt-16 pb-10 sm:px-10 sm:pt-20 sm:pb-14 lg:grid-cols-2 lg:px-14 lg:py-16")}>
                    <div className={cn(active ? "animate-in fade-in-0 slide-in-from-bottom-4 duration-700" : "opacity-60")}>
                      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{promo.eyebrow || "Promotion"}</p>
                      <h2 className="font-hero mt-3 text-2xl font-semibold leading-snug tracking-tight sm:text-[1.75rem]">{promo.title}</h2>
                      <p className="mt-4 max-w-md text-muted-foreground sm:text-lg">{promo.body}</p>
                      <a href={promo.cta_href} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 sm:text-base">
                        {promo.cta_label} <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                    {promo.image_url && (
                      <img src={cdnImage(promo.image_url)} alt={promo.title} className="mx-auto aspect-square w-full max-w-[260px] rounded-[2rem] object-cover sm:max-w-sm lg:max-h-[380px] lg:max-w-none lg:w-auto" />
                    )}
                  </div>
                </CarouselItem>
              );
            }
            const p = s.product;
            const c = copyFor(p);
            return (
              <CarouselItem key={keyOf(s)} className={embedded ? "lg:h-full" : undefined}>
                <div className={cn("relative flex flex-col overflow-hidden bg-hero-surface", embedded ? "gap-5 px-5 pt-12 pb-5 sm:gap-6 sm:px-6 sm:pt-14 sm:pb-6 lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-6 lg:pt-8" : "gap-5 rounded-[2rem] px-6 pt-16 pb-10 sm:px-10 sm:pt-20 sm:pb-14 lg:grid lg:grid-cols-2 lg:gap-10 lg:rounded-[2.5rem] lg:px-14 lg:py-20")}>
                  <div className={cn("relative min-w-0 lg:col-start-1 lg:row-start-1 lg:self-end", active ? "animate-in fade-in-0 slide-in-from-bottom-4 duration-700" : "opacity-60")}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary">{c.eyebrow}</p>
                    <h2 className="font-display mt-2 text-lg font-bold leading-snug text-foreground">
                      {c.title} <span className="text-primary">{c.accent}</span>
                    </h2>
                    <p className={cn("font-hero mt-2 text-2xl font-semibold leading-snug text-foreground", embedded ? "sm:text-[1.75rem]" : "sm:text-[1.75rem] lg:text-[2rem]")}>{p.name}</p>
                    <p className={cn("mt-2 max-w-md text-muted-foreground", expanded !== p.id && "line-clamp-2")}>{c.copy}</p>
                    <div className="mt-2 flex items-center gap-4 text-sm font-semibold">
                      <button type="button" aria-expanded={expanded === p.id} onClick={() => setExpanded((cur) => (cur === p.id ? null : p.id))} className="text-primary hover:underline">
                        {expanded === p.id ? "Read less" : "Read more"}
                      </button>
                      <Link to="/search" search={{ q: "", cat: p.categorySlug }} className="text-primary hover:underline">See related</Link>
                    </div>
                  </div>

                  <div className={cn("relative mx-auto w-full min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center", embedded ? "pb-24 sm:pb-40 lg:max-w-[380px] lg:pb-10 lg:pr-6" : "pb-36 sm:pb-40 lg:pb-14 lg:pr-10")}>
                    <div className="absolute -inset-3 bottom-12 rounded-[2rem] bg-brand-badge/15 lg:bottom-7" aria-hidden />
                    <img src={p.image} alt={p.name} width={1024} height={1024} className="relative aspect-square w-full rounded-[2rem] object-cover" />
                    {c.lifestyle && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setModal({ p, c })}
                        aria-label={`See ${p.name} photo details`}
                        className={cn("absolute bottom-0 right-0 block h-auto cursor-pointer overflow-hidden rounded-lg border-4 border-background bg-background p-0 text-center shadow-xl transition-all ease-out hover:scale-105", active && settled ? "scale-100 opacity-100 duration-500" : "pointer-events-none scale-75 opacity-0 duration-150", embedded ? "w-32 sm:w-52 lg:w-40" : "w-40 sm:w-52 lg:w-56")}
                      >
                        <img src={c.lifestyle} alt={c.lifestyleAlt} width={1024} height={1024} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                        <p className="px-3 py-1.5 text-xs font-semibold">{COPY[p.id] ? "Worn by you" : "A closer look"}</p>
                      </Button>
                    )}
                  </div>

                  <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                    <span className={cn("mt-2 block font-display font-extrabold text-primary lg:mt-5", embedded ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl")}>{formatMoney(p.price)}</span>
                    <div className="mt-3 flex w-full max-w-md items-center gap-3">
                      <Link to="/p/$slug" params={{ slug: p.id }} className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 sm:px-6">
                        <span className="truncate">Shop {p.name.split(" ")[0]}</span> <ArrowRight className="h-4 w-4 shrink-0" />
                      </Link>
                      <button onClick={() => addToBag(p.id)} className="inline-flex min-w-0 flex-1 items-center justify-center rounded-full border border-foreground px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted sm:px-6">
                        {added === p.id ? "Added ✓" : "Add to cart"}
                      </button>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 px-5 pb-4 pt-3 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex text-primary" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-3 w-3 fill-current" />)}
            </span>
            <span>4.9 from 2,000+ happy customers</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              {slides.map((s, i) => (
                <Button key={keyOf(s)} variant="ghost" size="icon" aria-label={`Go to slide ${i + 1}`} aria-current={i === current} onClick={() => api?.scrollTo(i)} className="h-8 w-6 rounded-full p-0">
                  <span className={cn("h-2 rounded-full", i === current ? "w-5 bg-primary" : "w-2 bg-muted-foreground/40")} />
                </Button>
              ))}
            </div>
            <span className="text-xs font-bold tabular-nums text-muted-foreground">{String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
            <div className="flex items-center gap-2">
              <CarouselPrevious className="static h-9 w-9 translate-y-0" />
              <CarouselNext className="static h-9 w-9 translate-y-0" />
            </div>
          </div>
        </div>
      </Carousel>

      <Dialog open={modal !== null} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="max-w-lg overflow-hidden p-0">
          {modal && (
            <>
              <DialogTitle className="sr-only">{modal.p.name} — photo details</DialogTitle>
              <Carousel opts={{ loop: true }} className="w-full">
                <CarouselContent>
                  <CarouselItem>
                    <img src={modal.c.lifestyle} alt={modal.c.lifestyleAlt} width={1024} height={1024} className="aspect-square w-full object-cover" />
                  </CarouselItem>
                  <CarouselItem>
                    <img src={modal.p.image} alt={modal.p.name} width={1024} height={1024} className="aspect-square w-full object-cover" />
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </Carousel>
              <div className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold">{modal.p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {modal.p.category} · <span className="font-bold text-primary">{formatMoney(modal.p.price)}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    addToBag(modal.p.id);
                    toast.success(`${modal.p.name} added to your cart`);
                  }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {added === modal.p.id ? "Added ✓" : "Add to cart"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
