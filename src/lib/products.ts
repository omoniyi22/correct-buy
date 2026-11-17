import { supabase } from "@/integrations/supabase/client";
import { setCollections, type Collection } from "@/lib/collections";
import { DEFAULT_TAG_COLOR } from "@/lib/badge";
import { productImages } from "@/lib/storage";

/** All money is integer minor units (kobo). */
export type Variant = {
  id: string;
  sku: string;
  name: string;
  color: string | null;
  size: string | null;
  price: number;
  compareAt: number | null;
  available: number;
  lowStock: number;
};

export type Product = {
  /** URL slug — the stable public id used in links, search and drag-and-drop. */
  id: string;
  dbId: string;
  name: string;
  brand: string;
  category: string;
  categorySlug: string;
  /** Lowest variant price. */
  price: number;
  compareAt: number | null;
  image: string;
  gallery: string[];
  description: string;
  specs: { k: string; v: string }[];
  featured: boolean;
  createdAt: string;
  variants: Variant[];
  seoTitle: string | null;
  seoDescription: string | null;
  /** Tag names, e.g. New, Fairly used, UK used. */
  tags: string[];
};

export type Category = { id: string; slug: string; name: string; description: string };

/** A product tag with the colour shoppers see on its chip. */
export type Tag = { id: string; name: string; color: string };

export type Catalog = { products: Product[]; categories: Category[]; collections?: Collection[]; tags?: Tag[] };

// The catalog is small and public: it is loaded once by the root route (SSR + client)
// and published here so synchronous helpers (search, drag, cart) can read it.
export let products: Product[] = [];
export let categories: Category[] = [];
let tagRegistry: Tag[] = [];
let tagColorByName = new Map<string, string>();
let bySlug = new Map<string, Product>();
let byVariant = new Map<string, { product: Product; variant: Variant }>();

/** The colour shoppers see on a tag chip; a tag with no colour falls back. */
export const tagColor = (name: string) => tagColorByName.get(name) ?? DEFAULT_TAG_COLOR;

export function setCatalog(c: Catalog) {
  setCollections(c.collections ?? []);
  tagRegistry = c.tags ?? [];
  tagColorByName = new Map(tagRegistry.map((t) => [t.name, t.color || DEFAULT_TAG_COLOR]));
  if (c.products === products && c.categories === categories) return;
  products = c.products;
  categories = c.categories;
  bySlug = new Map(products.map((p) => [p.id, p]));
  byVariant = new Map(products.flatMap((p) => p.variants.map((v) => [v.id, { product: p, variant: v }] as const)));
}

export const getProduct = (slug: string) => bySlug.get(slug);
export const getVariant = (variantId: string) => byVariant.get(variantId);
export const defaultVariant = (p: Product) => p.variants.find((v) => v.available > 0) ?? p.variants[0];
export const totalAvailable = (p: Product) => p.variants.reduce((n, v) => n + v.available, 0);

export async function fetchCatalog(): Promise<Catalog> {
  const [cats, prods, vars, groups, tagRows] = await Promise.all([
    supabase.from("categories").select("id, slug, name, description").order("sort"),
    supabase
      .from("products")
      .select("id, slug, name, brand, description, specs, image_refs, featured, created_at, seo_title, seo_description, category_id, tag_ids")
      .eq("published", true)
      .order("created_at"),
    supabase.from("storefront_variants").select("*").order("sort"),
    supabase.from("collections").select("*").eq("published", true).order("sort").order("name"),
    supabase.from("tags").select("id, name, color"),
  ]);
  if (cats.error) throw cats.error;
  if (prods.error) throw prods.error;
  if (vars.error) throw vars.error;
  if (groups.error) throw groups.error;
  const tags: Tag[] = (tagRows.data ?? []).map((t) => ({ id: t.id, name: t.name, color: t.color ?? DEFAULT_TAG_COLOR }));
  const tagById = new Map(tags.map((t) => [t.id, t.name]));
  const catById = new Map(cats.data.map((c) => [c.id, c]));
  const list: Product[] = prods.data.map((p) => {
    const vs: Variant[] = vars.data
      .filter((v) => v.product_id === p.id)
      .map((v) => ({
        id: v.id!,
        sku: v.sku!,
        name: v.name!,
        color: v.option_color,
        size: v.option_size,
        price: v.price!,
        compareAt: v.compare_at_price,
        available: v.qty_available ?? 0,
        lowStock: v.low_stock_threshold ?? 5,
      }));
    const cheapest = vs.reduce<Variant | undefined>((a, v) => (!a || v.price < a.price ? v : a), undefined);
    const cat = p.category_id ? catById.get(p.category_id) : undefined;
    return {
      id: p.slug,
      dbId: p.id,
      name: p.name,
      brand: p.brand,
      category: cat?.name ?? "Other",
      categorySlug: cat?.slug ?? "other",
      price: cheapest?.price ?? 0,
      compareAt: cheapest?.compareAt ?? null,
      image: productImages(p.image_refs)[0] ?? "",
      gallery: productImages(p.image_refs),
      description: p.description,
      specs: Array.isArray(p.specs) ? (p.specs as { k: string; v: string }[]) : [],
      featured: p.featured,
      createdAt: p.created_at,
      variants: vs,
      seoTitle: p.seo_title,
      seoDescription: p.seo_description,
      tags: (p.tag_ids ?? []).map((t) => tagById.get(t)).filter((t): t is string => !!t),
    };
  });
  return { products: list.filter((p) => p.variants.length > 0), categories: cats.data, collections: groups.data, tags };
}

export const catalogQuery = {
  queryKey: ["catalog"] as const,
  queryFn: fetchCatalog,
  staleTime: 60_000,
};
