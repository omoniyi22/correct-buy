import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, btn, Card, input, States, TableWrap, td, th } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/inventory")({
  head: () => ({"meta": [{"title": "Inventory \u2014 CorrectBuy"}, {"name": "description", "content": "Manage CorrectBuy stock and adjustments."}, {"property": "og:title", "content": "Inventory \u2014 CorrectBuy"}, {"property": "og:description", "content": "Manage CorrectBuy stock and adjustments."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: Inventory,
});

function Inventory() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [adj, setAdj] = useState<{ id: string; delta: string; reason: string } | null>(null);
  const list = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_variants").select("id, sku, name, qty_on_hand, qty_reserved, low_stock_threshold, products(name)").order("sku");
      if (error) throw error;
      return data;
    },
  });
  const history = useQuery({
    queryKey: ["admin-adjustments"],
    queryFn: async () => (await supabase.from("stock_adjustments").select("*, product_variants(sku)").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  const rows = (list.data ?? []).filter((v) => {
    const t = q.toLowerCase();
    const name = (v.products as { name: string } | null)?.name ?? "";
    return (!t || v.sku.toLowerCase().includes(t) || name.toLowerCase().includes(t)) && (!lowOnly || v.qty_on_hand - v.qty_reserved <= v.low_stock_threshold);
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adj) return;
    const delta = Number(adj.delta);
    if (!Number.isInteger(delta) || delta === 0) return void toast.error("Enter a whole number like 10 or -2");
    const { error } = await supabase.rpc("adjust_stock", { _variant: adj.id, _delta: delta, _reason: adj.reason });
    if (error) return void toast.error(error.message.includes("check") ? "Stock can't go below zero" : error.message);
    toast.success("Stock adjusted");
    setAdj(null);
    qc.invalidateQueries({ queryKey: ["admin-inventory"] });
    qc.invalidateQueries({ queryKey: ["admin-adjustments"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const setThreshold = async (id: string, value: number) => {
    await supabase.from("product_variants").update({ low_stock_threshold: value }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-inventory"] });
  };

  return (
    <div>
      <AdminHeader title="Inventory" sub="Available = on hand − reserved by unpaid checkouts" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input aria-label="Search" placeholder="Search SKU or product…" value={q} onChange={(e) => setQ(e.target.value)} className={`${input} max-w-xs`} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only</label>
      </div>
      <States q={{ ...list, data: rows }} empty="No variants match.">
        <TableWrap>
          <thead className="bg-muted"><tr><th className={th}>SKU</th><th className={th}>Product</th><th className={th}>On hand</th><th className={th}>Reserved</th><th className={th}>Available</th><th className={th}>Alert at</th><th className={th}></th></tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map((v) => {
              const avail = v.qty_on_hand - v.qty_reserved;
              return (
                <tr key={v.id}>
                  <td className={`${td} font-mono text-xs`}>{v.sku}</td>
                  <td className={td}>{(v.products as { name: string } | null)?.name} · {v.name}</td>
                  <td className={td}>{v.qty_on_hand}</td>
                  <td className={td}>{v.qty_reserved}</td>
                  <td className={cn(td, "font-bold", avail <= 0 ? "text-destructive" : avail <= v.low_stock_threshold && "text-primary")}>{avail}</td>
                  <td className={td}><input aria-label={`Alert threshold for ${v.sku}`} type="number" min={0} defaultValue={v.low_stock_threshold} onBlur={(e) => Number(e.target.value) !== v.low_stock_threshold && setThreshold(v.id, Number(e.target.value))} className={`${input} w-20`} /></td>
                  <td className={td}><button className="text-sm font-semibold text-primary" onClick={() => setAdj({ id: v.id, delta: "", reason: "" })}>Adjust</button></td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </States>

      {adj && (
        <Card className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md shadow-2xl">
          <form onSubmit={submit} className="space-y-3">
            <h2 className="font-bold">Adjust {list.data?.find((v) => v.id === adj.id)?.sku}</h2>
            <input aria-label="Change" autoFocus placeholder="+10 received, -1 damaged" value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: e.target.value })} className={input} />
            <select aria-label="Reason" required value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} className={input}>
              <option value="">Reason…</option>
              {["Stock received", "Stock count correction", "Damaged", "Lost", "Returned to supplier", "Other"].map((r) => <option key={r}>{r}</option>)}
            </select>
            <div className="flex gap-2"><button className={btn}>Save</button><button type="button" className="text-sm font-semibold" onClick={() => setAdj(null)}>Cancel</button></div>
          </form>
        </Card>
      )}

      <h2 className="mb-3 mt-10 font-bold">Recent adjustments</h2>
      <States q={history} empty="No adjustments yet.">
        <TableWrap>
          <thead className="bg-muted"><tr><th className={th}>When</th><th className={th}>SKU</th><th className={th}>Change</th><th className={th}>Reason</th></tr></thead>
          <tbody className="divide-y divide-border">
            {history.data?.map((h) => (
              <tr key={h.id}><td className={td}>{new Date(h.created_at).toLocaleString("en-NG")}</td><td className={`${td} font-mono text-xs`}>{(h.product_variants as { sku: string } | null)?.sku}</td><td className={cn(td, "font-bold", h.delta < 0 ? "text-destructive" : "text-success")}>{h.delta > 0 ? `+${h.delta}` : h.delta}</td><td className={td}>{h.reason}</td></tr>
            ))}
          </tbody>
        </TableWrap>
      </States>
    </div>
  );
}
