import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, btnGhost, Card, parseCsv, States, TableWrap, td, th } from "@/components/admin/ui";
import { StatusBadge } from "@/components/OrderTimeline";

export const Route = createFileRoute("/admin/shipments")({
  head: () => ({"meta": [{"title": "Manage shipments \u2014 CorrectBuy"}, {"name": "description", "content": "Track and manage CorrectBuy deliveries."}, {"property": "og:title", "content": "Manage shipments \u2014 CorrectBuy"}, {"property": "og:description", "content": "Track and manage CorrectBuy deliveries."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: Shipments,
});

function Shipments() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const list = useQuery({
    queryKey: ["admin-shipments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipments").select("*, orders(id, order_number, status, email)").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return data;
    },
  });
  const toShip = useQuery({ queryKey: ["admin-to-ship"], queryFn: async () => (await supabase.from("orders").select("id, order_number, status, shipping_zone, created_at").in("status", ["PAID", "PROCESSING"]).order("created_at")).data ?? [] });

  // CSV columns: order_number, carrier, tracking_no, estimated_delivery (optional, YYYY-MM-DD)
  const upload = async (file: File) => {
    setBusy(true);
    const rows = parseCsv(await file.text());
    let ok = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const { data: o } = await supabase.from("orders").select("id").eq("order_number", (r["order_number"] ?? "").toUpperCase()).maybeSingle();
      if (!o) { errors.push(`${r["order_number"]}: not found`); continue; }
      const { error } = await supabase.rpc("ship_order", { _order: o.id, _carrier: r["carrier"] ?? "", _tracking: r["tracking_no"] ?? "", _eta: (r["estimated_delivery"] || null) as string });
      if (error) errors.push(`${r["order_number"]}: ${error.message}`);
      else ok++;
    }
    setBusy(false);
    toast[errors.length ? "warning" : "success"](`${ok} shipped${errors.length ? ` · ${errors.length} skipped: ${errors.slice(0, 2).join("; ")}` : ""}`);
    qc.invalidateQueries({ queryKey: ["admin-shipments"] });
    qc.invalidateQueries({ queryKey: ["admin-to-ship"] });
  };

  return (
    <div>
      <AdminHeader title="Shipments" actions={
        <label className={`${btnGhost} cursor-pointer`}>
          <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Bulk tracking upload"}
          <input type="file" accept=".csv,text/csv" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        </label>
      } />
      <p className="-mt-4 mb-6 text-xs text-muted-foreground">CSV columns: order_number, carrier, tracking_no, estimated_delivery</p>
      {toShip.data && toShip.data.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-bold">Ready to ship ({toShip.data.length})</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {toShip.data.map((o) => <Link key={o.id} to="/admin/orders/$id" params={{ id: o.id }} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary">{o.order_number} · {o.shipping_zone}</Link>)}
          </div>
        </Card>
      )}
      <States q={list} empty="No shipments yet.">
        <TableWrap>
          <thead className="bg-muted"><tr><th className={th}>Order</th><th className={th}>Carrier</th><th className={th}>Tracking</th><th className={th}>Shipment</th><th className={th}>Order status</th><th className={th}>Shipped</th></tr></thead>
          <tbody className="divide-y divide-border">
            {list.data?.map((s) => {
              const o = s.orders as { id: string; order_number: string; status: string };
              return (
                <tr key={s.id}>
                  <td className={td}><Link to="/admin/orders/$id" params={{ id: o.id }} className="font-semibold text-primary">{o.order_number}</Link></td>
                  <td className={td}>{s.carrier}</td>
                  <td className={`${td} font-mono text-xs`}>{s.tracking_no}</td>
                  <td className={td}>{s.status.replace("_", " ").toLowerCase()}</td>
                  <td className={td}><StatusBadge status={o.status} /></td>
                  <td className={td}>{new Date(s.created_at).toLocaleDateString("en-NG")}</td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </States>
    </div>
  );
}
