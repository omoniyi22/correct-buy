import { useEffect, useState } from "react";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Loader2, Minus, Plus, Tag, Trash2 } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteFooter } from "@/components/SiteHeader";
import { cart, useCart } from "@/lib/cart";
import { useQuote } from "@/lib/quote";
import { formatMoney } from "@/lib/money";
import { storeConfigQuery } from "@/lib/settings";
import { track } from "@/lib/analytics";
import { visibleCities } from "@/lib/delivery";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — CorrectBuy" },
      { name: "description", content: "Review the items in your CorrectBuy cart." },
      { property: "og:title", content: "Your cart — CorrectBuy" },
      { property: "og:description", content: "Review the items in your CorrectBuy cart." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const lines = useCart();
  const navigate = useNavigate();
  const { data: config } = useSuspenseQuery(storeConfigQuery);
  const [zone, setZone] = useState<string>("");
  const [city, setCity] = useState("");
  const cities = visibleCities(config.zones, config.cities, zone);
  const [coupon, setCoupon] = useState("");
  const [couponInput, setCouponInput] = useState("");
  useEffect(() => {
    const c = cart.getCoupon();
    setCoupon(c);
    setCouponInput(c);
  }, []);
  const quote = useQuote(lines, zone || null, coupon, city);
  const q = quote.data;

  // Apply server corrections (sold out / reduced stock / removed items) to the saved cart.
  useEffect(() => {
    if (!q) return;
    const fixed = q.lines.filter((l) => l.ok).map((l) => ({ id: l.variant_id, qty: l.qty }));
    const changed = fixed.length !== lines.length || fixed.some((f) => lines.find((l) => l.id === f.id)?.qty !== f.qty);
    if (changed && q.lines.length === lines.length) cart.replace(fixed);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const c = couponInput.trim().toUpperCase();
    setCoupon(c);
    cart.setCoupon(c);
  };

  if (lines.length === 0) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h1 className="text-5xl font-extrabold">Your cart</h1>
          <p className="mt-6 text-muted-foreground">Your cart is empty.</p>
          <Link to="/search" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Start shopping</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const shown = q?.lines.filter((l) => !l.removed) ?? [];
  const toFree = q ? q.free_shipping_threshold - q.subtotal : 0;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Your cart</h1>

        {q && q.warnings.length > 0 && (
          <div role="alert" className="mt-6 space-y-1 rounded-2xl border border-warning bg-warning/15 p-4 text-sm">
            {q.warnings.map((w) => (
              <p key={w} className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> {w}</p>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="divide-y divide-border">
            {quote.isPending && !q && <ListSkeleton rows={3} className="py-6" />}
            {quote.isError && <p className="py-6 text-destructive">We couldn't check your cart. Please refresh.</p>}
            {shown.map((l) => (
              <div key={l.variant_id} className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3 py-5 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <Link to="/p/$slug" params={{ slug: l.product_slug }} className="shrink-0">
                  <img src={l.image_url} alt={l.product_name} className="h-16 w-16 rounded-lg object-cover sm:h-24 sm:w-24" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to="/p/$slug" params={{ slug: l.product_slug }} className="font-bold hover:text-primary">{l.product_name}</Link>
                  <p className="text-sm text-muted-foreground">{l.variant_name} · {formatMoney(l.unit_price)}</p>
                  {!l.ok && <p className="text-sm font-semibold text-destructive">Out of stock</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <button aria-label="Decrease quantity" onClick={() => cart.setQty(l.variant_id, l.qty - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-border"><Minus className="h-3 w-3" /></button>
                    <span className="w-6 text-center font-semibold">{l.qty}</span>
                    <button aria-label="Increase quantity" disabled={l.qty >= l.available} onClick={() => cart.setQty(l.variant_id, l.qty + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-border disabled:opacity-40"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
                <div className="col-start-2 flex items-center justify-between gap-3 sm:col-start-auto sm:block sm:text-right">
                  <p className="font-display font-bold">{formatMoney(l.line_total)}</p>
                  <button aria-label={`Remove ${l.product_name}`} onClick={() => cart.remove(l.variant_id)} className="mt-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit space-y-4 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border">
            <form onSubmit={applyCoupon} className="flex gap-2">
              <label htmlFor="coupon" className="sr-only">Coupon code</label>
              <div className="relative min-w-0 flex-1">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Coupon code" className="w-full rounded-full border border-input bg-background py-2.5 pl-9 pr-3 text-sm uppercase" />
              </div>
              <button className="rounded-full border border-secondary px-4 text-sm font-semibold">Apply</button>
            </form>
            {q?.coupon && (
              <p className={q.coupon.valid ? "text-sm text-success" : "text-sm text-destructive"}>
                {q.coupon.code}: {q.coupon.message}{" "}
                {coupon && <button className="underline" onClick={() => { setCoupon(""); setCouponInput(""); cart.setCoupon(""); }}>Remove</button>}
              </p>
            )}

            <div>
              <label htmlFor="zone" className="text-sm font-semibold">Estimate delivery</label>
              <select id="zone" value={zone} onChange={(e) => { setZone(e.target.value); setCity(""); }} className="mt-1 w-full rounded-full border border-input bg-background px-4 py-2.5 text-sm">
                <option value="">Choose your state</option>
                {config.zones.map((z) => <option key={z.id} value={z.name}>{z.name} — {formatMoney(z.fee)} ({z.eta_days} days)</option>)}
              </select>
              <label htmlFor="cart-city" className="mt-3 block text-sm font-semibold">City / area</label>
              <select id="cart-city" disabled={!zone} value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-full border border-input bg-background px-4 py-2.5 text-sm"><option value="">Choose your city</option>{cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
            </div>

            {q && (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(q.subtotal)}</dd></div>
                {q.discount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd>−{formatMoney(q.discount)}</dd></div>}
                <div className="flex justify-between"><dt>Delivery</dt><dd>{q.subtotal >= q.free_shipping_threshold ? "Free" : zone ? (q.shipping_fee === 0 ? "Free" : formatMoney(q.shipping_fee)) : "Choose your state"}</dd></div>
                {q.tax > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(q.tax)}</dd></div>}
                <div className="flex justify-between border-t border-border pt-3 text-lg font-bold"><dt>Total</dt><dd>{formatMoney(q.total)}</dd></div>
              </dl>
            )}
            {q && toFree > 0 && <p className="text-xs text-muted-foreground">Add {formatMoney(toFree)} more for free delivery.</p>}
            <button
              disabled={!q || shown.every((l) => !l.ok)}
              onClick={() => {
                if (q) track("begin_checkout", { value: q.total, items: shown.map((l) => ({ item_id: l.sku, item_name: l.product_name, price: l.unit_price / 100, quantity: l.qty })) });
                navigate({ to: "/checkout" });
              }}
              className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-50"
            >
              Checkout
            </button>
            <p className="text-center text-xs text-muted-foreground">{config.settings.store_name} — secure checkout</p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
