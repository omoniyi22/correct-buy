import { useState } from "react";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { myOrdersQuery } from "@/lib/account";
import { formatMoney } from "@/lib/money";
import { STATUS_LABEL, StatusBadge } from "@/components/OrderTimeline";

export const Route = createFileRoute("/_authenticated/account/orders/")({
  head: () => ({"meta": [{"title": "Your orders \u2014 CorrectBuy"}, {"name": "description", "content": "View and track your CorrectBuy orders."}, {"property": "og:title", "content": "Your orders \u2014 CorrectBuy"}, {"property": "og:description", "content": "View and track your CorrectBuy orders."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: OrdersPage,
});

function OrdersPage() {
  const orders = useQuery(myOrdersQuery);
  const [status, setStatus] = useState("");
  const list = (orders.data ?? []).filter((o) => !status || o.status === status);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Your orders</h1>
        <label className="sr-only" htmlFor="o-status">Filter by status</label>
        <select id="o-status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full border border-border bg-background px-4 py-2 text-sm">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {orders.isPending && <ListSkeleton rows={5} className="mt-6" />}
      {orders.isError && <p className="mt-6 text-destructive">Couldn't load your orders. Please refresh.</p>}
      {orders.data && list.length === 0 && <p className="mt-6 rounded-2xl bg-muted p-6 text-muted-foreground">{status ? "No orders with this status." : "You haven't placed any orders yet."}</p>}
      {list.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Items</th><th className="p-3">Status</th><th className="p-3 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((o) => (
                <tr key={o.id} className="hover:bg-muted/50">
                  <td className="p-3 font-semibold"><Link to="/account/orders/$id" params={{ id: o.id }} className="text-primary hover:underline">{o.order_number}</Link></td>
                  <td className="p-3">{new Date(o.created_at).toLocaleDateString("en-NG")}</td>
                  <td className="p-3">{o.order_items.length}</td>
                  <td className="p-3"><StatusBadge status={o.status} /></td>
                  <td className="p-3 text-right font-semibold">{formatMoney(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
