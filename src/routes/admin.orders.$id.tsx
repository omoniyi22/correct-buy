import { useState } from "react";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/money";
import { AdminHeader, btn, btnGhost, Card, Field, input } from "@/components/admin/ui";
import { STATUS_LABEL, StatusBadge } from "@/components/OrderTimeline";

export const Route = createFileRoute("/admin/orders/$id")({
  head: () => ({"meta": [{"title": "Manage order \u2014 CorrectBuy"}, {"name": "description", "content": "Review and fulfil a CorrectBuy order."}, {"property": "og:title", "content": "Manage order \u2014 CorrectBuy"}, {"property": "og:description", "content": "Review and fulfil a CorrectBuy order."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: AdminOrder,
});

const NEXT: Record<string, string[]> = {
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["CANCELLED"],
  SHIPPED: [],
  PENDING_PAYMENT: ["CANCELLED"],
};

function AdminOrder() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const o = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, suppliers(name)), payments(*), shipments(*), order_status_history(*), supplier_orders(id, status, suppliers(name)), return_requests(*), notification_logs(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const [ship, setShip] = useState({ carrier: "", tracking: "", eta: "" });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-order", id] });

  if (o.isPending) return <ListSkeleton rows={8} />;
  if (o.isError || !o.data) return <p className="text-destructive">Order not found.</p>;
  const d = o.data;
  const a = d.shipping_address as { full_name: string; line1: string; city: string; state: string; phone: string };

  const run = async (key: string, fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(key);
    const { error } = await fn();
    setBusy("");
    if (error) return void toast.error(error.message);
    toast.success(ok);
    refresh();
  };

  const move = (to: string) => {
    if (to === "CANCELLED" && !confirm(d.status === "PENDING_PAYMENT" ? "Cancel and release reserved stock?" : "Cancel this paid order? Stock is returned; issue the refund in your payment dashboard.")) return;
    void run(to, () => supabase.rpc("transition_order", { _order: d.id, _to: to, _note: note }), `Moved to ${STATUS_LABEL[to]}`);
  };

  const history = [...d.order_status_history].sort((x, y) => y.created_at.localeCompare(x.created_at));
  const notifications = [...d.notification_logs].sort((x, y) => y.created_at.localeCompare(x.created_at));

  return (
    <div>
      <Link to="/admin/orders" className="text-sm text-muted-foreground">← Orders</Link>
      <AdminHeader title={`Order ${d.order_number}`} sub={<>Placed {new Date(d.created_at).toLocaleString("en-NG")} · <StatusBadge status={d.status} /></>} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <Card>
            <h2 className="font-bold">Items</h2>
            <div className="mt-3 max-w-full overflow-x-auto"><table className="w-full min-w-[440px] text-sm">
              <tbody className="divide-y divide-border">
                {d.order_items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2"><span className="font-semibold">{i.product_name}</span> · {i.variant_name}<br /><span className="font-mono text-xs text-muted-foreground">{i.sku}</span></td>
                    <td className="py-2 text-xs text-muted-foreground">{(i.suppliers as { name: string } | null)?.name ?? "No supplier"}</td>
                    <td className="py-2 text-right">{i.qty} × {formatMoney(i.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(d.subtotal)}</dd></div>
              {d.discount > 0 && <div className="flex justify-between"><dt>Discount ({d.coupon_code})</dt><dd>−{formatMoney(d.discount)}</dd></div>}
              <div className="flex justify-between"><dt>Delivery ({d.shipping_zone})</dt><dd>{formatMoney(d.shipping_fee)}</dd></div>
              {d.tax > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(d.tax)}</dd></div>}
              <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatMoney(d.total)}</dd></div>
            </dl>
          </Card>

          <Card>
            <h2 className="font-bold">Fulfilment</h2>
            {d.shipments.map((s) => <p key={s.id} className="mt-2 text-sm">{s.carrier} · <span className="font-mono">{s.tracking_no}</span> · {s.status}</p>)}
            {["PAID", "PROCESSING"].includes(d.status) && (
              <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(e) => { e.preventDefault(); void run("ship", () => supabase.rpc("ship_order", { _order: d.id, _carrier: ship.carrier, _tracking: ship.tracking, _eta: (ship.eta || null) as string }), "Marked shipped — customer notified"); }}>
                <Field label="Carrier"><input required value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })} className={input} placeholder="GIG Logistics" /></Field>
                <Field label="Tracking number"><input required value={ship.tracking} onChange={(e) => setShip({ ...ship, tracking: e.target.value })} className={input} /></Field>
                <Field label="Est. delivery"><input type="date" value={ship.eta} onChange={(e) => setShip({ ...ship, eta: e.target.value })} className={input} /></Field>
                <div className="flex items-end"><button className={btn} disabled={busy === "ship"}>Mark shipped</button></div>
              </form>
            )}
            {d.status === "SHIPPED" && <button className={`${btn} mt-4`} disabled={!!busy} onClick={() => run("deliver", () => supabase.rpc("deliver_order", { _order: d.id }), "Marked delivered")}>Mark delivered</button>}
            <div className="mt-4 text-sm">
              <p className="font-semibold">Supplier orders</p>
              {d.supplier_orders.length === 0 ? <p className="text-muted-foreground">Created automatically once payment is confirmed.</p> : d.supplier_orders.map((s) => <p key={s.id}>{(s.suppliers as { name: string } | null)?.name ?? "Unassigned"} — <StatusBadge status={s.status} /></p>)}
              <Link to="/admin/supplier-orders" className="font-semibold text-primary">Manage supplier orders</Link>
            </div>
          </Card>

          <Card>
            <h2 className="font-bold">Status history</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4"><span><span className="font-semibold">{h.from_status ? `${STATUS_LABEL[h.from_status] ?? h.from_status} → ` : ""}{STATUS_LABEL[h.to_status] ?? h.to_status}</span> {h.note && <span className="text-muted-foreground">— {h.note}</span>} <span className="text-xs text-muted-foreground">by {h.actor}</span></span><span className="shrink-0 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("en-NG")}</span></li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <h2 className="font-bold">Notifications</h2>
              <button className={btnGhost} onClick={() => run("resend", () => supabase.from("notification_logs").insert({ order_id: d.id, channel: "email", event: `order_${d.status.toLowerCase()}_resend`, recipient: d.email }), "Notification queued")}><Send className="h-3.5 w-3.5" /> Resend update</button>
            </div>
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto text-xs">
              {notifications.map((n) => <li key={n.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><span className="min-w-0 break-all">{n.channel} · {n.event} → {n.recipient}</span><span className={n.status === "FAILED" ? "text-destructive" : "text-muted-foreground"}>{n.status}</span></li>)}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="font-bold">Customer</h2>
            <p className="mt-2 break-words text-sm">{d.email}<br />{d.phone}<br />{d.user_id ? "Registered customer" : "Guest checkout"}</p>
            <h3 className="mt-4 text-sm font-bold">Ship to</h3>
            <p className="mt-1 text-sm">{a.full_name}<br />{a.line1}<br />{a.city}, {a.state}<br />{a.phone}</p>
            {d.notes && <p className="mt-3 rounded-lg bg-muted p-2 text-sm">“{d.notes}”</p>}
          </Card>
          <Card>
            <h2 className="font-bold">Payment</h2>
            {d.payments.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No payment attempts.</p>}
            {d.payments.map((p) => (
              <div key={p.id} className="mt-2 text-sm">
                <p className="flex items-center gap-2"><StatusBadge status={p.status} /> {p.provider} · {formatMoney(p.amount)}</p>
                <p className="break-all font-mono text-xs text-muted-foreground">{p.reference}</p>
              </div>
            ))}
            {d.return_requests.length > 0 && <Link to="/admin/returns" className="mt-3 block text-sm font-semibold text-primary">Return request — handle refund</Link>}
          </Card>
          <Card>
            <h2 className="font-bold">Change status</h2>
            <Field label="Note (optional)" className="mt-3"><input value={note} onChange={(e) => setNote(e.target.value)} className={input} /></Field>
            <div className="mt-3 flex flex-wrap gap-2">
              {(NEXT[d.status] ?? []).map((s) => <button key={s} disabled={!!busy} onClick={() => move(s)} className={s === "CANCELLED" ? `${btnGhost} text-destructive` : btn}>{STATUS_LABEL[s]}</button>)}
              {(NEXT[d.status] ?? []).length === 0 && <p className="text-sm text-muted-foreground">No manual changes available at this stage.</p>}
            </div>
          </Card>
          <Card>
            <h2 className="font-bold">Staff notes</h2>
            <StaffNotes id={d.id} initial={d.staff_notes ?? ""} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function StaffNotes({ id, initial }: { id: string; initial: string }) {
  const [v, setV] = useState(initial);
  return (
    <div className="mt-2 space-y-2">
      <textarea aria-label="Staff notes" rows={3} value={v} onChange={(e) => setV(e.target.value)} className={input} />
      <button className={btnGhost} onClick={async () => { const { error } = await supabase.from("orders").update({ staff_notes: v }).eq("id", id); if (error) toast.error("Couldn't save"); else toast.success("Saved"); }}>Save notes</button>
    </div>
  );
}
