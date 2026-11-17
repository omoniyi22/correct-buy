import { useEffect, useState } from "react";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { AdminHeader, btn, btnGhost, Card, Field, input } from "@/components/admin/ui";
import { HeroSection } from "@/components/HeroSection";
import { HeroCarousel } from "@/components/HeroCarousel";
import { HeroFeaturedProduct } from "@/components/HeroFeaturedProduct";
import { catalogQuery } from "@/lib/products";
import { heroSettingsQuery, resolveHeroSlides, type HeroCarouselConfig, type HeroCarouselId, type HeroPromotion, type HeroSettings } from "@/lib/hero";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/admin/hero")({
  head: () => ({ meta: [{ title: "Homepage hero — CorrectBuy admin" }, { name: "description", content: "Set up the two homepage hero carousels." }, { property: "og:title", content: "Homepage hero — CorrectBuy admin" }, { property: "og:description", content: "Set up the two homepage hero carousels." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: HeroAdmin,
});

const LABELS: Record<HeroCarouselId, { title: string; sub: string }> = {
  featured: { title: "Featured stack (left)", sub: "The card deck beside the main carousel." },
  main: { title: "Main carousel (right)", sub: "The large sliding banner." },
};

function HeroAdmin() {
  const qc = useQueryClient();
  const settings = useQuery(heroSettingsQuery);
  const catalog = useQuery(catalogQuery);
  const [draft, setDraft] = useState<HeroSettings | null>(null);
  const [saving, setSaving] = useState<HeroCarouselId | null>(null);

  useEffect(() => { if (settings.data) setDraft(structuredClone(settings.data)); }, [settings.data]);

  if (!draft || !catalog.data) return <FormSkeleton fields={5} />;
  const products = catalog.data.products;

  const update = (id: HeroCarouselId, patch: Partial<HeroCarouselConfig>) =>
    setDraft((d) => (d ? { ...d, carousels: { ...d.carousels, [id]: { ...d.carousels[id], ...patch } } } : d));

  const save = async (id: HeroCarouselId) => {
    const c = draft.carousels[id];
    setSaving(id);
    const { error } = await supabase.from("hero_carousels").update({
      enabled: c.enabled, autoplay: c.autoplay, interval_ms: c.interval_ms, product_count: c.product_count, promo_count: c.promo_count,
      product_ids: c.product_ids, promo_ids: c.promo_ids, updated_at: new Date().toISOString(),
    }).eq("id", id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${LABELS[id].title} saved`);
    qc.invalidateQueries({ queryKey: heroSettingsQuery.queryKey });
  };

  return (
    <div>
      <AdminHeader title="Homepage hero" sub="Choose what each hero carousel shows, how many slides, and whether it slides on its own. The preview updates as you edit; shoppers see changes after you save." />

      <Card className="mb-6">
        <p className="mb-3 text-sm font-semibold">Live preview — both carousels (desktop layout)</p>
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <div className="min-w-[1024px]"><HeroSection settings={draft} catalog={products} className="lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]" /></div>
        </div>
      </Card>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        {(["featured", "main"] as const).map((id) => (
          <CarouselEditor key={id} id={id} config={draft.carousels[id]} promotions={draft.promotions} products={products} saving={saving === id}
            onChange={(patch) => update(id, patch)} onSave={() => save(id)} />
        ))}
      </div>

      <Promotions promotions={draft.promotions} onChanged={() => qc.invalidateQueries({ queryKey: heroSettingsQuery.queryKey })} />
    </div>
  );
}

function CarouselEditor({ id, config, promotions, products, saving, onChange, onSave }: {
  id: HeroCarouselId; config: HeroCarouselConfig; promotions: HeroPromotion[]; products: import("@/lib/products").Product[]; saving: boolean;
  onChange: (patch: Partial<HeroCarouselConfig>) => void; onSave: () => void;
}) {
  const slides = config.enabled ? resolveHeroSlides(config, products, promotions) : [];
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const move = (i: number, dir: -1 | 1) => {
    const next = [...config.product_ids];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    const a = next[i]!, b = next[j]!;
    next[i] = b; next[j] = a;
    onChange({ product_ids: next });
  };
  const byId = new Map(products.map((p) => [p.dbId, p]));

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{LABELS[id].title}</h2>
          <p className="text-sm text-muted-foreground">{LABELS[id].sub}</p>
        </div>
        <button className={btn} disabled={saving} onClick={onSave}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm font-semibold">
          Show this carousel <Switch checked={config.enabled} onCheckedChange={(v) => onChange({ enabled: v })} />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm font-semibold">
          Slide automatically <Switch checked={config.autoplay} onCheckedChange={(v) => onChange({ autoplay: v })} />
        </label>
        <Field label="Seconds per slide">
          <input type="number" min={1.5} max={30} step={0.5} className={input} disabled={!config.autoplay} value={config.interval_ms / 1000}
            onChange={(e) => onChange({ interval_ms: Math.round(Math.min(30, Math.max(1.5, Number(e.target.value) || 5)) * 1000) })} />
        </Field>
        <div />
        <Field label="Number of product slides">
          <input type="number" min={0} max={12} className={input} value={config.product_count}
            onChange={(e) => onChange({ product_count: Math.min(12, Math.max(0, Math.floor(Number(e.target.value) || 0))) })} />
        </Field>
        <Field label="Number of promotion cards">
          <input type="number" min={0} max={6} className={input} value={config.promo_count}
            onChange={(e) => onChange({ promo_count: Math.min(6, Math.max(0, Math.floor(Number(e.target.value) || 0))) })} />
        </Field>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold">Products <span className="font-normal text-muted-foreground">— picked ones show first, in this order; empty spots are filled with featured products.</span></p>
        {config.product_ids.length > 0 && (
          <ol className="mt-2 space-y-1">
            {config.product_ids.map((pid, i) => {
              const p = byId.get(pid);
              if (!p) return null;
              return (
                <li key={pid} className="flex items-center gap-2 rounded-lg bg-muted px-2 py-1.5 text-sm">
                  <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <img src={p.image} alt="" className="h-8 w-8 rounded object-cover" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {i >= config.product_count && <span className="text-xs text-destructive">not shown</span>}
                  <button aria-label="Move up" className="p-1" onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button aria-label="Move down" className="p-1" onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button aria-label={`Remove ${p.name}`} className="p-1" onClick={() => onChange({ product_ids: config.product_ids.filter((x) => x !== pid) })}><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-border">
          {products.map((p) => (
            <label key={p.dbId} className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-0 hover:bg-muted">
              <input type="checkbox" checked={config.product_ids.includes(p.dbId)} onChange={() => onChange({ product_ids: toggle(config.product_ids, p.dbId) })} />
              <img src={p.image} alt="" className="h-7 w-7 rounded object-cover" />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground">{formatMoney(p.price)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold">Promotion cards</p>
        {promotions.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No promotions yet — add one below.</p> : (
          <div className="mt-2 rounded-lg border border-border">
            {promotions.map((pr) => (
              <label key={pr.id} className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-0 hover:bg-muted">
                <input type="checkbox" checked={config.promo_ids.includes(pr.id)} onChange={() => onChange({ promo_ids: toggle(config.promo_ids, pr.id) })} />
                <span className="min-w-0 flex-1 truncate">{pr.title}</span>
              </label>
            ))}
          </div>
        )}
        {config.promo_count > config.promo_ids.length && <p className="mt-1 text-xs text-muted-foreground">Pick {config.promo_count - config.promo_ids.length} more to fill every promotion spot.</p>}
      </div>

      <div className="mt-6">
        <p className="mb-2 text-sm font-semibold">Preview — {slides.length} slide{slides.length === 1 ? "" : "s"}{!config.enabled && " (hidden on the store)"}</p>
        {slides.length === 0 ? <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing to show.</p> : (
          <div className="rounded-lg border border-border bg-background p-4">
            {id === "featured"
              ? <div className="mx-auto max-w-[320px]"><HeroFeaturedProduct slides={slides} autoplay={config.autoplay} intervalMs={config.interval_ms} /></div>
              : <div className="lg:h-[640px]"><HeroCarousel embedded slides={slides} autoplay={config.autoplay} intervalMs={config.interval_ms} /></div>}
          </div>
        )}
      </div>
    </Card>
  );
}

const emptyPromo = { eyebrow: "", title: "", body: "", image_url: "", cta_label: "Shop now", cta_href: "/shop" };

function Promotions({ promotions, onChanged }: { promotions: HeroPromotion[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<(typeof emptyPromo & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!editing || !editing.title.trim()) { toast.error("Give the promotion a title"); return; }
    setBusy(true);
    const { id, ...row } = editing;
    const { error } = id ? await supabase.from("hero_promotions").update(row).eq("id", id) : await supabase.from("hero_promotions").insert(row);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Promotion saved");
    setEditing(null);
    onChanged();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this promotion?")) return;
    const { error } = await supabase.from("hero_promotions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    onChanged();
  };

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Promotion cards</h2>
          <p className="text-sm text-muted-foreground">Create the promotions you can pick for either carousel.</p>
        </div>
        <button className={btnGhost} onClick={() => setEditing({ ...emptyPromo })}><Plus className="h-4 w-4" /> New promotion</button>
      </div>
      <ul className="mt-4 divide-y divide-border">
        {promotions.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
            {p.image_url ? <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-muted" />}
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.title}</p><p className="truncate text-xs text-muted-foreground">{p.eyebrow} · {p.cta_label} → {p.cta_href}</p></div>
            <button className={btnGhost} onClick={() => setEditing({ ...p })}>Edit</button>
            <button className={btnGhost} aria-label={`Delete ${p.title}`} onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      {editing && (
        <div className="mt-4 grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
          <Field label="Small label"><input className={input} value={editing.eyebrow} onChange={(e) => setEditing({ ...editing, eyebrow: e.target.value })} /></Field>
          <Field label="Title"><input className={input} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
          <Field label="Text" className="sm:col-span-2"><textarea rows={2} className={input} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></Field>
          <Field label="Image link (optional)" className="sm:col-span-2"><input className={input} placeholder="https://…" value={editing.image_url} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></Field>
          <Field label="Button text"><input className={input} value={editing.cta_label} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} /></Field>
          <Field label="Button goes to"><input className={input} value={editing.cta_href} onChange={(e) => setEditing({ ...editing, cta_href: e.target.value })} /></Field>
          <div className="flex gap-2 sm:col-span-2">
            <button className={btn} disabled={busy} onClick={save}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save promotion</button>
            <button className={btnGhost} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
    </Card>
  );
}
