import { useState } from "react";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, Field, input } from "@/components/admin/ui";
import { formatMoney, toMinor } from "@/lib/money";
import type { Database } from "@/integrations/supabase/types";

type State = Database["public"]["Tables"]["shipping_zones"]["Row"];
type City = Database["public"]["Tables"]["shipping_cities"]["Row"];
const validAmount = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 21474836.47;

export function DeliveryLocations() {
  const qc = useQueryClient();
  const states = useQuery({ queryKey: ["admin-zones"], queryFn: async () => { const r = await supabase.from("shipping_zones").select("*").order("sort"); if (r.error) throw r.error; return r.data; } });
  const cities = useQuery({ queryKey: ["admin-cities"], queryFn: async () => { const r = await supabase.from("shipping_cities").select("*").order("name"); if (r.error) throw r.error; return r.data; } });
  const [newState, setNewState] = useState({ name: "", fee: "", eta_days: "2-4" });
  const [busy, setBusy] = useState(false);
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["admin-zones"] }), qc.invalidateQueries({ queryKey: ["admin-cities"] }), qc.invalidateQueries({ queryKey: ["store-config"] }), qc.invalidateQueries({ queryKey: ["quote"] })]); };
  const change = async (work: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true);
    try { const r = await work(); if (r.error) throw new Error(r.error.message); await refresh(); toast.success("Delivery location saved"); return true; }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save location"); return false; }
    finally { setBusy(false); }
  };
  return <Card>
    <h2 className="font-bold">Delivery states & cities</h2>
    {(states.isPending || cities.isPending) && <ListSkeleton rows={4} className="mt-3" />}
    {(states.isError || cities.isError) && <p role="alert" className="mt-3 text-sm text-destructive">Could not load delivery locations.</p>}
    <div className="mt-3 divide-y divide-border">
      {states.data?.map((s) => <StateEditor key={`${s.id}:${s.name}:${s.fee}:${s.active}:${s.eta_days}`} state={s} cities={cities.data?.filter((c) => c.state_id === s.id) ?? []} busy={busy} change={change} />)}
    </div>
    <form className="mt-5 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_130px_100px_auto]" onSubmit={async (e) => { e.preventDefault(); if (!validAmount(newState.fee)) return void toast.error("Enter a valid non-negative state amount"); if (await change(() => supabase.from("shipping_zones").insert({ name: newState.name.trim(), fee: toMinor(newState.fee), eta_days: newState.eta_days, sort: (states.data?.length ?? 0) + 1 }))) setNewState({ name: "", fee: "", eta_days: "2-4" }); }}>
      <Field label="New state"><input aria-label="New state" required minLength={2} maxLength={80} className={input} value={newState.name} onChange={(e) => setNewState({ ...newState, name: e.target.value })} /></Field>
      <Field label="State amount (₦)"><input aria-label="New state amount" type="number" min="0" step="0.01" required className={input} value={newState.fee} onChange={(e) => setNewState({ ...newState, fee: e.target.value })} /></Field>
      <Field label="Delivery days"><input aria-label="New state delivery days" required className={input} value={newState.eta_days} onChange={(e) => setNewState({ ...newState, eta_days: e.target.value })} /></Field>
      <Button disabled={busy}><Plus className="h-4 w-4" /> Add state</Button>
    </form>
  </Card>;
}

type Change = (work: () => PromiseLike<{ error: { message: string } | null }>) => Promise<boolean>;
function StateEditor({ state: s, cities, busy, change }: { state: State; cities: City[]; busy: boolean; change: Change }) {
  const [name, setName] = useState(s.name);
  const [fee, setFee] = useState(String(s.fee / 100));
  const [days, setDays] = useState(s.eta_days);
  const [active, setActive] = useState(s.active);
  const [cityName, setCityName] = useState("");
  const [cityFee, setCityFee] = useState("");
  return <section className="py-5" aria-label={`${s.name} delivery settings`}>
    <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_130px_100px_auto_auto]" onSubmit={(e) => { e.preventDefault(); if (!validAmount(fee)) return void toast.error("Enter a valid non-negative state amount"); void change(() => supabase.from("shipping_zones").update({ name: name.trim(), fee: toMinor(fee), eta_days: days }).eq("id", s.id)); }}>
      <Field label="State"><input aria-label={`${s.name} state name`} required minLength={2} maxLength={80} className={input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Amount (₦)"><input aria-label={`${s.name} state amount`} type="number" min="0" step="0.01" required className={input} value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
      <Field label="Delivery days"><input aria-label={`${s.name} delivery days`} required className={input} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
      <label className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" aria-label={`${s.name} active`} checked={active} disabled={busy} onChange={async (e) => { const next = e.target.checked; setActive(next); if (!await change(() => supabase.from("shipping_zones").update({ active: next }).eq("id", s.id))) setActive(s.active); }} />Active</label>
      <Button variant="outline" disabled={busy}><Save className="h-4 w-4" /> Save state</Button>
    </form>
    <div className="mt-4 space-y-3 border-l-2 border-border pl-3 sm:pl-5">
      {cities.map((c) => <CityEditor key={`${c.id}:${c.name}:${c.fee}:${c.active}`} city={c} state={s} busy={busy} change={change} />)}
      <form className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={async (e) => { e.preventDefault(); if (cityFee.trim() && !validAmount(cityFee)) return void toast.error("Enter a valid non-negative city amount"); if (await change(() => supabase.from("shipping_cities").insert({ state_id: s.id, name: cityName.trim(), fee: cityFee.trim() ? toMinor(cityFee) : null }))) { setCityName(""); setCityFee(""); } }}>
        <Field label={`New city in ${s.name}`}><input aria-label={`New city in ${s.name}`} required minLength={2} maxLength={80} className={input} value={cityName} onChange={(e) => setCityName(e.target.value)} /></Field>
        <Field label="City amount (₦, optional)"><input aria-label={`New city amount in ${s.name}`} type="number" min="0" step="0.01" placeholder={`State: ${s.fee / 100}`} className={input} value={cityFee} onChange={(e) => setCityFee(e.target.value)} /></Field>
        <Button variant="outline" disabled={busy}><Plus className="h-4 w-4" /> Add city</Button>
      </form>
    </div>
  </section>;
}

function CityEditor({ city: c, state, busy, change }: { city: City; state: State; busy: boolean; change: Change }) {
  const [name, setName] = useState(c.name);
  const [fee, setFee] = useState(c.fee === null ? "" : String(c.fee / 100));
  const [active, setActive] = useState(c.active);
  return <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]" onSubmit={(e) => { e.preventDefault(); if (fee.trim() && !validAmount(fee)) return void toast.error("Enter a valid non-negative city amount"); void change(() => supabase.from("shipping_cities").update({ name: name.trim(), fee: fee.trim() ? toMinor(fee) : null }).eq("id", c.id)); }}>
    <Field label="City"><input aria-label={`${c.name} city name`} required minLength={2} maxLength={80} className={input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
    <Field label={`Amount (₦) · ${c.fee === null ? "State amount" : "Custom amount"}`}><input aria-label={`${c.name} city amount`} type="number" min="0" step="0.01" placeholder={`State: ${state.fee / 100}`} value={fee} onChange={(e) => setFee(e.target.value)} className={input} /></Field>
    <label className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" aria-label={`${c.name} active`} checked={active} disabled={busy} onChange={async (e) => { const next = e.target.checked; setActive(next); if (!await change(() => supabase.from("shipping_cities").update({ active: next }).eq("id", c.id))) setActive(c.active); }} />Active<span className="text-xs text-muted-foreground">{!state.active ? "Hidden by state" : formatMoney(c.fee ?? state.fee)}</span></label>
    <Button variant="outline" size="icon" aria-label={`Save ${c.name}`} title={`Save ${c.name}`} disabled={busy}><Save className="h-4 w-4" /></Button>
    <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${c.name}`} title={`Remove ${c.name}`} disabled={busy} onClick={() => { if (confirm(`Remove ${c.name}?`)) void change(() => supabase.from("shipping_cities").delete().eq("id", c.id)); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
  </form>;
}