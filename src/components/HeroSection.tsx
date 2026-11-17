import { HeroCarousel } from "@/components/HeroCarousel";
import { HeroFeaturedProduct } from "@/components/HeroFeaturedProduct";
import { resolveHeroSlides, type HeroSettings } from "@/lib/hero";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

/** The homepage split hero: featured stack on the left, main carousel on the right.
 *  On desktop the main carousel fills exactly the featured column's height. */
export function HeroSection({ settings, catalog, className }: { settings: HeroSettings; catalog: Product[]; className?: string }) {
  const { featured, main } = settings.carousels;
  const featuredSlides = featured.enabled ? resolveHeroSlides(featured, catalog, settings.promotions) : [];
  const mainSlides = main.enabled ? resolveHeroSlides(main, catalog, settings.promotions) : [];
  const split = featuredSlides.length > 0 && mainSlides.length > 0;
  if (!featuredSlides.length && !mainSlides.length) return null;
  return (
    <div className={cn("mx-auto grid max-w-6xl min-w-0 gap-5 px-4 pt-3 pb-6 sm:px-6 md:pt-4 md:pb-10", split && "lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]", className)}>
      {featuredSlides.length > 0 && (
        <div className={cn("min-w-0", !split && "mx-auto w-full max-w-sm")}>
          <HeroFeaturedProduct slides={featuredSlides} autoplay={featured.autoplay} intervalMs={featured.interval_ms} />
        </div>
      )}
      {mainSlides.length > 0 && <HeroCarousel embedded={split} slides={mainSlides} autoplay={main.autoplay} intervalMs={main.interval_ms} />}
    </div>
  );
}
