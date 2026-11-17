import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  REFUNDED: "Refunded",
};

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "DELIVERED" || status === "PAID" || status === "SUCCESS"
      ? "bg-success/15 text-success"
      : status === "CANCELLED" || status === "FAILED" || status === "REFUNDED"
        ? "bg-destructive/10 text-destructive"
        : status === "PENDING_PAYMENT" || status === "RETURN_REQUESTED" || status === "INITIATED"
          ? "bg-warning/25 text-warning-foreground"
          : "bg-accent text-accent-foreground";
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", tone)}>{STATUS_LABEL[status] ?? status.replace(/_/g, " ").toLowerCase()}</span>;
}

const STEPS = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

/** Paid → Processing → Shipped → Delivered, with the time each step happened. */
export function OrderTimeline({ status, history }: { status: string; history: { to_status: string; created_at: string }[] }) {
  const at = (s: string) => history.find((h) => h.to_status === s)?.created_at;
  const reached = STEPS.indexOf(status as (typeof STEPS)[number]);
  const after = ["RETURN_REQUESTED", "REFUNDED"].includes(status) ? 3 : reached;
  if (status === "CANCELLED") return <p className="rounded-2xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">This order was cancelled.</p>;
  if (status === "PENDING_PAYMENT") return <p className="rounded-2xl bg-warning/20 p-4 text-sm font-semibold">Waiting for payment confirmation.</p>;
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((s, i) => {
        const done = i <= after;
        const t = at(s);
        return (
          <li key={s} className="text-center">
            <div className={cn("mx-auto grid h-9 w-9 place-items-center rounded-full border-2", done ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <p className={cn("mt-2 text-xs font-semibold sm:text-sm", !done && "text-muted-foreground")}>{STATUS_LABEL[s]}</p>
            {t && <p className="text-[11px] text-muted-foreground">{new Date(t).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</p>}
          </li>
        );
      })}
    </ol>
  );
}
