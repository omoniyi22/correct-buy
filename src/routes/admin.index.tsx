import { createFileRoute, Link } from "@tanstack/react-router";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/money";
import { AdminHeader, Card } from "@/components/admin/ui";
import { StatusBadge } from "@/components/OrderTimeline";

export const Route = createFileRoute("/admin/")({
  head: () => ({"meta": [{"title": "Store dashboard \u2014 CorrectBuy"}, {"name": "description", "content": "Review sales, orders and inventory at CorrectBuy."}, {"property": "og:title", "content": "Store dashboard \u2014 CorrectBuy"}, {"property": "og:description", "content": "Review sales, orders and inventory at CorrectBuy."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: Dashboard,
});

type Dash = {
  orders_today: number; revenue_today: number; pending_payment: number; to_ship: number; returns_open: number;
  failed_supplier_orders: number; open_supplier_orders: number; failed_notifications: number;
  low_stock: { id: string; sku: string; name: string; product_name: string; available: number; low_stock_threshold: number }[];
};

function Dashboard() {
  const d = useQuery({ queryKey: ["admin-dash"], queryFn: async () => { const { data, error } = await supabase.rpc("admin_dashboard"); if (error) throw error; return data as unknown as Dash; }, refetchInterval: 60_000 });
  const recent = useQuery({ queryKey: ["admin-recent"], queryFn: async () => (await supabase.from("orders").select("id, order_number, email, status, total, created_at").order("created_at", { ascending: false }).limit(8)).data ?? [] });

  const refunds = useQuery({
    queryKey: ["admin-refunds-needed"],
    queryFn: async () => (await supabase.from("order_status_history").select("id, note, created_at, orders(id, order_number, email, total, status)").ilike("note", "%refund needed%").order("created_at", { ascending: false }).limit(50)).data ?? [],
    refetchInterval: 60_000,
  });

  if (d.isPending) return <CardsSkeleton count={8} />;
  if (d.isError || !d.data) return <p className="text-destructive">Couldn't load the dashboard.</p>;
  const x = d.data;
  const stats = [
    { l: "Orders today", v: x.orders_today, to: "/admin/orders" },
    { l: "Revenue today", v: formatMoney(x.revenue_today), to: "/admin/orders" },
    { l: "Awaiting payment", v: x.pending_payment, to: "/admin/orders" },
    { l: "To ship", v: x.to_ship, to: "/admin/orders" },
    { l: "Open supplier POs", v: x.open_supplier_orders, to: "/admin/supplier-orders" },
    { l: "Open returns", v: x.returns_open, to: "/admin/returns" },
  ] as const;

  return (
    <div>
      <AdminHeader title="Today" sub={new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.l} to={s.to} className="rounded-2xl border border-border bg-card p-5 hover:border-primary">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className="mt-2 break-words font-display text-xl font-extrabold sm:text-3xl">{s.v}</p>
          </Link>
        ))}
      </div>

      {(x.failed_supplier_orders > 0 || x.failed_notifications > 0) && (
        <div className="mt-6 space-y-2">
          {x.failed_supplier_orders > 0 && <Link to="/admin/supplier-orders" className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"><AlertTriangle className="h-4 w-4" /> {x.failed_supplier_orders} supplier order(s) failed — retry them</Link>}
          {x.failed_notifications > 0 && <p className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"><AlertTriangle className="h-4 w-4" /> {x.failed_notifications} notification(s) failed to send</p>}
        </div>
      )}

      {(refunds.data?.length ?? 0) > 0 && (
        <Card className="mt-6 border-destructive">
          <h2 className="flex items-center gap-2 font-bold text-destructive"><AlertTriangle className="h-4 w-4" /> Refund needed — paid after the order closed</h2>
          <p className="mt-1 text-sm text-muted-foreground">These customers were charged after their order expired or was cancelled. Refund each one in the Paystack dashboard (Transactions → find the reference → Refund), then add a staff note on the order.</p>
          <ul className="mt-3 divide-y divide-border text-sm">
            {refunds.data!.map((r) => {
              const o = r.orders as unknown as { id: string; order_number: string; email: string; total: number } | null;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0">{o ? <Link to="/admin/orders/$id" params={{ id: o.id }} className="font-semibold text-primary">{o.order_number}</Link> : "Order"} · {o?.email} · {o ? formatMoney(o.total) : ""}<br /><span className="text-xs text-muted-foreground">{r.note}</span></span>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-NG")}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between"><h2 className="font-bold">Low stock</h2><Link to="/admin/inventory" className="text-sm font-semibold text-primary">Inventory</Link></div>
          {x.low_stock.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">All variants are above their threshold.</p> : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {x.low_stock.map((v) => (
                <li key={v.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2"><span className="min-w-0 break-words">{v.product_name} · {v.name} <span className="font-mono text-xs text-muted-foreground">{v.sku}</span></span><span className={v.available === 0 ? "shrink-0 font-bold text-destructive" : "shrink-0 font-bold"}>{v.available} left</span></li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between"><h2 className="font-bold">Latest orders</h2><Link to="/admin/orders" className="text-sm font-semibold text-primary">All orders</Link></div>
          <ul className="mt-3 divide-y divide-border text-sm">
            {recent.data?.map((o) => (
              <li key={o.id}><Link to="/admin/orders/$id" params={{ id: o.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 hover:text-primary sm:flex sm:flex-wrap sm:justify-between"><span className="min-w-0 break-words font-semibold">{o.order_number}</span><span className="hidden truncate text-muted-foreground sm:block">{o.email}</span><StatusBadge status={o.status} /><span className="font-semibold">{formatMoney(o.total)}</span></Link></li>
            ))}
            {recent.data?.length === 0 && <li className="py-3 text-muted-foreground">No orders yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
