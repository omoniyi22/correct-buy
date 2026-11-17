import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/money";
import { AdminHeader, btnGhost, downloadCsv, input, States, TableWrap, td, th } from "@/components/admin/ui";
import { StatusBadge } from "@/components/OrderTimeline";

export const Route = createFileRoute("/admin/supplier-orders")({
  head: () => ({"meta": [{"title": "Supplier orders \u2014 CorrectBuy"}, {"name": "description", "content": "Manage CorrectBuy supplier purchase orders."}, {"property": "og:title", "content": "Supplier orders \u2014 CorrectBuy"}, {"property": "og:description", "content": "Manage CorrectBuy supplier purchase orders."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: SupplierOrders,
});

const FLOW: Record<string, { to: string; label: string }[]> = {
  CREATED: [{ to: "SENT", label: "Mark sent" }, { to: "FAILED", label: "Mark failed" }],
  SENT: [{ to: "CONFIRMED", label: "Confirmed" }, { to: "FAILED", label: "Failed" }],
  CONFIRMED: [{ to: "SHIPPED", label: "Supplier shipped" }],
  SHIPPED: [{ to: "RECEIVED", label: "Mark received" }],
  FAILED: [{ to: "SENT", label: "Retry (sent)" }],
};

function SupplierOrders() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["admin-supplier-orders", status],
    queryFn: async () => {
      let r = supabase.from("supplier_orders").select("*, suppliers(name, email, integration_type), orders(id, order_number, shipping_address, status), supplier_order_items(qty, supplier_sku, cost_price, order_items(product_name, variant_name, sku))").order("created_at", { ascending: false }).limit(200);
      if (status) r = r.eq("status", status);
      const { data, error } = await r;
      if (error) throw error;
      return data;
    },
  });

  const move = async (id: string, to: string, attempts: number) => {
    const { error } = await supabase.from("supplier_orders").update({ status: to, updated_at: new Date().toISOString(), attempts: to === "SENT" ? attempts + 1 : attempts, error: to === "FAILED" ? prompt("What went wrong?") || "Marked failed" : null }).eq("id", id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-supplier-orders"] });
  };

  const rows = list.data ?? [];
  const exportCsv = () =>
    downloadCsv("supplier-pos.csv", [
      ["supplier", "order", "status", "supplier_sku", "sku", "product", "variant", "qty", "cost_ngn", "ship_to"],
      ...rows.flatMap((s) => {
        const o = s.orders as unknown as { order_number: string; shipping_address: { full_name: string; line1: string; city: string; state: string; phone: string } };
        const a = o.shipping_address;
        return s.supplier_order_items.map((i) => {
          const oi = i.order_items as { product_name: string; variant_name: string; sku: string };
          return [(s.suppliers as { name: string } | null)?.name ?? "", o.order_number, s.status, i.supplier_sku, oi.sku, oi.product_name, oi.variant_name, i.qty, i.cost_price ? i.cost_price / 100 : "", `${a.full_name}, ${a.line1}, ${a.city}, ${a.state}, ${a.phone}`];
        });
      }),
    ]);

  return (
    <div>
      <AdminHeader title="Supplier orders" sub="Created automatically per supplier when a customer pays" actions={<button className={btnGhost} onClick={exportCsv}>Export CSV batch</button>} />
      <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${input} mb-4 w-auto`}>
        <option value="">All statuses</option>
        {["CREATED", "SENT", "CONFIRMED", "SHIPPED", "RECEIVED", "FAILED", "CANCELLED"].map((s) => <option key={s}>{s}</option>)}
      </select>
      <States q={list} empty="No supplier orders yet — they appear when customers pay.">
        <TableWrap>
          <thead className="bg-muted"><tr><th className={th}>Supplier</th><th className={th}>Customer order</th><th className={th}>Lines</th><th className={th}>Status</th><th className={th}>Actions</th></tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map((s) => {
              const sup = s.suppliers as { name: string; email: string | null; integration_type: string } | null;
              const o = s.orders as { id: string; order_number: string };
              const cost = s.supplier_order_items.reduce((n, i) => n + (i.cost_price ?? 0) * i.qty, 0);
              return (
                <tr key={s.id}>
                  <td className={td}><span className="font-semibold">{sup?.name ?? "Unassigned"}</span><br /><span className="text-xs text-muted-foreground">{sup?.integration_type ?? "manual"}{sup?.email ? ` · ${sup.email}` : ""}</span></td>
                  <td className={td}><Link to="/admin/orders/$id" params={{ id: o.id }} className="font-semibold text-primary">{o.order_number}</Link><br /><span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("en-NG")}</span></td>
                  <td className={td}>{s.supplier_order_items.map((i, k) => { const oi = i.order_items as { product_name: string; variant_name: string }; return <p key={k} className="text-xs">{i.qty} × {oi.product_name} ({oi.variant_name}) <span className="font-mono text-muted-foreground">{i.supplier_sku}</span></p>; })}{cost > 0 && <p className="text-xs text-muted-foreground">Cost {formatMoney(cost)}</p>}</td>
                  <td className={td}><StatusBadge status={s.status} />{s.error && <p className="mt-1 text-xs text-destructive">{s.error}</p>}{s.attempts > 0 && <p className="text-xs text-muted-foreground">{s.attempts} attempt(s)</p>}</td>
                  <td className={td}><div className="flex flex-wrap gap-1">{(FLOW[s.status] ?? []).map((f) => <button key={f.to} className={btnGhost} onClick={() => move(s.id, f.to, s.attempts)}>{f.label}</button>)}</div></td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </States>
    </div>
  );
}
