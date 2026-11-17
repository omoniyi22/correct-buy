import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { productImages } from "@/lib/storage";
import { formatMoney, toMinor } from "@/lib/money";
import { AdminHeader, btn, btnGhost, downloadCsv, input, parseCsv, States, TableWrap, td, th } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/products/")({
  head: () => ({"meta": [{"title": "Manage products \u2014 CorrectBuy"}, {"name": "description", "content": "Manage the CorrectBuy product catalog."}, {"property": "og:title", "content": "Manage products \u2014 CorrectBuy"}, {"property": "og:description", "content": "Manage the CorrectBuy product catalog."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: ProductsAdmin,
});

function ProductsAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sup, setSup] = useState("");
  const [pub, setPub] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const cats = useQuery({ queryKey: ["admin-cats"], queryFn: async () => (await supabase.from("categories").select("id, name").order("sort")).data ?? [] });
  const sups = useQuery({ queryKey: ["admin-suppliers-min"], queryFn: async () => (await supabase.from("suppliers").select("id, name").order("name")).data ?? [] });
  const list = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, slug, name, brand, published, featured, image_refs, category_id, categories(name), product_variants(id, sku, name, price, compare_at_price, cost_price, qty_on_hand, qty_reserved, supplier_id, supplier_sku)").order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((p) => ({ ...p, image_url: productImages(p.image_refs)[0] ?? "" }));
    },
  });

  const rows = (list.data ?? []).filter((p) => {
    const t = q.trim().toLowerCase();
    return (!t || p.name.toLowerCase().includes(t) || p.product_variants.some((v) => v.sku.toLowerCase().includes(t))) &&
      (!cat || p.category_id === cat) &&
      (!sup || p.product_variants.some((v) => v.supplier_id === sup)) &&
      (!pub || String(p.published) === pub);
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const bulk = async (patch: { published?: boolean; featured?: boolean }) => {
    const { error } = await supabase.from("products").update(patch).in("id", picked);
    if (error) return void toast.error(error.message);
    toast.success(`${picked.length} updated`);
    setPicked([]);
    refresh();
  };

  const exportCsv = () =>
    downloadCsv("products.csv", [
      ["sku", "product", "variant", "price_ngn", "compare_at_ngn", "cost_ngn", "on_hand", "reserved", "supplier_sku", "published"],
      ...(list.data ?? []).flatMap((p) => p.product_variants.map((v) => [v.sku, p.name, v.name, v.price / 100, v.compare_at_price ? v.compare_at_price / 100 : "", v.cost_price ? v.cost_price / 100 : "", v.qty_on_hand, v.qty_reserved, v.supplier_sku, p.published ? "yes" : "no"])),
    ]);

  // CSV import updates prices/costs by SKU: sku, price_ngn, compare_at_ngn, cost_ngn, supplier_sku
  const importCsv = async (file: File) => {
    const rows = parseCsv(await file.text());
    let ok = 0;
    for (const r of rows) {
      if (!r["sku"]) continue;
      const patch: { price?: number; compare_at_price?: number | null; cost_price?: number; supplier_sku?: string } = {};
      if (r["price_ngn"]) patch.price = toMinor(r["price_ngn"]);
      if ("compare_at_ngn" in r) patch.compare_at_price = r["compare_at_ngn"] ? toMinor(r["compare_at_ngn"]) : null;
      if (r["cost_ngn"]) patch.cost_price = toMinor(r["cost_ngn"]);
      if (r["supplier_sku"]) patch.supplier_sku = r["supplier_sku"];
      const { data } = await supabase.from("product_variants").update(patch).eq("sku", r["sku"]).select("id");
      if (data?.length) ok++;
    }
    toast.success(`${ok} of ${rows.length} SKUs updated`);
    refresh();
  };

  return (
    <div>
      <AdminHeader title="Products" sub={`${list.data?.length ?? 0} products`} actions={<>
        <button className={btnGhost} onClick={exportCsv}>Export CSV</button>
        <label className={`${btnGhost} cursor-pointer`}><Upload className="h-4 w-4" /> Import prices<input type="file" accept=".csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }} /></label>
        <Link to="/admin/products/$id" params={{ id: "new" }} className={btn}><Plus className="h-4 w-4" /> New product</Link>
      </>} />
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <input aria-label="Search" placeholder="Search name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} className={input} />
        <select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)} className={input}><option value="">All categories</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select aria-label="Supplier" value={sup} onChange={(e) => setSup(e.target.value)} className={input}><option value="">All suppliers</option>{sups.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select aria-label="Status" value={pub} onChange={(e) => setPub(e.target.value)} className={input}><option value="">Any status</option><option value="true">Published</option><option value="false">Draft</option></select>
      </div>
      {picked.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-accent p-3 text-sm">
          <span className="font-semibold">{picked.length} selected</span>
          <button className={btnGhost} onClick={() => bulk({ published: true })}>Publish</button>
          <button className={btnGhost} onClick={() => bulk({ published: false })}>Unpublish</button>
          <button className={btnGhost} onClick={() => bulk({ featured: true })}>Feature</button>
          <button className={btnGhost} onClick={() => bulk({ featured: false })}>Unfeature</button>
        </div>
      )}
      <States q={{ ...list, data: rows }} empty="No products match.">
        <TableWrap>
          <thead className="bg-muted"><tr><th className={th}><span className="sr-only">Select</span></th><th className={th}>Product</th><th className={th}>Category</th><th className={th}>Price</th><th className={th}>Stock</th><th className={th}>Status</th></tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => {
              const prices = p.product_variants.map((v) => v.price);
              const stock = p.product_variants.reduce((n, v) => n + v.qty_on_hand - v.qty_reserved, 0);
              return (
                <tr key={p.id} className="hover:bg-muted/40">
                  <td className={td}><input type="checkbox" aria-label={`Select ${p.name}`} className="h-4 w-4 accent-primary" checked={picked.includes(p.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, p.id] : picked.filter((x) => x !== p.id))} /></td>
                  <td className={td}><Link to="/admin/products/$id" params={{ id: p.id }} className="flex min-w-[200px] items-center gap-3 font-semibold hover:text-primary">{p.image_url ? <img src={p.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="h-10 w-10 rounded-lg bg-muted" />}<span>{p.name}<span className="block text-xs font-normal text-muted-foreground">{p.product_variants.length} variant(s) · {p.brand}</span></span></Link></td>
                  <td className={td}>{(p.categories as { name: string } | null)?.name ?? "—"}</td>
                  <td className={td}>{prices.length ? formatMoney(Math.min(...prices)) : "—"}</td>
                  <td className={td}><span className={stock <= 0 ? "font-bold text-destructive" : ""}>{stock}</span></td>
                  <td className={td}>{p.published ? <span className="text-success">Published</span> : <span className="text-muted-foreground">Draft</span>}{p.featured && <span className="ml-2 text-xs font-bold text-primary">★</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </States>
    </div>
  );
}
