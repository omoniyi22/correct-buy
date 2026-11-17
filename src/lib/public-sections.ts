export const PUBLIC_SECTIONS = [
  { id: "trust", label: "Secure payment, delivery & support" },
  { id: "products", label: "Recommended products" },
  { id: "brands", label: "Brands" },
  { id: "help", label: "Help & useful links" },
  { id: "newsletter", label: "Newsletter" },
] as const;
export type PublicSectionId = (typeof PUBLIC_SECTIONS)[number]["id"];
export type PublicSectionSetting = { id: PublicSectionId; visible: boolean };
export const PUBLIC_PAGES = [
  { id: "search", label: "All products & search" },
  { id: "categories", label: "Category directory" },
  { id: "category", label: "Category pages" },
  { id: "collections", label: "Collection directory" },
  { id: "collection", label: "Collection pages" },
  { id: "product", label: "Product pages" },
  { id: "blog", label: "Blog" },
  { id: "article", label: "Blog articles" },
  ...["about", "contact", "faq", "track", "shipping-policy", "returns-policy", "privacy", "terms"].map((id) => ({ id, label: id.split("-").join(" ").replace(/^./, (c) => c.toUpperCase()) })),
];
export function publicPageId(path: string) {
  if (path.startsWith("/blog/")) return "article";
  if (path.startsWith("/p/")) return "product";
  if (path.startsWith("/c/")) return "category";
  if (path.startsWith("/collections/")) return "collection";
  return path.replace(/^\/|\/$/g, "");
}
export function resolvePublicSections(saved: unknown, page: string): PublicSectionSetting[] {
  const defaults = PUBLIC_SECTIONS.filter((s) => page !== "product" || s.id !== "products");
  const known = new Set<string>(defaults.map((s) => s.id));
  const config = saved && typeof saved === "object" && !Array.isArray(saved) ? (saved as Record<string, unknown>)[page] : undefined;
  const out: PublicSectionSetting[] = [];
  if (Array.isArray(config)) for (const row of config) {
    if (!row || typeof row !== "object") continue;
    const { id, visible } = row as { id?: unknown; visible?: unknown };
    if (typeof id !== "string" || !known.has(id) || out.some((s) => s.id === id)) continue;
    out.push({ id: id as PublicSectionId, visible: visible !== false });
  }
  for (const section of defaults) if (!out.some((s) => s.id === section.id)) out.push({ id: section.id, visible: true });
  return out;
}
export function movePublicSection<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const item = next[index];
  if (item === undefined) return list;
  next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}