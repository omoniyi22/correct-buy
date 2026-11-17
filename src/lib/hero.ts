import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/products";

export type HeroCarouselId = "featured" | "main";

export type HeroPromotion = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  image_url: string;
  cta_label: string;
  cta_href: string;
};

export type HeroCarouselConfig = {
  id: HeroCarouselId;
  enabled: boolean;
  autoplay: boolean;
  interval_ms: number;
  product_count: number;
  promo_count: number;
  product_ids: string[];
  promo_ids: string[];
};

export type HeroSettings = { carousels: Record<HeroCarouselId, HeroCarouselConfig>; promotions: HeroPromotion[] };

export const defaultCarousel = (id: HeroCarouselId): HeroCarouselConfig => ({
  id,
  enabled: true,
  autoplay: true,
  interval_ms: 5000,
  product_count: 4,
  promo_count: id === "featured" ? 1 : 0,
  product_ids: [],
  promo_ids: [],
});

export type HeroSlide = { kind: "product"; product: Product } | { kind: "promo"; promo: HeroPromotion };

/** Keep the detail card populated even when a product has no second photo. */
export const heroDetailImage = (p: Pick<Product, "image" | "gallery">) => p.gallery.find((image) => image && image !== p.image) || p.image;

/**
 * Builds the slides for one carousel: the chosen products first (in the order picked),
 * topped up from the catalog (featured first) until `product_count` is reached, then up to
 * `promo_count` promotion cards from the chosen promotions.
 */
export function resolveHeroSlides(config: HeroCarouselConfig, catalog: Product[], promotions: HeroPromotion[]): HeroSlide[] {
  const byId = new Map(catalog.map((p) => [p.dbId, p]));
  const chosen = config.product_ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  const rest = [...catalog].sort((a, b) => Number(b.featured) - Number(a.featured)).filter((p) => !chosen.includes(p));
  const picks = [...chosen, ...rest].slice(0, Math.max(0, config.product_count));
  const promoById = new Map(promotions.map((p) => [p.id, p]));
  const promos = config.promo_ids.map((id) => promoById.get(id)).filter((p): p is HeroPromotion => !!p).slice(0, Math.max(0, config.promo_count));
  return [...picks.map((product) => ({ kind: "product" as const, product })), ...promos.map((promo) => ({ kind: "promo" as const, promo }))];
}

export async function fetchHeroSettings(): Promise<HeroSettings> {
  const [c, p] = await Promise.all([
    supabase.from("hero_carousels").select("*"),
    supabase.from("hero_promotions").select("*").order("created_at"),
  ]);
  if (c.error) throw c.error;
  if (p.error) throw p.error;
  const rows = (c.data ?? []) as HeroCarouselConfig[];
  const pick = (id: HeroCarouselId) => rows.find((r) => r.id === id) ?? defaultCarousel(id);
  return { carousels: { featured: pick("featured"), main: pick("main") }, promotions: p.data ?? [] };
}

export const heroSettingsQuery = {
  queryKey: ["hero-settings"] as const,
  queryFn: fetchHeroSettings,
  staleTime: 60_000,
};
