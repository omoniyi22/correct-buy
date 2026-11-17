import { useEffect, useRef } from "react";
import { cdnImage } from "@/lib/storage";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Package, UserPlus } from "lucide-react";
import { SiteFooter } from "@/components/SiteHeader";
import { StatusBadge } from "@/components/OrderTimeline";
import { getOrderByToken } from "@/lib/orders.functions";
import { formatMoney } from "@/lib/money";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/order-confirmed/$orderNumber")({
  validateSearch: zodValidator(z.object({ t: fallback(z.string(), "").default("") })),
  head: ({ params }) => ({ meta: [{ title: `Order ${params.orderNumber} confirmed — CorrectBuy` }, { name: "description", content: "Thanks for your order." }, { property: "og:title", content: "Order confirmed — CorrectBuy" }, { property: "og:description", content: "Thanks for your order." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const { orderNumber } = Route.useParams();
  const { t } = Route.useSearch();
  const { user } = useAuth();
  const get = useServerFn(getOrderByToken);
  const tracked = useRef(false);
  const o = useQuery({
    queryKey: ["order-token", orderNumber, t],
    enabled: !!t,
    queryFn: () => get({ data: { orderNumber, token: t } }),
  });

  useEffect(() => {
    const d = o.data;
    if (!d || tracked.current || d.status === "PENDING_PAYMENT") return;
    tracked.current = true;
    track("purchase", {
      transaction_id: d.order_number,
      value: d.total,
      items: d.order_items.map((i) => ({ item_id: i.sku, item_name: i.product_name, price: i.unit_price / 100, quantity: i.qty })),
    });
  }, [o.data]);

  const d = o.data;
  const a = d?.shipping_address as { full_name: string; line1: string; city: string; state: string; phone: string } | undefined;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
        {o.isPending && t && <ListSkeleton rows={4} />}
        {(!t || d === null || o.isError) && (
          <div className="text-center">
            <h1 className="text-3xl font-extrabold">Order {orderNumber}</h1>
            <p className="mt-3 text-muted-foreground">Use the link from your confirmation email, or track it with your email address.</p>
            <Link to="/track" search={{ order: orderNumber }} className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Track this order</Link>
          </div>
        )}
        {d && a && (
          <>
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
              <h1 className="mt-4 text-4xl font-extrabold">Thank you!</h1>
              <p className="mt-2 text-muted-foreground">Order <span className="font-semibold text-foreground">{d.order_number}</span> is confirmed. We've sent a receipt to {d.email}.</p>
              <div className="mt-3"><StatusBadge status={d.status} /></div>
            </div>

            <section className="mt-10 rounded-3xl border border-border p-6">
              <h2 className="font-bold">Items</h2>
              <ul className="mt-4 divide-y divide-border">
                {d.order_items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-3 text-sm">
                    <img src={cdnImage(i.image_url)} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    <span className="flex-1"><span className="block font-semibold">{i.product_name}</span><span className="text-muted-foreground">{i.variant_name} × {i.qty}</span></span>
                    <span className="font-semibold">{formatMoney(i.unit_price * i.qty)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(d.subtotal)}</dd></div>
                {d.discount > 0 && <div className="flex justify-between text-success"><dt>Discount {d.coupon_code && `(${d.coupon_code})`}</dt><dd>−{formatMoney(d.discount)}</dd></div>}
                <div className="flex justify-between"><dt>Delivery</dt><dd>{d.shipping_fee ? formatMoney(d.shipping_fee) : "Free"}</dd></div>
                {d.tax > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(d.tax)}</dd></div>}
                <div className="flex justify-between pt-2 text-lg font-bold"><dt>Total paid</dt><dd>{formatMoney(d.total)}</dd></div>
              </dl>
            </section>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <section className="rounded-3xl border border-border p-6 text-sm">
                <h2 className="font-bold">Delivering to</h2>
                <p className="mt-3">{a.full_name}<br />{a.line1}<br />{a.city}, {a.state}<br />{a.phone}</p>
              </section>
              <section className="rounded-3xl border border-border p-6 text-sm">
                <h2 className="flex items-center gap-2 font-bold"><Package className="h-4 w-4 text-primary" /> What happens next</h2>
                <ol className="mt-3 list-decimal space-y-1 pl-4 text-muted-foreground">
                  <li>We prepare your order with our supplier.</li>
                  <li>You get a tracking number by email and SMS when it ships.</li>
                  <li>Delivery to {d.shipping_zone} usually takes a few working days.</li>
                </ol>
                <Link to="/track" search={{ order: d.order_number }} className="mt-4 inline-block font-semibold text-primary">Track your order →</Link>
              </section>
            </div>

            {!user && !d.hasAccount && (
              <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-accent p-6">
                <p className="flex items-center gap-2 font-semibold"><UserPlus className="h-5 w-5 text-primary" /> Create an account to track all your orders in one place.</p>
                <Link to="/register" search={{ email: d.email }} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Create account</Link>
              </section>
            )}
            <div className="mt-8 text-center"><Link to="/search" className="font-semibold text-primary">Continue shopping</Link></div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
