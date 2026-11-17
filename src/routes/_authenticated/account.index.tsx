import { createFileRoute, Link } from "@tanstack/react-router";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { myOrdersQuery } from "@/lib/account";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/OrderTimeline";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/account/")({
  head: () => ({"meta": [{"title": "Account overview \u2014 CorrectBuy"}, {"name": "description", "content": "View your recent CorrectBuy orders and account details."}, {"property": "og:title", "content": "Account overview \u2014 CorrectBuy"}, {"property": "og:description", "content": "View your recent CorrectBuy orders and account details."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const orders = useQuery(myOrdersQuery);
  const profile = useQuery({ queryKey: ["profile"], queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data });
  const address = useQuery({ queryKey: ["addresses"], queryFn: async () => (await supabase.from("addresses").select("*").order("is_default", { ascending: false }).limit(1)).data?.[0] ?? null });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Hi{profile.data?.full_name ? `, ${profile.data.full_name.split(" ")[0]}` : ""}</h1>
      <section className="rounded-3xl border border-border p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Recent orders</h2>
          <Link to="/account/orders" className="text-sm font-semibold text-primary">All orders</Link>
        </div>
        {orders.isPending && <ListSkeleton rows={3} className="mt-4" />}
        {orders.isError && <p className="mt-4 text-sm text-destructive">Couldn't load your orders.</p>}
        {orders.data?.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No orders yet. <Link to="/search" className="font-semibold text-primary">Start shopping</Link></p>}
        <ul className="mt-4 divide-y divide-border">
          {orders.data?.slice(0, 3).map((o) => (
            <li key={o.id}>
              <Link to="/account/orders/$id" params={{ id: o.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-3 text-sm hover:text-primary sm:flex sm:flex-wrap sm:justify-between">
                <span className="font-semibold">{o.order_number}</span>
                <StatusBadge status={o.status} />
                <span className="hidden text-muted-foreground sm:inline">{new Date(o.created_at).toLocaleDateString("en-NG")}</span>
                <span className="font-semibold">{formatMoney(o.total)}</span>
                <ArrowRight className="hidden h-4 w-4 shrink-0 sm:block" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-3xl border border-border p-6 text-sm">
          <h2 className="font-bold">Default address</h2>
          {address.data ? (
            <p className="mt-3">{address.data.full_name}<br />{address.data.line1}<br />{address.data.city}, {address.data.state}</p>
          ) : (
            <p className="mt-3 text-muted-foreground">No saved address yet.</p>
          )}
          <Link to="/account/addresses" className="mt-4 inline-block font-semibold text-primary">Manage addresses</Link>
        </section>
        <section className="rounded-3xl border border-border p-6 text-sm">
          <h2 className="font-bold">Profile</h2>
          <p className="mt-3 break-words">{profile.data?.full_name || "—"}<br />{user?.email}<br />{profile.data?.phone}</p>
          <Link to="/account/profile" className="mt-4 inline-block font-semibold text-primary">Edit profile</Link>
        </section>
      </div>
    </div>
  );
}
