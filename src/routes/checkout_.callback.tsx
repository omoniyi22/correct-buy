import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { getPaymentStatus, retryPayment } from "@/lib/orders.functions";

// Waits for the provider's confirmation (webhook / server verify). Never marks anything paid itself.
export const Route = createFileRoute("/checkout_/callback")({
  validateSearch: zodValidator(z.object({ reference: fallback(z.string(), "").default(""), trxref: fallback(z.string(), "").default("") })),
  head: () => ({ meta: [{ title: "Confirming payment — CorrectBuy" }, { name: "description", content: "Confirming your payment." }, { property: "og:title", content: "Confirming payment — CorrectBuy" }, { property: "og:description", content: "Confirming your payment." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: CallbackPage,
});

function CallbackPage() {
  const search = Route.useSearch();
  const reference = search.reference || search.trxref;
  const navigate = useNavigate();
  const getStatus = useServerFn(getPaymentStatus);
  const retry = useServerFn(retryPayment);
  const [started] = useState(() => Date.now());
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  const s = useQuery({
    queryKey: ["payment-status", reference],
    enabled: !!reference,
    queryFn: () => getStatus({ data: { reference } }),
    refetchInterval: (q) => (q.state.data?.paymentStatus === "INITIATED" && Date.now() - started < 120_000 ? 2000 : false),
  });
  const d = s.data;

  useEffect(() => {
    if (d?.paymentStatus === "SUCCESS" && d.orderStatus !== "PENDING_PAYMENT") {
      navigate({ to: "/order-confirmed/$orderNumber", params: { orderNumber: d.orderNumber }, search: { t: d.token }, replace: true });
    }
  }, [d, navigate]);

  const onRetry = async () => {
    if (!d) return;
    setRetrying(true);
    setRetryError("");
    try {
      const r = await retry({ data: { orderNumber: d.orderNumber, token: d.token } });
      window.location.assign(r.redirectUrl);
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : "Could not retry payment");
      setRetrying(false);
    }
  };

  const timedOut = d?.paymentStatus === "INITIATED" && Date.now() - started >= 120_000;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-xl ring-1 ring-border" aria-live="polite">
        {(!d || (d.paymentStatus === "INITIATED" && !timedOut) || (d.paymentStatus === "SUCCESS")) && !s.isError && d !== null && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h1 className="mt-4 font-display text-2xl font-bold">Confirming your payment…</h1>
            <p className="mt-2 text-sm text-muted-foreground">This usually takes a few seconds. Please don't close this page.</p>
          </>
        )}
        {timedOut && (
          <>
            <Clock className="mx-auto h-10 w-10 text-warning-foreground" />
            <h1 className="mt-4 font-display text-2xl font-bold">Payment pending</h1>
            <p className="mt-2 text-sm text-muted-foreground">We haven't heard back from the bank yet. We'll email you as soon as it's confirmed.</p>
            <Link to="/track" search={{ order: d.orderNumber }} className="mt-6 inline-block font-semibold text-primary">Track order {d.orderNumber}</Link>
          </>
        )}
        {d?.paymentStatus === "FAILED" && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 font-display text-2xl font-bold">Payment didn't go through</h1>
            {d.orderStatus === "PENDING_PAYMENT" ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">No money was taken. Your items are still held for a few minutes.</p>
                <button disabled={retrying} onClick={onRetry} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground disabled:opacity-60">
                  {retrying && <Loader2 className="h-4 w-4 animate-spin" />} Retry payment
                </button>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">The payment window for order {d.orderNumber} has closed. Please place a new order.</p>
            )}
            {retryError && <p className="mt-3 text-sm text-destructive">{retryError}</p>}
            <Link to="/cart" className="mt-4 block text-sm font-semibold text-muted-foreground">Back to cart</Link>
          </>
        )}
        {(d === null || !reference || s.isError) && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 font-display text-2xl font-bold">We couldn't find that payment</h1>
            <Link to="/" className="mt-6 inline-block font-semibold text-primary">Go home</Link>
          </>
        )}
        {d?.paymentStatus === "SUCCESS" && <CheckCircle2 className="sr-only" />}
      </div>
    </div>
  );
}
