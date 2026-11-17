import { useState } from "react";
import { cdnImage } from "@/lib/storage";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Printer, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { myOrderQuery } from "@/lib/account";
import { formatMoney } from "@/lib/money";
import { OrderTimeline, StatusBadge, STATUS_LABEL } from "@/components/OrderTimeline";
import { retryPayment } from "@/lib/orders.functions";
import { storeConfigQuery } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/account/orders/$id/")({
  head: () => ({"meta": [{"title": "Your order details \u2014 CorrectBuy"}, {"name": "description", "content": "View payment, items and delivery details for your CorrectBuy order."}, {"property": "og:title", "content": "Your order details \u2014 CorrectBuy"}, {"property": "og:description", "content": "View payment, items and delivery details for your CorrectBuy order."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: config } = useSuspenseQuery(storeConfigQuery);
  const o = useQuery(myOrderQuery(id));
  const retry = useServerFn(retryPayment);
  const [busy, setBusy] = useState("");

  if (o.isPending) return <ListSkeleton rows={6} />;
  if (o.isError) return <p className="text-destructive">Couldn't load this order.</p>;
  const d = o.data;
  if (!d) return <p>Order not found. <Link to="/account/orders" className="font-semibold text-primary">Back to orders</Link></p>;
  const a = d.shipping_address as { full_name: string; line1: string; city: string; state: string; phone: string };
  const history = [...d.order_status_history].sort((x, y) => x.created_at.localeCompare(y.created_at));
  const pay = [...d.payments].sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
  const canCancel = d.status === "PENDING_PAYMENT" || d.status === "PAID";
  const windowEnds = d.delivered_at ? new Date(new Date(d.delivered_at).getTime() + config.settings.return_window_days * 86400000) : null;
  const canReturn = d.status === "DELIVERED" && windowEnds && windowEnds > new Date();

  const cancel = async () => {
    if (!confirm("Cancel this order?")) return;
    setBusy("cancel");
    const { error } = await supabase.rpc("customer_cancel_order", { _order: d.id });
    setBusy("");
    if (error) return void toast.error(error.message);
    toast.success(d.status === "PAID" ? "Order cancelled — we'll refund your payment." : "Order cancelled.");
    qc.invalidateQueries({ queryKey: ["my-order", id] });
    qc.invalidateQueries({ queryKey: ["my-orders"] });
  };

  const payNow = async () => {
    setBusy("pay");
    try {
      const r = await retry({ data: { orderNumber: d.order_number, token: d.access_token } });
      window.location.assign(r.redirectUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start payment");
      setBusy("");
    }
  };

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/account/orders" className="text-sm text-muted-foreground print:hidden">← All orders</Link>
          <h1 className="mt-1 text-3xl font-extrabold">Order {d.order_number}</h1>
          <p className="text-sm text-muted-foreground">Placed {new Date(d.created_at).toLocaleString("en-NG")}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"><Printer className="h-4 w-4" /> Invoice</button>
          {d.status === "PENDING_PAYMENT" && <button disabled={!!busy} onClick={payNow} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{busy === "pay" ? "…" : "Pay now"}</button>}
          {canCancel && <button disabled={!!busy} onClick={cancel} className="rounded-full border border-destructive px-4 py-2 text-sm font-semibold text-destructive">{busy === "cancel" ? "…" : "Cancel order"}</button>}
          {canReturn && <Link to="/account/orders/$id/return" params={{ id: d.id }} className="rounded-full border border-secondary px-4 py-2 text-sm font-semibold">Request return</Link>}
        </div>
      </div>

      <div className="rounded-3xl border border-border p-6 print:hidden"><OrderTimeline status={d.status} history={history} /></div>

      {d.shipments.map((s) => (
        <div key={s.id} className="flex items-start gap-3 rounded-2xl bg-muted p-4 text-sm">
          <Truck className="h-5 w-5 text-primary" />
          <div><p className="font-semibold">{s.carrier} · <span className="font-mono">{s.tracking_no}</span></p><p className="text-muted-foreground">{s.status === "DELIVERED" ? "Delivered" : s.estimated_delivery ? `Estimated ${new Date(s.estimated_delivery).toLocaleDateString("en-NG")}` : "In transit"}</p></div>
        </div>
      ))}

      <section className="rounded-3xl border border-border p-6">
        <h2 className="font-bold">Items</h2>
        <ul className="mt-3 divide-y divide-border">
          {d.order_items.map((i) => (
            <li key={i.id} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 py-3 text-sm sm:grid-cols-[56px_minmax(0,1fr)_auto]">
              <img src={cdnImage(i.image_url)} alt="" className="h-14 w-14 rounded-xl object-cover print:hidden" />
              <span className="min-w-0 break-words"><Link to="/p/$slug" params={{ slug: i.product_slug }} className="block font-semibold hover:text-primary">{i.product_name}</Link><span className="text-muted-foreground">{i.variant_name} · {i.sku} × {i.qty}</span></span>
              <span className="col-start-2 font-semibold sm:col-start-auto">{formatMoney(i.unit_price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(d.subtotal)}</dd></div>
          {d.discount > 0 && <div className="flex justify-between"><dt>Discount ({d.coupon_code})</dt><dd>−{formatMoney(d.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery ({d.shipping_zone})</dt><dd>{d.shipping_fee ? formatMoney(d.shipping_fee) : "Free"}</dd></div>
          {d.tax > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(d.tax)}</dd></div>}
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatMoney(d.total)}</dd></div>
        </dl>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-3xl border border-border p-6 text-sm">
          <h2 className="font-bold">Delivery address</h2>
          <p className="mt-3">{a.full_name}<br />{a.line1}<br />{a.city}, {a.state}<br />{a.phone}</p>
        </section>
        <section className="rounded-3xl border border-border p-6 text-sm">
          <h2 className="font-bold">Payment</h2>
          {pay ? <p className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={pay.status} /> <span className="min-w-0 break-all font-mono text-xs text-muted-foreground">{pay.reference}</span></p> : <p className="mt-3 text-muted-foreground">No payment yet.</p>}
          {d.return_requests.map((r) => <p key={r.id} className="mt-3">Return: <span className="font-semibold">{r.status.toLowerCase()}</span> — {r.reason}</p>)}
        </section>
      </div>

      <section className="rounded-3xl border border-border p-6 text-sm print:hidden">
        <h2 className="font-bold">History</h2>
        <ul className="mt-3 space-y-2">
          {history.map((h) => (
            <li key={h.id} className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4"><span>{STATUS_LABEL[h.to_status] ?? h.to_status}{h.note && h.actor !== "payment" ? ` — ${h.note}` : ""}</span><span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("en-NG")}</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
