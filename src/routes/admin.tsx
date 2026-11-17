import media from "@/lib/media";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BadgePercent, Boxes, GalleryHorizontal, ClipboardList, Factory, LayoutDashboard, LayoutList, Loader2, LogOut, Menu, Package, RotateCcw, Settings, ShieldAlert, Tag, Truck, Users, X, BookOpen, Database,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { cn } from "@/lib/utils";

const logo = media["correctbuy-logo-full.png"];

// Back office. Client-only; every table is also protected by staff-only database policies.
export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — CorrectBuy" }, { name: "description", content: "CorrectBuy back office." }, { property: "og:title", content: "Admin — CorrectBuy" }, { property: "og:description", content: "Back office." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/supplier-orders", label: "Supplier orders", icon: Factory },
  { to: "/admin/shipments", label: "Shipments", icon: Truck },
  { to: "/admin/returns", label: "Returns", icon: RotateCcw },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/collections", label: "Custom collections", icon: Boxes },
  { to: "/admin/hero", label: "Homepage hero", icon: GalleryHorizontal },
  { to: "/admin/layout", label: "Appearance & layouts", icon: LayoutList, adminOnly: true },
  { to: "/admin/blog", label: "Blog", icon: BookOpen, adminOnly: true },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/suppliers", label: "Suppliers", icon: Tag },
  { to: "/admin/coupons", label: "Coupons", icon: BadgePercent },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/database", label: "Database", icon: Database, adminOnly: true },
  { to: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
] as const;

function AdminLayout() {
  const { user, isStaff, isAdmin, loading } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (path === "/admin/login") return <Outlet />;
  if (loading) return <PageSkeleton />;
  if (!user) return <AdminLoginForm />;
  if (!isStaff)
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 font-display text-2xl font-bold">Staff only</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user.email} doesn't have back-office access. Ask an admin to add you in Settings.</p>
          <Link to="/" className="mt-6 inline-block font-semibold text-primary">Back to the store</Link>
        </div>
      </div>
    );

  const links = nav.filter((n) => !("adminOnly" in n) || isAdmin);

  return (
    <div className="min-h-screen bg-muted/40 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-border bg-sidebar p-4 transition-transform lg:static lg:w-auto lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="mb-6 flex items-center justify-between">
          <Link to="/admin" className="inline-flex items-center gap-2 font-display text-xl font-extrabold"><img src={logo} alt="CorrectBuy" width={1298} height={299} className="h-7 w-auto" /> <span className="text-xs font-semibold text-muted-foreground">admin</span></Link>
          <button className="lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-0.5">
          {links.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} activeOptions={{ exact: "exact" in n && n.exact }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent"
              activeProps={{ className: "!bg-sidebar-accent !text-sidebar-foreground font-semibold" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-sidebar-border pt-4 text-xs text-muted-foreground">
          <p className="truncate">{user.email}</p>
          <p className="mt-0.5 font-semibold">{isAdmin ? "Admin" : "Staff"}</p>
          <div className="mt-3 flex gap-3">
            <Link to="/" className="font-semibold text-primary">View store</Link>
            <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/admin" }); }} className="flex items-center gap-1 font-semibold"><LogOut className="h-3 w-3" /> Sign out</button>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0">
        <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 lg:hidden">
          <button aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <span className="font-display font-bold">Admin</span>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
