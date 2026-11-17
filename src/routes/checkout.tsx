import { useEffect, useState } from "react";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2, Lock } from "lucide-react";
import { cart, useCart } from "@/lib/cart";
import { useQuote } from "@/lib/quote";
import { formatMoney } from "@/lib/money";
import { storeConfigQuery } from "@/lib/settings";
import { placeOrder } from "@/lib/orders.functions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import { visibleCities } from "@/lib/delivery";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — CorrectBuy" },
      { name: "description", content: "Enter your delivery details and pay securely." },
      { property: "og:title", content: "Checkout — CorrectBuy" },
      { property: "og:description", content: "Enter your delivery details and pay securely." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

const field = "mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";
type Addr = { full_name: string; phone: string; line1: string; city: string; state: string };

function CheckoutPage() {
  const lines = useCart();
  const place = useServerFn(placeOrder);
  const { user } = useAuth();
  const { data: config } = useSuspenseQuery(storeConfigQuery);
  const [email, setEmail] = useState("");
  const [addr, setAddr] = useState<Addr>({ full_name: "", phone: "", line1: "", city: "", state: "" });
  const [coupon, setCoupon] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [notes, setNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const saved = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").order("is_default", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    const c = cart.getCoupon();
    setCoupon(c);
    setCouponInput(c);
  }, []);
  useEffect(() => {
    const userEmail = user?.email;
    if (userEmail) setEmail((e) => e || userEmail);
  }, [user]);
  useEffect(() => {
    const d = saved.data?.[0];
    if (d) setAddr((a) => (a.line1 ? a : { full_name: d.full_name, phone: d.phone, line1: d.line1, city: d.city, state: d.state }));
  }, [saved.data]);

  const cities = visibleCities(config.zones, config.cities, addr.state);
  const locationValid = cities.some((c) => c.name === addr.city);
  const quote = useQuote(lines, addr.state || null, coupon, addr.city);
  const q = quote.data;
  const items = q?.lines.filter((l) => l.ok) ?? [];

  if (lines.length === 0) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-xl px-6 py-20 text-center">
          <h1 className="text-4xl font-extrabold">Checkout</h1>
          <p className="mt-4 text-muted-foreground">Your cart is empty.</p>
          <Link to="/search" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Continue shopping</Link>
        </main>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q || !locationValid || !q.zone_valid) return;
    setBusy(true);
    setError("");
    try {
      const res = await place({
        data: {
          email,
          phone: addr.phone,
          items: items.map((l) => ({ variant_id: l.variant_id, qty: l.qty })),
          zone: addr.state,
          address: addr,
          coupon,
          notes,
          saveAddress: !!user && saveAddress && !saved.data?.some((s) => s.line1 === addr.line1 && s.state === addr.state),
        },
      });
      sessionStorage.setItem(`order:${res.orderNumber}`, res.token);
      cart.clear();
      if (res.redirectUrl.startsWith("/")) window.location.assign(res.redirectUrl);
      else window.location.href = res.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't place your order.");
      void quote.refetch();
      setBusy(false);
    }
  };

  const set = (k: keyof Addr) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddr({ ...addr, [k]: e.target.value });

  return (
    <div className="min-h-screen bg-muted/30">
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
        <h1 className="text-4xl font-extrabold">Checkout</h1>
        {!user && (
          <p className="mt-3 text-sm text-muted-foreground">
            Have an account? <Link to="/login" search={{ redirect: "/checkout" }} className="font-semibold text-primary">Sign in</Link> for faster checkout — or continue as a guest.
          </p>
        )}

        <form onSubmit={submit} className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6 [&>section]:min-w-0 [&>section]:p-4 sm:[&>section]:p-6">
            <section className="rounded-3xl bg-card p-6 ring-1 ring-border">
              <h2 className="text-lg font-bold">Contact</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="co-email" className="text-sm font-semibold">Email</label><input id="co-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} autoComplete="email" /></div>
                <div><label htmlFor="co-phone" className="text-sm font-semibold">Phone</label><input id="co-phone" type="tel" required minLength={7} value={addr.phone} onChange={set("phone")} className={field} autoComplete="tel" placeholder="080..." /></div>
              </div>
            </section>

            <section className="rounded-3xl bg-card p-6 ring-1 ring-border">
              <h2 className="text-lg font-bold">Delivery address</h2>
              {saved.data && saved.data.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {saved.data.map((s) => (
                    <button type="button" key={s.id} onClick={() => setAddr({ full_name: s.full_name, phone: s.phone, line1: s.line1, city: s.city, state: s.state })}
                      className="rounded-xl border border-border px-3 py-2 text-left text-xs hover:border-primary">
                      <span className="font-semibold">{s.full_name}</span><br />{s.line1}, {s.city}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label htmlFor="co-name" className="text-sm font-semibold">Full name</label><input id="co-name" required minLength={2} value={addr.full_name} onChange={set("full_name")} className={field} autoComplete="name" /></div>
                <div className="sm:col-span-2"><label htmlFor="co-line1" className="text-sm font-semibold">Street address</label><input id="co-line1" required minLength={3} value={addr.line1} onChange={set("line1")} className={field} autoComplete="street-address" /></div>
                <div>
                  <label htmlFor="co-state" className="text-sm font-semibold">State / delivery zone</label>
                  <select id="co-state" required value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value, city: "" })} className={field}>
                    <option value="">Choose…</option>
                    {config.zones.map((z) => <option key={z.id} value={z.name}>{z.name}</option>)}
                  </select>
                </div>
                <div><label htmlFor="co-city" className="text-sm font-semibold">City / area</label><select id="co-city" required disabled={!addr.state} value={locationValid ? addr.city : ""} onChange={set("city")} className={field}><option value="">Choose city…</option>{cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
              </div>
              {user && (
                <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} /> Save this address to my account</label>
              )}
            </section>

            <section className="rounded-3xl bg-card p-6 ring-1 ring-border">
              <h2 className="text-lg font-bold">Delivery method</h2>
              {locationValid ? (
                <p className="mt-3 text-sm">
                  Standard delivery to {addr.city ? `${addr.city}, ` : ""}{addr.state} · {config.zones.find((z) => z.name === addr.state)?.eta_days} working days ·{" "}
                  <span className="font-semibold">{q ? (q.shipping_fee === 0 ? "Free" : formatMoney(q.shipping_fee)) : "…"}</span>
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Choose your state and city to see the delivery fee.</p>
              )}
              <label htmlFor="co-notes" className="mt-4 block text-sm font-semibold">Delivery notes (optional)</label>
              <textarea id="co-notes" maxLength={500} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
            </section>

            <section className="rounded-3xl bg-card p-6 ring-1 ring-border">
              <h2 className="text-lg font-bold">Payment</h2>
              <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> After you place your order you'll pay on our payment partner's secure page (card, transfer or USSD). Your stock is held for 30 minutes.</p>
            </section>
          </div>

          <aside className="min-w-0 h-fit space-y-4 rounded-3xl bg-card p-4 ring-1 ring-border sm:p-6 lg:sticky lg:top-28">
            <h2 className="text-lg font-bold">Order summary</h2>
            {quote.isError && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">We couldn't check prices right now. Please refresh the page.</p>}
            {quote.isPending && !q && <ListSkeleton rows={3} />}
            {q && q.warnings.length > 0 && (
              <div role="alert" className="space-y-1 rounded-xl bg-warning/20 p-3 text-xs">
                {q.warnings.map((w) => <p key={w} className="flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{w}</p>)}
              </div>
            )}
            <ul className="space-y-3">
              {items.map((l) => (
                <li key={l.variant_id} className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 text-sm sm:grid-cols-[48px_minmax(0,1fr)_auto]">
                  <img src={l.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{l.product_name}</span><span className="text-muted-foreground">{l.variant_name} × {l.qty}</span></span>
                  <span className="col-start-2 font-semibold sm:col-start-auto">{formatMoney(l.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <label htmlFor="co-coupon" className="sr-only">Coupon code</label>
              <input id="co-coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Coupon code" className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm uppercase" />
              <button type="button" onClick={() => { const c = couponInput.trim().toUpperCase(); setCoupon(c); cart.setCoupon(c); }} className="rounded-full border border-secondary px-4 text-sm font-semibold">Apply</button>
            </div>
            {q?.coupon && <p className={q.coupon.valid ? "text-xs text-success" : "text-xs text-destructive"}>{q.coupon.code}: {q.coupon.message}</p>}
            {q && (
              <dl className="space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(q.subtotal)}</dd></div>
                {q.discount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd>−{formatMoney(q.discount)}</dd></div>}
                <div className="flex justify-between"><dt>Delivery</dt><dd>{addr.state || q.shipping_fee === 0 ? (q.shipping_fee === 0 ? "Free" : formatMoney(q.shipping_fee)) : "—"}</dd></div>
                {q.tax > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(q.tax)}</dd></div>}
                <div className="flex justify-between border-t border-border pt-3 text-lg font-bold"><dt>Total</dt><dd>{formatMoney(q.total)}</dd></div>
              </dl>
            )}
            {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <button
              disabled={busy || !q || quote.isFetching || !locationValid || !q.zone_valid || items.length === 0 || (q.coupon !== null && !q.coupon.valid)}
              onClick={() => q && track("begin_checkout", { value: q.total, items: items.map((l) => ({ item_id: l.sku, item_name: l.product_name, price: l.unit_price / 100, quantity: l.qty })) })}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Place order {q ? `· ${formatMoney(q.total)}` : ""}
            </button>
            {q?.coupon && !q.coupon.valid && <p className="text-xs text-muted-foreground">Remove or fix the coupon to continue.</p>}
            <p className="text-center text-xs text-muted-foreground">By placing your order you agree to our <Link to="/terms" className="underline">terms</Link>.</p>
          </aside>
        </form>
      </main>
    </div>
  );
}
