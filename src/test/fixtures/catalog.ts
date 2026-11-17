import type { Catalog, Product } from "@/lib/products";

const make = (id: string, name: string, category: string, price: number, description: string, brand: string, available = 10): Product => ({
  id,
  dbId: `db-${id}`,
  name,
  brand,
  category,
  categorySlug: category.toLowerCase(),
  price,
  compareAt: null,
  image: `/img/${id}.jpg`,
  gallery: [`/img/${id}.jpg`],
  description,
  specs: [],
  featured: true,
  createdAt: "2026-01-01T00:00:00Z",
  variants: [{ id: `00000000-0000-0000-0000-${id.length.toString().padStart(12, "0")}`.slice(0, 36), sku: id.toUpperCase(), name: "Default", color: null, size: null, price, compareAt: null, available, lowStock: 3 }],
  seoTitle: null,
  seoDescription: null,
  tags: [],
});

/** The original four-product shelf, used so tests don't depend on live data. */
export const fixtureCatalog: Catalog = {
  categories: [
    { id: "c1", slug: "audio", name: "Audio", description: "" },
    { id: "c2", slug: "wearables", name: "Wearables", description: "" },
    { id: "c3", slug: "footwear", name: "Footwear", description: "" },
    { id: "c4", slug: "bags", name: "Bags", description: "" },
  ],
  products: [
    make("pulse-headphones", "Pulse ANC Headphones", "Audio", 18900000, "Noise cancelling, 40-hour battery and pillow-soft ear cushions for all-day listening.", "Pulse"),
    make("orbit-watch", "Orbit Smartwatch", "Wearables", 24900000, "Steel case, heart-rate tracking and a week of battery on a single charge.", "Orbit"),
    make("stride-runner", "Stride Runner", "Footwear", 12900000, "Breathable mesh upper with a responsive foam sole made for daily miles.", "Stride", 0),
    make("metro-backpack", "Metro Leather Backpack", "Bags", 15900000, "Full-grain leather, padded laptop sleeve and smooth metal zips.", "LeatherWorks"),
  ],
};
