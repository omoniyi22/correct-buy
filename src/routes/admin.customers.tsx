import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/money";
import { AdminHeader, input, States, TableWrap, td, th } from "@/components/admin/ui";
import { StatusBadge } from "@/components/OrderTimeline";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({"meta": [{"title": "Customers \u2014 CorrectBuy"}, {"name": "description", "content": "View CorrectBuy shoppers and their order history."}, {"property": "og:title", "content": "Customers \u2014 CorrectBuy"}, {"property": "og:description", "content": "View CorrectBuy shoppers and their order history."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: Customers,
});

type Row = { key: string; email: string; name: string; phone: string; registered: boolean; orders: { id: string; order_number: string; status: string; total: number; created_at: string }[] };

function Customers() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const data = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const [p, o] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, phone, created_at"),
        supabase.from("orders").select("id, order_number, status, total, created_at, email, phone, user_id, shipping_address").order("created_at", { ascending: false }).limit(1000),
      ]);
      if (p.error) throw p.error;
      if (o.error) throw o.error;
      const map = new Map<string, Row>();
      for (const x of p.data) map.set((x.email ?? x.id).toLowerCase(), { key: x.id, email: x.email ?? "", name: x.full_name ?? "", phone: x.phone ?? "", registered: true, orders: [] });
      for (const x of o.data) {
        const k = x.email.toLowerCase();
        const r = map.get(k) ?? { key: k, email: x.email, name: (x.shipping_address as { full_name?: string })?.full_name ?? "", phone: x.phone, registered: false, orders: [] };
        r.orders.push(x);
        if (!r.phone) r.phone = x.phone;
        map.set(k, r);
      }
      return [...map.values()].sort((a, b) => (b.orders[0]?.created_at ?? "").localeCompare(a.orders[0]?.created_at ?? ""));
    },
  });

  const rows = (data.data ?? []).filter((r) => { const t = q.toLowerCase(); return !t || r.email.toLowerCase().includes(t) || r.name.toLowerCase().includes(t) || r.phone.includes(t); });

  return (
    <div>
      <AdminHeader title="Customers" sub="Registered accounts and guest shoppers" />
      <input aria-label="Search customers" placeholder="Search name, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} className={`${input} mb-4 max-w-sm`} />
      <States q={{ ...data, data: rows }} empty="No customers yet.">
        <TableWrap>
          <thead className="bg-muted"><tr><th className={th}>Customer</th><th className={th}>Phone</th><th className={th}>Type</th><th className={th}>Orders</th><th className={th}>Spent</th></tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const spent = r.orders.filter((o) => !["PENDING_PAYMENT", "CANCELLED", "REFUNDED"].includes(o.status)).reduce((n, o) => n + o.total, 0);
              return [
                <tr key={r.key} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpen(open === r.key ? null : r.key)}>
                  <td className={td}><span className="font-semibold">{r.name || "—"}</span><br /><span className="text-xs text-muted-foreground">{r.email}</span></td>
                  <td className={td}>{r.phone || "—"}</td>
                  <td className={td}>{r.registered ? "Account" : "Guest"}</td>
                  <td className={td}>{r.orders.length}</td>
                  <td className={`${td} font-semibold`}>{formatMoney(spent)}</td>
                </tr>,
                open === r.key && (
                  <tr key={`${r.key}-orders`}><td colSpan={5} className="bg-muted/40 p-3">
                    {r.orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders.</p> : r.orders.map((o) => (
                      <Link key={o.id} to="/admin/orders/$id" params={{ id: o.id }} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1 text-sm hover:text-primary"><span className="font-semibold">{o.order_number}</span><span>{new Date(o.created_at).toLocaleDateString("en-NG")}</span><StatusBadge status={o.status} /><span>{formatMoney(o.total)}</span></Link>
                    ))}
                  </td></tr>
                ),
              ];
            })}
          </tbody>
        </TableWrap>
      </States>
    </div>
  );
}
