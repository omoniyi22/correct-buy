import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/account/profile")({
  head: () => ({"meta": [{"title": "Your profile \u2014 CorrectBuy"}, {"name": "description", "content": "Manage your CorrectBuy profile and sign-in details."}, {"property": "og:title", "content": "Your profile \u2014 CorrectBuy"}, {"property": "og:description", "content": "Manage your CorrectBuy profile and sign-in details."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: ProfilePage,
});

const field = "mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm";

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const p = useQuery({ queryKey: ["profile"], queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data });
  const [f, setF] = useState({ full_name: "", phone: "", marketing_opt_in: false, notify_sms: true });
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState({ current: "", next: "" });

  useEffect(() => {
    if (p.data) setF({ full_name: p.data.full_name ?? "", phone: p.data.phone ?? "", marketing_opt_in: p.data.marketing_opt_in, notify_sms: p.data.notify_sms });
  }, [p.data]);
  useEffect(() => setEmail(user?.email ?? ""), [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, email: user.email ?? null, ...f });
    if (error) return void toast.error("Couldn't save");
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    if (error) return void toast.error(error.message);
    toast.success("Check your new inbox to confirm the change.");
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 8) return void toast.error("Use at least 8 characters");
    const { error } = await supabase.auth.updateUser({ password: pw.next, current_password: pw.current } as { password: string });
    if (error) return void toast.error(error.message);
    setPw({ current: "", next: "" });
    toast.success("Password updated");
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Profile</h1>
      <form onSubmit={saveProfile} className="grid gap-4 rounded-3xl border border-border p-6 sm:grid-cols-2">
        <div><label htmlFor="p-name" className="text-sm font-semibold">Full name</label><input id="p-name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} className={field} /></div>
        <div><label htmlFor="p-phone" className="text-sm font-semibold">Phone</label><input id="p-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={field} /></div>
        <fieldset className="space-y-2 text-sm sm:col-span-2">
          <legend className="font-semibold">Notifications</legend>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-primary" checked={f.notify_sms} onChange={(e) => setF({ ...f, notify_sms: e.target.checked })} /> SMS / WhatsApp order updates</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-primary" checked={f.marketing_opt_in} onChange={(e) => setF({ ...f, marketing_opt_in: e.target.checked })} /> Emails about new drops and offers</label>
        </fieldset>
        <button className="w-fit rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">Save profile</button>
      </form>
      <form onSubmit={saveEmail} className="flex flex-wrap items-end gap-3 rounded-3xl border border-border p-6">
        <div className="min-w-0 basis-full sm:basis-auto flex-1"><label htmlFor="p-email" className="text-sm font-semibold">Email</label><input id="p-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></div>
        <button className="rounded-full border border-secondary px-6 py-2.5 text-sm font-semibold">Change email</button>
      </form>
      <form onSubmit={savePassword} className="grid gap-4 rounded-3xl border border-border p-6 sm:grid-cols-2">
        <div><label htmlFor="p-cur" className="text-sm font-semibold">Current password</label><input id="p-cur" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className={field} /></div>
        <div><label htmlFor="p-new" className="text-sm font-semibold">New password</label><input id="p-new" type="password" autoComplete="new-password" required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={field} /></div>
        <button className="w-fit rounded-full border border-secondary px-6 py-2.5 text-sm font-semibold">Change password</button>
      </form>
    </div>
  );
}
