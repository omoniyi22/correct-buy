import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/money";
import { AdminHeader, btn, downloadCsv, btnGhost, input, States, TableWrap, td, th } from "@/components/admin/ui";
import { STATUS_LABEL, StatusBadge } from "@/components/OrderTimeline";

export const Route = createFileRoute("/admin/orders/")({
  head: () => ({"meta": [{"title": "Manage orders \u2014 CorrectBuy"}, {"name": "description", "content": "Manage customer orders at CorrectBuy."}, {"property": "og:title", "content": "Manage orders \u2014 CorrectBuy"}, {"property": "og:description", "content": "Manage customer orders at CorrectBuy."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: OrdersAdmin,
});

function OrdersAdmin() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [bulk, setBulk] = useState("");

  const suppliers = useQuery({ queryKey: ["admin-suppliers-min"], queryFn: async () => (await supabase.from("suppliers").select("id, name").order("name")).data ?? [] });
  const orders = useQuery({
    queryKey: ["admin-orders", status, q, from, to, supplier],
    queryFn: async () => {
      let r = supabase.from("orders").select("id, order_number, email, phone, status, total, created_at, shipping_zone, order_items!inner(supplier_id), payments(status)").order("created_at", { ascending: false }).limit(200);
      if (status) r = r.eq("status", status);
      if (from) r = r.gte("created_at", from);
      if (to) r = r.lte("created_at", `${to}T23:59:59`);
      if (supplier) r = r.eq("order_items.supplier_id", supplier);
      const term = q.trim().replace(/[,()%]/g, "");
      if (term) r = r.or(`order_number.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      const { data, error } = await r;
      if (error) throw error;
      return data;
    },
  });

  const applyBulk = async () => {
    if (!bulk || !picked.length) return;
    let ok = 0;
    const errs: string[] = [];
    for (const id of picked) {
      const { error } = await supabase.rpc("transition_order", { _order: id, _to: bulk, _note: "Bulk update" });
      if (error) errs.push(error.message);
      else ok++;
    }
    toast[errs.length ? "warning" : "success"](`${ok} updated${errs.length ? `, ${errs.length} skipped (${errs[0]})` : ""}`);
    setPicked([]);
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const rows = orders.data ?? [];

  return (
    <div>
      <AdminHeader title="Orders" sub="Search by order number, email or phone"
        actions={<button className={btnGhost} onClick={() => downloadCsv("orders.csv", [["order", "date", "email", "phone", "status", "total_ngn", "zone"], ...rows.map((o) => [o.order_number, o.created_at, o.email, o.phone, o.status, o.total / 100, o.shipping_zone])])}>Export CSV</button>} />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input aria-label="Search orders" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className={input} />
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select aria-label="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} className={input}>
          <option value="">All suppliers</option>
          {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input aria-label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} />
        <input aria-label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} />
      </div>
      {picked.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-accent p-3 text-sm">
          <span className="font-semibold">{picked.length} selected</span>
          <select aria-label="Move to status" value={bulk} onChange={(e) => setBulk(e.target.value)} className={`${input} w-auto`}>
            <option value="">Move to…</option>
            {["PROCESSING", "DELIVERED", "CANCELLED"].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button className={btn} disabled={!bulk} onClick={applyBulk}>Apply</button>
          <button className={btnGhost} onClick={() => setPicked([])}>Clear</button>
        </div>
      )}
      <States q={orders} empty="No orders match these filters.">
        <TableWrap>
          <thead className="bg-muted"><tr><th className={th}><span className="sr-only">Select</span></th><th className={th}>Order</th><th className={th}>Date</th><th className={th}>Customer</th><th className={th}>Payment</th><th className={th}>Status</th><th className={`${th} text-right`}>Total</th></tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-muted/40">
                <td className={td}><input type="checkbox" aria-label={`Select ${o.order_number}`} className="h-4 w-4 accent-primary" checked={picked.includes(o.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, o.id] : picked.filter((x) => x !== o.id))} /></td>
                <td className={td}><Link to="/admin/orders/$id" params={{ id: o.id }} className="font-semibold text-primary hover:underline">{o.order_number}</Link></td>
                <td className={td}>{new Date(o.created_at).toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className={td}><span className="block max-w-48 truncate">{o.email}</span><span className="text-xs text-muted-foreground">{o.phone}</span></td>
                <td className={td}>{o.payments.length ? <StatusBadge status={o.payments.some((p) => p.status === "SUCCESS") ? "SUCCESS" : o.payments[0]!.status} /> : "—"}</td>
                <td className={td}><StatusBadge status={o.status} /></td>
                <td className={`${td} text-right font-semibold`}>{formatMoney(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </States>
    </div>
  );
}
