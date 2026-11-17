import { Link } from "@tanstack/react-router";
import { cdnImage } from "@/lib/storage";
import { useRef, useState } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Swiper, SwiperSlide, type SwiperClass } from "swiper/react";
import { Autoplay, EffectCreative } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-creative";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { totalAvailable, type Product } from "@/lib/products";
import type { HeroPromotion, HeroSlide } from "@/lib/hero";

function ProductCardBody({ pick }: { pick: Product }) {
  const available = totalAvailable(pick) > 0;
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-primary">Featured product</p>
      <Link to="/p/$slug" params={{ slug: pick.id }} className="-mx-5 my-4 block shrink-0 overflow-hidden bg-muted sm:-mx-6 lg:mx-0 lg:my-3 lg:rounded-lg">
        <img src={pick.image} alt={pick.name} width={1024} height={1024} className="aspect-square w-full object-cover lg:aspect-auto lg:h-72" />
      </Link>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{pick.category}</p>
      <h2 className="mt-2 line-clamp-2 font-display text-xl font-bold leading-tight sm:text-2xl lg:mt-1 lg:text-xl">
        <Link to="/p/$slug" params={{ slug: pick.id }}>{pick.name}</Link>
      </h2>
      <p className="mt-3 line-clamp-3 text-xs text-muted-foreground sm:text-sm lg:mt-2 lg:line-clamp-2 lg:text-xs">{pick.description}</p>
      <p className="mt-5 font-display text-2xl font-bold text-primary sm:text-3xl lg:mt-3 lg:text-2xl">{formatMoney(pick.price)}</p>
      <div className="mt-auto flex shrink-0 flex-col gap-3 pt-6 lg:flex-row lg:gap-2 lg:pt-4">
        <Button disabled={!available} className="w-full lg:flex-1 lg:px-3" onClick={() => {
          cart.add(pick.id);
          toast.success(`${pick.name} added to your cart`);
        }}>
          <ShoppingBag />{available ? "Add to cart" : "Out of stock"}
        </Button>
        <Button asChild variant="outline" className="w-full lg:flex-1 lg:px-3">
          <Link to="/p/$slug" params={{ slug: pick.id }}>View product <ArrowRight /></Link>
        </Button>
      </div>
    </>
  );
}

function PromoCardBody({ promo, picks }: { promo: HeroPromotion; picks: Product[] }) {
  const internal = promo.cta_href.startsWith("/");
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-primary">{promo.eyebrow || "Promotion"}</p>
      {promo.image_url ? (
        <img src={cdnImage(promo.image_url)} alt={promo.title} className="my-4 aspect-square w-full shrink-0 rounded-lg object-cover lg:my-3 lg:aspect-auto lg:h-72" />
      ) : (
        <div className="my-4 grid aspect-square shrink-0 grid-cols-2 gap-2 overflow-hidden rounded-lg bg-muted lg:my-3 lg:aspect-auto lg:h-72">
          {picks.slice(0, 4).map((pick) => <img key={pick.id} src={pick.image} alt={pick.name} className="h-full min-h-0 w-full object-cover" />)}
        </div>
      )}
      <h2 className="mt-2 font-display text-2xl font-bold leading-tight lg:mt-1 lg:text-xl">{promo.title}</h2>
      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground lg:mt-2 lg:line-clamp-2 lg:text-xs">{promo.body}</p>
      <div className="mt-auto pt-6 lg:pt-4">
        <Button asChild className="w-full">
          {internal ? <a href={promo.cta_href}>{promo.cta_label} <ArrowRight /></a> : <a href={promo.cta_href} target="_blank" rel="noreferrer">{promo.cta_label} <ArrowRight /></a>}
        </Button>
      </div>
    </>
  );
}

export function HeroFeaturedProduct({ slides, autoplay = true, intervalMs = 5000 }: { slides: HeroSlide[]; autoplay?: boolean; intervalMs?: number }) {
  const picks = slides.flatMap((s) => (s.kind === "product" ? [s.product] : []));
  const [active, setActive] = useState(0);
  const swiperRef = useRef<SwiperClass | null>(null);

  const pause = () => swiperRef.current?.autoplay?.stop();
  const resume = () => { if (autoplay) swiperRef.current?.autoplay?.start(); };
  if (!slides.length) return null;

  return (
    <aside className="min-w-0" aria-label="Featured products and promotion" aria-roledescription="carousel" tabIndex={0}
      onFocusCapture={pause}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) resume(); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") { event.preventDefault(); swiperRef.current?.slideNext(); }
        if (event.key === "ArrowLeft") { event.preventDefault(); swiperRef.current?.slidePrev(); }
      }}
    >
      <div className="featured-swiper-bleed">
      <Swiper
        key={`${autoplay}-${intervalMs}-${slides.length}`}
        modules={[Autoplay, EffectCreative]}
        effect="creative"
        grabCursor
        loop={slides.length > 2}
        // A quick flick or a slow drag past halfway both advance the card;
        // without longSwipes a slow drag just snaps back and can feel broken.
        longSwipes
        longSwipesRatio={0.5}
        speed={700}
        autoplay={autoplay ? { delay: intervalMs, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
        watchSlidesProgress
        onSwiper={(swiper) => { swiperRef.current = swiper; }}
        onRealIndexChange={(swiper) => setActive(swiper.realIndex)}
        creativeEffect={{
          limitProgress: 3,
          // front card leaving to the left, tilted like a tossed card
          prev: { translate: ["-120%", 0, 0], rotate: [0, 0, -18], opacity: 0 },
          // Original centered deck: the next card recedes behind the front card.
          next: { translate: [0, 0, -100], scale: 0.94, opacity: 1, shadow: true },
        }}
        className="featured-swiper"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide.kind === "product" ? slide.product.id : `promo-${slide.promo.id}`} className="featured-swiper-slide"
            data-featured-card={slide.kind === "product" ? slide.product.id : "promotion"} inert={index !== active}>
            {slide.kind === "product" ? <ProductCardBody pick={slide.product} /> : <PromoCardBody promo={slide.promo} picks={picks} />}
          </SwiperSlide>
        ))}
      </Swiper>
      </div>
    </aside>
  );
}
