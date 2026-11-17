import { useState } from "react";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, FlaskConical, Loader2 } from "lucide-react";
import { completeTestPayment, getTestPayment } from "@/lib/orders.functions";
import { formatMoney } from "@/lib/money";

// Stand-in for the payment provider's hosted page while no live payment key is connected.
export const Route = createFileRoute("/checkout_/pay")({
  validateSearch: zodValidator(z.object({ reference: fallback(z.string(), "").default("") })),
  head: () => ({ meta: [{ title: "Secure payment — CorrectBuy" }, { name: "description", content: "Complete your payment." }, { property: "og:title", content: "Secure payment — CorrectBuy" }, { property: "og:description", content: "Complete your payment." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: PayPage,
});

function PayPage() {
  const { reference } = Route.useSearch();
  const navigate = useNavigate();
  const get = useServerFn(getTestPayment);
  const complete = useServerFn(completeTestPayment);
  const [busy, setBusy] = useState<"" | "success" | "failed">("");
  const p = useQuery({ queryKey: ["test-payment", reference], queryFn: () => get({ data: { reference } }), enabled: !!reference });

  const pay = async (outcome: "success" | "failed") => {
    setBusy(outcome);
    try {
      await complete({ data: { reference, outcome } });
    } finally {
      navigate({ to: "/checkout/callback", search: { reference } });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-xl ring-1 ring-border">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-warning/25 px-3 py-1 text-xs font-bold"><FlaskConical className="h-3.5 w-3.5" /> Test payment — no real money moves</p>
        {p.isPending && <FormSkeleton fields={2} />}
        {p.data === null && <p className="mt-6 text-destructive">This payment link is not valid.</p>}
        {p.data && (
          <>
            <p className="mt-6 text-sm text-muted-foreground">Pay CorrectBuy · Order {p.data.orderNumber}</p>
            <p className="mt-1 font-display text-4xl font-extrabold">{formatMoney(p.data.amount, p.data.currency)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{p.data.email}</p>
            {p.data.status !== "INITIATED" ? (
              <button onClick={() => navigate({ to: "/checkout/callback", search: { reference } })} className="mt-8 w-full rounded-full bg-secondary py-4 font-semibold text-secondary-foreground">See payment result</button>
            ) : (
              <div className="mt-8 space-y-3">
                <button disabled={!!busy} onClick={() => pay("success")} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60">
                  {busy === "success" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pay {formatMoney(p.data.amount, p.data.currency)}
                </button>
                <button disabled={!!busy} onClick={() => pay("failed")} className="w-full rounded-full border border-border py-3 text-sm font-semibold text-muted-foreground disabled:opacity-60">
                  Simulate a declined card
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
