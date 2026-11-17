import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Plus, Pencil, Save, X, ExternalLink, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { productImages } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { AdminHeader, Field, input, States, TableWrap, th, td } from "@/components/admin/ui";

type Group = { id: string; name: string; slug: string; description: string; sort: number; published?: boolean; product_ids?: string[] };
type Draft = { id?: string; name: string; slug: string; description: string; sort: number; published: boolean; product_ids: string[] };
const blank = (): Draft => ({ name: "", slug: "", description: "", sort: 0, published: true, product_ids: [] });
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function CatalogGroups({ kind }: { kind: "category" | "collection" }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const isCategory = kind === "category";
  const title = isCategory ? "Categories" : "Custom collections";
  const list = useQuery({ queryKey: ["admin-groups", kind], queryFn: async (): Promise<Group[]> => {
    const { data, error } = await supabase.from(isCategory ? "categories" : "collections").select("*").order("sort").order("name");
    if (error) throw error;
    return data;
  } });
  const productQuery = useQuery({ queryKey: ["admin-group-products"], queryFn: async () => {
    const { data, error } = await supabase.from("products").select("id,name,image_refs,category_id,published").order("name");
    if (error) throw error;
    return data.map((p) => ({ ...p, image_url: productImages(p.image_refs)[0] ?? "" }));
  } });
  const products = productQuery.data ?? [];
  const membership = (g: Group) => isCategory ? products.filter((p) => p.category_id === g.id).map((p) => p.id) : g.product_ids ?? [];
  const edit = (g: Group) => { setDraft({ ...g, published: g.published ?? true, product_ids: membership(g) }); setQuery(""); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("save_catalog_group", { _kind: kind, _id: draft.id ?? "00000000-0000-0000-0000-000000000000", _name: draft.name.trim(), _slug: draft.slug || slugify(draft.name), _description: draft.description, _products: draft.product_ids, _sort: draft.sort, _published: draft.published });
      if (error) throw error;
      await Promise.all(["admin-groups", "admin-group-products", "admin-products", "admin-product", "admin-cats", "catalog"].map((key) => qc.invalidateQueries({ queryKey: [key] })));
      await router.invalidate();
      toast.success(isCategory ? "Category saved" : "Collection saved");
      setDraft(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : (error as { message?: string }).message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  if (draft) return <form onSubmit={save}>
    <AdminHeader title={`${draft.id ? "Edit" : "New"} ${kind}`} actions={<>
      <Button type="button" variant="outline" disabled={busy} onClick={() => setDraft(null)}><X /> Cancel</Button>
      <Button type="submit" disabled={busy || productQuery.isPending || productQuery.isError}>{busy ? <Loader2 className="animate-spin" /> : <Save />} Save</Button>
    </>} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section className="min-w-0 space-y-4">
        <Field label="Name"><input aria-label="Name" required maxLength={120} className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label="URL slug"><input required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} value={draft.slug || slugify(draft.name)} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} /></Field>
        <Field label="Description"><textarea aria-label="Description" maxLength={2000} rows={4} className={input} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
        <Field label="Display order"><input type="number" required min={0} max={2147483647} className={input} value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: Number(e.target.value) })} /></Field>
        {!isCategory && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} /> Published in store</label>}
      </section>
      <section className="min-w-0">
        <h2 className="font-display text-lg font-bold">Products <span className="text-sm font-normal text-muted-foreground">({draft.product_ids.length} selected)</span></h2>
        <div className="relative mt-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input aria-label="Search products" placeholder="Search products…" className={`${input} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        {productQuery.isError && <p className="mt-3 text-sm text-destructive">Products could not be loaded. Please refresh.</p>}
        <div className="mt-3 max-h-[560px] overflow-y-auto divide-y divide-border border-y border-border">
          {products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).map((p) => <label key={p.id} className="flex min-w-0 cursor-pointer items-center gap-3 py-3">
            <input type="checkbox" aria-label={`Include ${p.name}`} className="h-4 w-4 shrink-0 accent-primary" checked={draft.product_ids.includes(p.id)} onChange={(e) => setDraft({ ...draft, product_ids: e.target.checked ? [...draft.product_ids, p.id] : draft.product_ids.filter((id) => id !== p.id) })} />
            {p.image_url && <img src={p.image_url} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />}
            <span className="min-w-0 break-words text-sm font-semibold">{p.name}<span className="block text-xs font-normal text-muted-foreground">{p.published ? "Published" : "Draft"}{isCategory && p.category_id && p.category_id !== draft.id ? " · Moves from another category" : ""}</span></span>
          </label>)}
          {!productQuery.isPending && products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).length === 0 && <p className="py-6 text-sm text-muted-foreground">No products found.</p>}
        </div>
      </section>
    </div>
  </form>;

  return <div>
    <AdminHeader title={title} sub={`${list.data?.length ?? 0} ${title.toLowerCase()}`} actions={<Button disabled={productQuery.isPending || productQuery.isError} onClick={() => { setDraft(blank()); setQuery(""); }}><Plus /> New {kind}</Button>} />
    <States q={list} empty={`No ${title.toLowerCase()} yet.`}>
      <TableWrap><thead className="bg-muted"><tr><th className={th}>Name</th><th className={th}>Products</th><th className={th}>Order</th>{!isCategory && <th className={th}>Status</th>}<th className={th}>Actions</th></tr></thead>
        <tbody className="divide-y divide-border">{list.data?.map((g) => <tr key={g.id}><td className={td}><span className="font-semibold">{g.name}</span><span className="block text-xs text-muted-foreground">/{isCategory ? "c" : "collections"}/{g.slug}</span></td><td className={td}>{membership(g).length}</td><td className={td}>{g.sort}</td>{!isCategory && <td className={td}>{g.published ? "Published" : "Draft"}</td>}<td className={td}><div className="flex gap-2"><Button variant="outline" size="icon" aria-label={`Edit ${g.name}`} title={`Edit ${g.name}`} disabled={productQuery.isPending || productQuery.isError} onClick={() => edit(g)}><Pencil /></Button>{(isCategory || g.published) && <Button asChild variant="ghost" size="icon"><a href={`/${isCategory ? "c" : "collections"}/${g.slug}`} aria-label={`View ${g.name}`} title={`View ${g.name}`}><ExternalLink /></a></Button>}</div></td></tr>)}</tbody>
      </TableWrap>
    </States>
  </div>;
}