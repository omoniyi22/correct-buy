/** Homepage sections the admin can reorder and hide from the dashboard. */
export const HOME_SECTIONS = [
  { id: "hero", label: "Hero carousel" },
  { id: "perks", label: "Delivery & warranty perks" },
  { id: "brands", label: "Brands" },
  { id: "categories", label: "Shop by category" },
  { id: "collections", label: "Shop collections" },
  { id: "best-sellers", label: "Featured picks" },
  { id: "new-arrivals", label: "New arrivals" },
  { id: "condition", label: "Brand new / Fairly used / UK used" },
  { id: "finder", label: "Product finder" },
  { id: "featured", label: "Product of the month" },
  { id: "how", label: "How we pick products" },
  { id: "stats", label: "Store stats" },
  { id: "reviews", label: "Customer reviews" },
  { id: "faq", label: "FAQ" },
  { id: "newsletter", label: "Newsletter" },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];
export type HomeSectionSetting = { id: HomeSectionId; visible: boolean };

const known = new Set<string>(HOME_SECTIONS.map((s) => s.id));

/**
 * Turns the saved layout into the full ordered list: saved sections keep their
 * order and visibility, unknown ids are dropped, and sections added later are
 * appended (visible) so a new section never silently disappears.
 */
export function resolveHomeSections(saved: unknown): HomeSectionSetting[] {
  const out: HomeSectionSetting[] = [];
  const seen = new Set<string>();
  if (Array.isArray(saved)) {
    for (const row of saved) {
      const id = row && typeof row === "object" ? (row as { id?: unknown }).id : undefined;
      if (typeof id !== "string" || !known.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push({ id: id as HomeSectionId, visible: (row as { visible?: unknown }).visible !== false });
    }
  }
  for (const s of HOME_SECTIONS) if (!seen.has(s.id)) out.push({ id: s.id, visible: true });
  return out;
}

export function moveSection(list: HomeSectionSetting[], index: number, delta: number): HomeSectionSetting[] {
  const to = index + delta;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  if (!item) return list;
  next.splice(to, 0, item);
  return next;
}

export const sectionLabel = (id: HomeSectionId) => HOME_SECTIONS.find((s) => s.id === id)?.label ?? id;
