import { useEffect, useState } from "react";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { uploadStoreImage } from "@/lib/uploads.functions";
import { imageRefs, productImages, storage, type ImageRef } from "@/lib/storage";
import { useServerFn } from "@tanstack/react-start";
import { fileToBase64 } from "@/lib/file-to-base64";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toMinor } from "@/lib/money";
import { chipStyle, DEFAULT_TAG_COLOR, TAG_COLORS } from "@/lib/badge";
import { AdminHeader, btn, btnGhost, Card, Field, input } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/products/$id")({
  head: () => ({"meta": [{"title": "Product editor \u2014 CorrectBuy"}, {"name": "description", "content": "Edit CorrectBuy products and variants."}, {"property": "og:title", "content": "Product editor \u2014 CorrectBuy"}, {"property": "og:description", "content": "Edit CorrectBuy products and variants."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: ProductEditor,
});

type V = { id?: string; sku: string; name: string; option_color: string; option_size: string; price: string; compare_at_price: string; supplier_id: string; supplier_sku: string; cost_price: string; lead_time_days: string; qty_on_hand: number; low_stock_threshold: string };
type P = { name: string; slug: string; brand: string; category_id: string; description: string; image_refs: ImageRef[]; specs: { k: string; v: string }[]; featured: boolean; published: boolean; seo_title: string; seo_description: string; tag_ids: string[] };

const blankV = (): V => ({ sku: "", name: "Default", option_color: "", option_size: "", price: "", compare_at_price: "", supplier_id: "", supplier_sku: "", cost_price: "", lead_time_days: "", qty_on_hand: 0, low_stock_threshold: "5" });
const blankP: P = { name: "", slug: "", brand: "", category_id: "", description: "", image_refs: [], specs: [], featured: false, published: false, seo_title: "", seo_description: "", tag_ids: [] };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const major = (n: number | null) => (n === null || n === undefined ? "" : String(n / 100));

/** A row of colour dots; the chosen one gets a ring. */
function Swatches({ name, value, label, onChange }: { name: string; value: string; label: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TAG_COLORS.map((c) => (
        <label key={c.hex} className="cursor-pointer">
          <input type="radio" name={name} aria-label={`${c.name} for ${label}`} className="peer sr-only" checked={value === c.hex} onChange={() => onChange(c.hex)} />
          <span className="block h-5 w-5 rounded-full ring-2 ring-transparent peer-checked:ring-foreground peer-focus-visible:ring-foreground" style={{ background: c.hex }} />
        </label>
      ))}
      <label className="relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border border-border" title="Custom colour" style={{ background: TAG_COLORS.some((c) => c.hex === value) ? "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" : value }}>
        <input type="color" aria-label={`Custom colour for ${label}`} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={value.length === 7 ? value : "#cbd5e1"} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

function ProductEditor() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const uploadImage = useServerFn(uploadStoreImage);
  const [p, setP] = useState<P>(blankP);
  const [vs, setVs] = useState<V[]>([blankV()]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [initialStock, setInitialStock] = useState<Record<number, string>>({});

  const cats = useQuery({ queryKey: ["admin-cats"], queryFn: async () => (await supabase.from("categories").select("id, name").order("sort")).data ?? [] });
  const sups = useQuery({ queryKey: ["admin-suppliers-min"], queryFn: async () => (await supabase.from("suppliers").select("id, name").order("name")).data ?? [] });
  const tags = useQuery({ queryKey: ["admin-tags"], queryFn: async () => (await supabase.from("tags").select("id, name, color").order("name")).data ?? [] });
  const [newTag, setNewTag] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(DEFAULT_TAG_COLOR);
  const addTag = async () => {
    const name = newTag.trim();
    if (!name) return;
    const r = await supabase.from("tags").insert({ name, color: newTagColor }).select("id").single();
    if (r.error) return void toast.error(r.error.code === "23505" ? "That tag already exists" : r.error.message);
    setNewTag(""); await tags.refetch();
    setP((x) => ({ ...x, tag_ids: [...x.tag_ids, r.data.id] }));
  };
  const recolor = async (tid: string, color: string) => {
    const r = await supabase.from("tags").update({ color }).eq("id", tid);
    if (r.error) return void toast.error(r.error.message);
    await tags.refetch();
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };
  const deleteTag = async (tid: string) => {
    if (!confirm("Delete this tag from every product?")) return;
    const r = await supabase.from("tags").delete().eq("id", tid);
    if (r.error) return void toast.error(r.error.message);
    setP((x) => ({ ...x, tag_ids: x.tag_ids.filter((t) => t !== tid) })); await tags.refetch();
  };
  const existing = useQuery({
    queryKey: ["admin-product", id],
    enabled: !isNew,
    queryFn: async () => (await supabase.from("products").select("*, product_variants(*)").eq("id", id).single()).data,
  });

  useEffect(() => {
    const d = existing.data;
    if (!d) return;
    setP({ name: d.name, slug: d.slug, brand: d.brand, category_id: d.category_id ?? "", description: d.description, image_refs: imageRefs(d.image_refs), specs: (d.specs as { k: string; v: string }[]) ?? [], featured: d.featured, published: d.published, seo_title: d.seo_title ?? "", seo_description: d.seo_description ?? "", tag_ids: d.tag_ids ?? [] });
    setVs([...d.product_variants].sort((a, b) => a.sort - b.sort).map((v) => ({ id: v.id, sku: v.sku, name: v.name, option_color: v.option_color ?? "", option_size: v.option_size ?? "", price: major(v.price), compare_at_price: major(v.compare_at_price), supplier_id: v.supplier_id ?? "", supplier_sku: v.supplier_sku ?? "", cost_price: major(v.cost_price), lead_time_days: v.lead_time_days?.toString() ?? "", qty_on_hand: v.qty_on_hand, low_stock_threshold: String(v.low_stock_threshold) })));
  }, [existing.data]);

  const upload = async (file: File, main: boolean) => {
    if (file.size > 5 * 1024 * 1024) return void toast.error("Images must be under 5 MB");
    setUploading(true);
    let ref: ImageRef;
    try {
      const result = await uploadImage({ data: { name: file.name, type: file.type, data: await fileToBase64(file), folder: "products" } });
      ref = { key: result.key, storage: result.storage };
    } catch (err) {
      setUploading(false);
      return void toast.error(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
    setP((x) => ({ ...x, image_refs: main ? [ref, ...x.image_refs.slice(1)] : [...x.image_refs, ref] }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vs.length) return void toast.error("Add at least one variant");
    if (vs.some((v) => !v.sku.trim() || !v.price)) return void toast.error("Every variant needs a SKU and price");
    setBusy(true);
    const row = { ...p, brand: p.brand.trim(), slug: p.slug || slugify(p.name), category_id: p.category_id || null, seo_title: p.seo_title || null, seo_description: p.seo_description || null, updated_at: new Date().toISOString() };
    const res = isNew ? await supabase.from("products").insert(row).select("id").single() : await supabase.from("products").update(row).eq("id", id).select("id").single();
    if (res.error || !res.data) { setBusy(false); return void toast.error(res.error?.code === "23505" ? "That URL slug is already used" : res.error?.message ?? "Save failed"); }
    const pid = res.data.id;
    if (removed.length) {
      const del = await supabase.from("product_variants").delete().in("id", removed);
      if (del.error) toast.warning("A variant with past orders can't be deleted — set its stock to 0 instead.");
    }
    for (const [i, v] of vs.entries()) {
      const vrow = { product_id: pid, sku: v.sku.trim(), name: v.name || "Default", option_color: v.option_color || null, option_size: v.option_size || null, price: toMinor(v.price), compare_at_price: v.compare_at_price ? toMinor(v.compare_at_price) : null, supplier_id: v.supplier_id || null, supplier_sku: v.supplier_sku || null, cost_price: v.cost_price ? toMinor(v.cost_price) : null, lead_time_days: v.lead_time_days ? Number(v.lead_time_days) : null, low_stock_threshold: Number(v.low_stock_threshold || 5), sort: i };
      const r = v.id ? await supabase.from("product_variants").update(vrow).eq("id", v.id) : await supabase.from("product_variants").insert(vrow).select("id").single();
      if (r.error) { setBusy(false); return void toast.error(r.error.code === "23505" ? `SKU ${v.sku} already exists` : r.error.message); }
      const start = Number(initialStock[i] || 0);
      if (!v.id && start > 0 && r.data && "id" in r.data) await supabase.rpc("adjust_stock", { _variant: (r.data as { id: string }).id, _delta: start, _reason: "Opening stock" });
    }
    setBusy(false);
    toast.success("Product saved");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
    qc.invalidateQueries({ queryKey: ["admin-product", id] });
    if (isNew) navigate({ to: "/admin/products/$id", params: { id: pid } });
    else setRemoved([]);
  };

  const remove = async () => {
    if (!confirm("Delete this product? Products with orders should be unpublished instead.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return void toast.error("This product has orders — unpublish it instead.");
    qc.invalidateQueries({ queryKey: ["catalog"] });
    navigate({ to: "/admin/products" });
  };

  if (!isNew && existing.isPending) return <FormSkeleton fields={7} />;
  const setV = (i: number, patch: Partial<V>) => setVs(vs.map((v, k) => (k === i ? { ...v, ...patch } : v)));

  return (
    <form onSubmit={save}>
      <Link to="/admin/products" className="text-sm text-muted-foreground">← Products</Link>
      <AdminHeader title={isNew ? "New product" : p.name || "Edit product"} actions={<>
        {!isNew && <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className={btnGhost}>View in store</a>}
        {!isNew && <button type="button" className={`${btnGhost} text-destructive`} onClick={remove}>Delete</button>}
        <button className={btn} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
      </>} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2"><input required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value, slug: isNew && !p.slug ? "" : p.slug })} className={input} /></Field>
            <Field label="URL slug"><input value={p.slug} placeholder={slugify(p.name)} onChange={(e) => setP({ ...p, slug: slugify(e.target.value) })} className={input} /></Field>
            <Field label="Brand"><input id="product-brand" name="brand" maxLength={120} placeholder="Enter brand" value={p.brand} onChange={(e) => setP({ ...p, brand: e.target.value })} className={input} /></Field>
            <Field label="Category"><select value={p.category_id} onChange={(e) => setP({ ...p, category_id: e.target.value })} className={input}><option value="">None</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Description" className="sm:col-span-2"><textarea rows={4} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} className={input} /></Field>
          </Card>

          <Card>
            <div className="flex items-center justify-between"><h2 className="font-bold">Variants</h2><button type="button" className={btnGhost} onClick={() => setVs([...vs, blankV()])}><Plus className="h-4 w-4" /> Add variant</button></div>
            <div className="mt-4 space-y-4">
              {vs.map((v, i) => (
                <div key={v.id ?? `new-${i}`} className="rounded-xl border border-border p-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="SKU"><input required value={v.sku} onChange={(e) => setV(i, { sku: e.target.value.toUpperCase() })} className={input} /></Field>
                    <Field label="Variant name"><input value={v.name} onChange={(e) => setV(i, { name: e.target.value })} className={input} /></Field>
                    <Field label="Colour"><input value={v.option_color} onChange={(e) => setV(i, { option_color: e.target.value })} className={input} /></Field>
                    <Field label="Size"><input value={v.option_size} onChange={(e) => setV(i, { option_size: e.target.value })} className={input} /></Field>
                    <Field label="Price (₦)"><input required inputMode="decimal" value={v.price} onChange={(e) => setV(i, { price: e.target.value })} className={input} /></Field>
                    <Field label="Compare-at (₦)"><input inputMode="decimal" value={v.compare_at_price} onChange={(e) => setV(i, { compare_at_price: e.target.value })} className={input} /></Field>
                    <Field label="Low-stock alert at"><input inputMode="numeric" value={v.low_stock_threshold} onChange={(e) => setV(i, { low_stock_threshold: e.target.value })} className={input} /></Field>
                    {v.id ? <div className="text-sm"><span className="mb-1 block font-semibold">On hand</span><span className="block py-2">{v.qty_on_hand} <Link to="/admin/inventory" className="text-xs font-semibold text-primary">adjust</Link></span></div> : <Field label="Opening stock"><input inputMode="numeric" value={initialStock[i] ?? ""} onChange={(e) => setInitialStock({ ...initialStock, [i]: e.target.value })} className={input} /></Field>}
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Supplier</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="Supplier"><select value={v.supplier_id} onChange={(e) => setV(i, { supplier_id: e.target.value })} className={input}><option value="">None</option>{sups.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                    <Field label="Supplier SKU"><input value={v.supplier_sku} onChange={(e) => setV(i, { supplier_sku: e.target.value })} className={input} /></Field>
                    <Field label="Cost price (₦)"><input inputMode="decimal" value={v.cost_price} onChange={(e) => setV(i, { cost_price: e.target.value })} className={input} /></Field>
                    <Field label="Lead time (days)"><input inputMode="numeric" value={v.lead_time_days} onChange={(e) => setV(i, { lead_time_days: e.target.value })} className={input} /></Field>
                  </div>
                  {vs.length > 1 && <button type="button" className="mt-3 flex items-center gap-1 text-xs font-semibold text-destructive" onClick={() => { if (v.id) setRemoved([...removed, v.id]); setVs(vs.filter((_, k) => k !== i)); }}><Trash2 className="h-3.5 w-3.5" /> Remove variant</button>}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between"><h2 className="font-bold">Specifications</h2><button type="button" className={btnGhost} onClick={() => setP({ ...p, specs: [...p.specs, { k: "", v: "" }] })}><Plus className="h-4 w-4" /> Add</button></div>
            <div className="mt-3 space-y-2">
              {p.specs.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input aria-label="Spec name" placeholder="Battery" value={s.k} onChange={(e) => setP({ ...p, specs: p.specs.map((x, k) => (k === i ? { ...x, k: e.target.value } : x)) })} className={input} />
                  <input aria-label="Spec value" placeholder="40 hours" value={s.v} onChange={(e) => setP({ ...p, specs: p.specs.map((x, k) => (k === i ? { ...x, v: e.target.value } : x)) })} className={input} />
                  <button type="button" aria-label="Remove spec" onClick={() => setP({ ...p, specs: p.specs.filter((_, k) => k !== i) })}><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="grid gap-4">
            <h2 className="font-bold">Search engines</h2>
            <Field label="SEO title"><input value={p.seo_title} placeholder={`${p.name} — CorrectBuy`} onChange={(e) => setP({ ...p, seo_title: e.target.value })} className={input} /></Field>
            <Field label="SEO description"><textarea rows={2} maxLength={160} value={p.seo_description} placeholder={p.description.slice(0, 155)} onChange={(e) => setP({ ...p, seo_description: e.target.value })} className={input} /></Field>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="font-bold">Visibility</h2>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={p.published} onChange={(e) => setP({ ...p, published: e.target.checked })} /> Published in store</label>
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={p.featured} onChange={(e) => setP({ ...p, featured: e.target.checked })} /> Featured on home page</label>
          </Card>
          <Card>
            <h2 className="font-bold">Tags</h2>
            <p className="mt-1 text-xs text-muted-foreground">Tap a tag to attach or remove it, and pick the colour shoppers see.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(tags.data ?? []).map((t) => {
                const on = p.tag_ids.includes(t.id);
                return (
                  <span key={t.id} style={on ? chipStyle(t.color) : undefined} className={`inline-flex items-center gap-1 rounded-full border text-xs font-semibold ${on ? "border-transparent" : "border-border bg-background"}`}>
                    {on ? null : <span className="ml-2 h-2 w-2 rounded-full" style={{ background: t.color }} />}
                    <button type="button" aria-pressed={on} className="py-1 pl-2" onClick={() => setP({ ...p, tag_ids: on ? p.tag_ids.filter((x) => x !== t.id) : [...p.tag_ids, t.id] })}>{t.name}</button>
                    <button type="button" aria-label={`Delete tag ${t.name}`} className="py-1 pr-2 opacity-60 hover:opacity-100" onClick={() => void deleteTag(t.id)}>×</button>
                  </span>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <input value={newTag} placeholder="New tag, e.g. UK used" onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addTag(); } }} className={input} />
              <button type="button" className={btnGhost} onClick={() => void addTag()}>Add</button>
            </div>
            <div className="mt-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Colour for the new tag</p>
              <div className="mt-1.5"><Swatches name="new-tag-colour" label="the new tag" value={newTagColor} onChange={setNewTagColor} /></div>
            </div>
            {(tags.data ?? []).length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tag colours</p>
                {(tags.data ?? []).map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs font-semibold">{t.name}</span>
                    <Swatches name={`tag-colour-${t.id}`} label={t.name} value={t.color || DEFAULT_TAG_COLOR} onChange={(c) => void recolor(t.id, c)} />
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h2 className="font-bold">Images</h2>
            {(productImages(p.image_refs)[0] ?? "") ? <img src={(productImages(p.image_refs)[0] ?? "")} alt="" className="mt-3 aspect-square w-full rounded-xl object-cover" /> : <div className="mt-3 grid aspect-square place-items-center rounded-xl bg-muted text-sm text-muted-foreground">No main image</div>}
            <label className={`${btnGhost} mt-3 w-full cursor-pointer`}><ImagePlus className="h-4 w-4" /> {uploading ? "Uploading…" : (productImages(p.image_refs)[0] ?? "") ? "Replace main image" : "Upload main image"}<input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, true); e.target.value = ""; }} /></label>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {p.image_refs.slice(1).map((ref) => (
                <div key={`${ref.storage}:${ref.key}`} className="relative"><img src={storage.urlFor(ref.storage, ref.key)} alt="" className="aspect-square w-full rounded-lg object-cover" /><button type="button" aria-label="Remove image" onClick={() => setP({ ...p, image_refs: p.image_refs.filter((x) => x.key !== ref.key || x.storage !== ref.storage) })} className="absolute right-1 top-1 rounded-full bg-background p-0.5"><X className="h-3 w-3" /></button></div>
              ))}
              <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary" aria-label="Add gallery image"><Plus className="h-5 w-5" /><input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, false); e.target.value = ""; }} /></label>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
