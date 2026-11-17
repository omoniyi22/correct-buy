import { useEffect } from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, MapPin, Package, User } from "lucide-react";
import { SiteFooter } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { claimGuestOrders } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Your account — CorrectBuy" }, { name: "description", content: "Orders, addresses and profile." }, { property: "og:title", content: "Your account — CorrectBuy" }, { property: "og:description", content: "Orders, addresses and profile." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: AccountLayout,
});

const nav = [
  { to: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/account/orders", label: "Orders", icon: Package, exact: false },
  { to: "/account/addresses", label: "Addresses", icon: MapPin, exact: false },
  { to: "/account/profile", label: "Profile", icon: User, exact: false },
] as const;

function AccountLayout() {
  const navigate = useNavigate();
  const claim = useServerFn(claimGuestOrders);
  const qc = useQueryClient();
  useEffect(() => {
    claim().then((r) => { if (r.claimed > 0) void qc.invalidateQueries({ queryKey: ["my-orders"] }); }).catch(() => {});
  }, [claim, qc]);

  return (
    <div className="min-h-screen">
      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-6 md:grid-cols-[200px_1fr]">
        <nav aria-label="Account" className="flex gap-1 overflow-x-auto md:flex-col">
          {nav.map(({ to, label, icon: I, exact }) => (
            <Link key={to} to={to} activeOptions={{ exact }} className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted" activeProps={{ className: "!bg-accent !text-accent-foreground" }}>
              <I className="h-4 w-4" /> {label}
            </Link>
          ))}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
            className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </nav>
        <div className="min-w-0"><Outlet /></div>
      </main>
      <SiteFooter />
    </div>
  );
}
