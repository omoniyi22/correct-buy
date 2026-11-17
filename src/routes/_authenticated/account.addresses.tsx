import { useState } from "react";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { storeConfigQuery } from "@/lib/settings";
import { useAuth } from "@/hooks/useAuth";
import { visibleCities } from "@/lib/delivery";

export const Route = createFileRoute("/_authenticated/account/addresses")({
  head: () => ({"meta": [{"title": "Saved addresses \u2014 CorrectBuy"}, {"name": "description", "content": "Manage your CorrectBuy delivery addresses."}, {"property": "og:title", "content": "Saved addresses \u2014 CorrectBuy"}, {"property": "og:description", "content": "Manage your CorrectBuy delivery addresses."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: AddressesPage,
});

type Form = { id?: string; full_name: string; phone: string; line1: string; city: string; state: string };
const blank: Form = { full_name: "", phone: "", line1: "", city: "", state: "" };
const field = "mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm";

function AddressesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: config } = useSuspenseQuery(storeConfigQuery);
  const list = useQuery({ queryKey: ["addresses-all"], queryFn: async () => (await supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at")).data ?? [] });
  const [form, setForm] = useState<Form | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["addresses-all"] });
    qc.invalidateQueries({ queryKey: ["addresses"] });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !user) return;
    if (!visibleCities(config.zones, config.cities, form.state).some((c) => c.name === form.city)) return void toast.error("Choose an active state and city");
    const { id, ...rest } = form;
    const res = id
      ? await supabase.from("addresses").update(rest).eq("id", id)
      : await supabase.from("addresses").insert({ ...rest, user_id: user.id, is_default: !list.data?.length });
    if (res.error) return void toast.error("Couldn't save address");
    setForm(null);
    refresh();
  };

  const makeDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    await supabase.from("addresses").delete().eq("id", id);
    refresh();
  };

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Addresses</h1>
        {!form && <button onClick={() => setForm(blank)} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Add address</button>}
      </div>
      {form && (
        <form onSubmit={save} className="mt-6 grid gap-4 rounded-3xl border border-border p-6 sm:grid-cols-2">
          <div><label htmlFor="a-name" className="text-sm font-semibold">Full name</label><input id="a-name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={field} /></div>
          <div><label htmlFor="a-phone" className="text-sm font-semibold">Phone</label><input id="a-phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={field} /></div>
          <div className="sm:col-span-2"><label htmlFor="a-line1" className="text-sm font-semibold">Street address</label><input id="a-line1" required value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className={field} /></div>
          <div><label htmlFor="a-city" className="text-sm font-semibold">City / area</label><select id="a-city" required disabled={!form.state} value={visibleCities(config.zones, config.cities, form.state).some((c) => c.name === form.city) ? form.city : ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className={field}><option value="">Choose city…</option>{visibleCities(config.zones, config.cities, form.state).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
          <div><label htmlFor="a-state" className="text-sm font-semibold">State</label>
            <select id="a-state" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value, city: "" })} className={field}>
              <option value="">Choose…</option>
              {config.zones.map((z) => <option key={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">Save</button>
            <button type="button" onClick={() => setForm(null)} className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}
      {list.isPending && <ListSkeleton rows={3} className="mt-6" />}
      {list.data?.length === 0 && !form && <p className="mt-6 rounded-2xl bg-muted p-6 text-muted-foreground">No saved addresses yet.</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {list.data?.map((a) => (
          <div key={a.id} className="rounded-3xl border border-border p-5 text-sm">
            {a.is_default && <span className="mb-2 inline-flex rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">Default</span>}
            <p>{a.full_name}<br />{a.line1}<br />{a.city}, {a.state}<br />{a.phone}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
              <button onClick={() => setForm({ id: a.id, full_name: a.full_name, phone: a.phone, line1: a.line1, city: a.city, state: a.state })} className="flex items-center gap-1 text-primary"><Pencil className="h-3.5 w-3.5" /> Edit</button>
              {!a.is_default && <button onClick={() => makeDefault(a.id)} className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Set default</button>}
              <button onClick={() => remove(a.id)} className="flex items-center gap-1 text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
