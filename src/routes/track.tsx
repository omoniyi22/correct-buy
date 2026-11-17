import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Loader2, Truck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { StaticPage, staticHead } from "@/components/StaticPage";
import { OrderTimeline, StatusBadge } from "@/components/OrderTimeline";
import { trackOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/track")({
  validateSearch: zodValidator(z.object({ order: fallback(z.string(), "").default("") })),
  head: () => staticHead("Track your order", "Check where your CorrectBuy order is with your order number and email or phone."),
  component: TrackPage,
});

type Result = Awaited<ReturnType<typeof trackOrder>>;
const field = "mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function TrackPage() {
  const { order } = Route.useSearch();
  const track = useServerFn(trackOrder);
  const [orderNumber, setOrderNumber] = useState(order);
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setResult(await track({ data: { orderNumber, contact } }));
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  };

  return (
    <StaticPage title="Track your order" intro="Enter your order number and the email or phone number you used at checkout.">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div><label htmlFor="t-order" className="text-sm font-semibold">Order number</label><input id="t-order" required placeholder="CB-10001" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className={field} /></div>
        <div><label htmlFor="t-contact" className="text-sm font-semibold">Email or phone</label><input id="t-contact" required value={contact} onChange={(e) => setContact(e.target.value)} className={field} /></div>
        <button disabled={busy} className="flex h-[46px] items-center justify-center gap-2 rounded-full bg-primary px-8 font-semibold text-primary-foreground disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Track
        </button>
      </form>
      {error && <p role="alert" className="mt-6 text-destructive">{error}</p>}
      {result && !result.found && <p role="alert" className="mt-8 rounded-2xl bg-muted p-5">We couldn't find an order with those details. Check the order number on your confirmation email.</p>}
      {result?.found && (
        <div className="mt-10 space-y-8 rounded-3xl border border-border p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Order</p>
              <p className="font-display text-2xl font-bold">{result.orderNumber}</p>
            </div>
            <StatusBadge status={result.status} />
          </div>
          <OrderTimeline status={result.status} history={result.history} />
          {result.shipments.map((s) => (
            <div key={s.tracking_no} className="flex items-start gap-3 rounded-2xl bg-muted p-4 text-sm">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">{s.carrier} · <span className="font-mono">{s.tracking_no}</span></p>
                {s.estimated_delivery && <p className="text-muted-foreground">Estimated delivery {new Date(s.estimated_delivery).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}</p>}
              </div>
            </div>
          ))}
          {result.shipments.length === 0 && !["CANCELLED", "PENDING_PAYMENT"].includes(result.status) && (
            <p className="text-sm text-muted-foreground">Delivery to {result.zone}. Tracking details appear here once your order ships.</p>
          )}
        </div>
      )}
    </StaticPage>
  );
}
