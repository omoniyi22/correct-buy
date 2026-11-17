import { useEffect, useState } from "react";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toMinor } from "@/lib/money";
import { AdminHeader, btn, btnGhost, Card, Field, input } from "@/components/admin/ui";
import { listStaff, paymentConfigStatus, setStaffRole } from "@/lib/admin.functions";
import { useAuth } from "@/hooks/useAuth";
import { DeliveryLocations } from "@/components/admin/DeliveryLocations";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({"meta": [{"title": "Store settings \u2014 CorrectBuy"}, {"name": "description", "content": "Manage CorrectBuy store settings and staff access."}, {"property": "og:title", "content": "Store settings \u2014 CorrectBuy"}, {"property": "og:description", "content": "Manage CorrectBuy store settings and staff access."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: Settings,
});

function Settings() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const s = useQuery({ queryKey: ["admin-settings"], queryFn: async () => (await supabase.from("store_settings").select("*").eq("id", 1).single()).data });
  const getPay = useServerFn(paymentConfigStatus);
  const pay = useQuery({ queryKey: ["admin-pay-status"], queryFn: () => getPay() });
  const [f, setF] = useState<Record<string, string | boolean>>({});

  useEffect(() => {
    const d = s.data;
    if (d) setF({ store_name: d.store_name, support_email: d.support_email, support_phone: d.support_phone, free: String(d.free_shipping_threshold / 100), tax: String(d.tax_rate_bp / 100), return_window_days: String(d.return_window_days), maintenance_mode: d.maintenance_mode, maintenance_message: d.maintenance_message });
  }, [s.data]);

  if (!isAdmin) return <p>Only admins can change settings.</p>;
  if (s.isPending) return <FormSkeleton fields={6} />;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
    qc.invalidateQueries({ queryKey: ["admin-zones"] });
    qc.invalidateQueries({ queryKey: ["store-config"] });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("store_settings").update({
      store_name: String(f["store_name"]), support_email: String(f["support_email"]), support_phone: String(f["support_phone"]),
      free_shipping_threshold: toMinor(String(f["free"])), tax_rate_bp: Math.round(Number(f["tax"] || 0) * 100), return_window_days: Number(f["return_window_days"] || 14),
      maintenance_mode: !!f["maintenance_mode"], maintenance_message: String(f["maintenance_message"]), updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return void toast.error(error.message);
    toast.success("Settings saved");
    refresh();
  };

  const text = (k: string) => ({ value: String(f[k] ?? ""), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value }), className: input });

  return (
    <div className="space-y-6">
      <AdminHeader title="Settings" />
      <form onSubmit={save}>
        <Card className="grid gap-4 sm:grid-cols-3">
          <h2 className="font-bold sm:col-span-3">Store</h2>
          <Field label="Store name"><input required {...text("store_name")} /></Field>
          <Field label="Support email"><input type="email" required {...text("support_email")} /></Field>
          <Field label="Support phone"><input {...text("support_phone")} /></Field>
          <Field label="Free delivery from (₦)"><input inputMode="decimal" {...text("free")} /></Field>
          <Field label="Tax rate (%)"><input inputMode="decimal" {...text("tax")} /></Field>
          <Field label="Return window (days)"><input inputMode="numeric" {...text("return_window_days")} /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" className="h-4 w-4 accent-primary" checked={!!f["maintenance_mode"]} onChange={(e) => setF({ ...f, maintenance_mode: e.target.checked })} /> <span className="font-semibold">Maintenance mode</span> — shoppers see a "back soon" page; staff can still browse</label>
          <Field label="Maintenance message" className="sm:col-span-3"><textarea rows={2} {...text("maintenance_message")} /></Field>
          <div><button className={btn}>Save settings</button></div>
        </Card>
      </form>

      <DeliveryLocations />

      <Card>
        <h2 className="font-bold">Payments</h2>
        {pay.data && (
          <p className="mt-3 flex items-center gap-2 text-sm">
            {pay.data.paystack ? <><CheckCircle2 className="h-4 w-4 text-success" /> Paystack live key connected — real payments are on.</> : <><XCircle className="h-4 w-4 text-warning-foreground" /> No payment key connected — checkout uses the built-in test payment page.</>}
          </p>
        )}
        <p className="mt-2 break-words text-xs text-muted-foreground">Paystack webhook URL: <span className="break-all font-mono">{typeof window !== "undefined" ? `${window.location.origin}/api/public/webhooks/paystack` : ""}</span></p>
      </Card>

      <Card>
        <h2 className="font-bold">Notification templates</h2>
        <p className="mt-2 text-sm text-muted-foreground">Every order status change logs an email and SMS update on the order page (paid, processing, shipped, delivered, cancelled, refunds). Messages are queued until an email/SMS sender is connected.</p>
      </Card>

      <StaffCard />
    </div>
  );
}

function StaffCard() {
  const get = useServerFn(listStaff);
  const set = useServerFn(setStaffRole);
  const staff = useQuery({ queryKey: ["admin-staff"], queryFn: () => get() });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");

  const change = async (e: string, r: "admin" | "staff" | "none") => {
    try {
      await set({ data: { email: e, role: r } });
      toast.success("Access updated");
      setEmail("");
      void staff.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <Card>
      <h2 className="font-bold">Staff & roles</h2>
      <p className="mt-1 text-xs text-muted-foreground">Staff can run orders, products, stock and suppliers. Admins can also change settings and staff.</p>
      <ul className="mt-3 divide-y divide-border text-sm">
        {staff.data?.map((s) => (
          <li key={s.user_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2"><span className="min-w-0 break-all">{s.email}</span><span className="flex shrink-0 items-center gap-3"><span className="font-semibold">{s.role}</span><button className="text-xs font-semibold text-destructive" onClick={() => change(s.email, "none")}>Remove</button></span></li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); void change(email, role); }} className="mt-3 flex flex-wrap items-end gap-2">
        <Field label="Email of a registered account"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></Field>
        <Field label="Role"><select value={role} onChange={(e) => setRole(e.target.value as "staff" | "admin")} className={input}><option value="staff">Staff</option><option value="admin">Admin</option></select></Field>
        <button className={btnGhost}>Give access</button>
      </form>
    </Card>
  );
}
