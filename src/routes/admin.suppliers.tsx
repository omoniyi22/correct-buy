import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, btn, btnGhost, Card, Field, input, States } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/suppliers")({
  head: () => ({"meta": [{"title": "Suppliers \u2014 CorrectBuy"}, {"name": "description", "content": "Manage CorrectBuy supplier details."}, {"property": "og:title", "content": "Suppliers \u2014 CorrectBuy"}, {"property": "og:description", "content": "Manage CorrectBuy supplier details."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: Suppliers,
});

type S = { id?: string; name: string; contact_name: string; email: string; phone: string; integration_type: string; api_endpoint: string; lead_time_days: string; notes: string };
const blank: S = { name: "", contact_name: "", email: "", phone: "", integration_type: "manual", api_endpoint: "", lead_time_days: "3", notes: "" };

function Suppliers() {
  const qc = useQueryClient();
  const [form, setForm] = useState<S | null>(null);
  const list = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*, product_variants(id, sku, products(name))").order("name");
      if (error) throw error;
      return data;
    },
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const row = { name: form.name, contact_name: form.contact_name || null, email: form.email || null, phone: form.phone || null, integration_type: form.integration_type, api_config: form.api_endpoint ? { endpoint: form.api_endpoint } : {}, lead_time_days: Number(form.lead_time_days || 3), notes: form.notes || null };
    const r = form.id ? await supabase.from("suppliers").update(row).eq("id", form.id) : await supabase.from("suppliers").insert(row);
    if (r.error) return void toast.error(r.error.message);
    toast.success("Supplier saved");
    setForm(null);
    qc.invalidateQueries({ queryKey: ["admin-suppliers"] });
    qc.invalidateQueries({ queryKey: ["admin-suppliers-min"] });
  };

  return (
    <div>
      <AdminHeader title="Suppliers" sub="Orders are split by the supplier set on each variant" actions={!form && <button className={btn} onClick={() => setForm(blank)}><Plus className="h-4 w-4" /> Add supplier</button>} />
      {form && (
        <Card className="mb-6">
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
            <Field label="Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} /></Field>
            <Field label="Contact person"><input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className={input} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} /></Field>
            <Field label="How we send orders">
              <select value={form.integration_type} onChange={(e) => setForm({ ...form, integration_type: e.target.value })} className={input}>
                <option value="manual">Manual (dashboard)</option><option value="email">Email purchase order</option><option value="csv">CSV batch</option><option value="api">API</option>
              </select>
            </Field>
            <Field label="Lead time (days)"><input inputMode="numeric" value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} className={input} /></Field>
            {form.integration_type === "api" && <Field label="API endpoint" className="sm:col-span-3"><input type="url" value={form.api_endpoint} onChange={(e) => setForm({ ...form, api_endpoint: e.target.value })} className={input} placeholder="https://supplier.example/api/orders" /></Field>}
            <Field label="Notes" className="sm:col-span-3"><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={input} /></Field>
            <div className="flex gap-2 sm:col-span-3"><button className={btn}>Save</button><button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancel</button></div>
          </form>
        </Card>
      )}
      <States q={list} empty="No suppliers yet.">
        <div className="grid gap-4 md:grid-cols-2">
          {list.data?.map((s) => (
            <Card key={s.id}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div>
                  <p className="font-bold">{s.name}</p>
                  <p className="break-words text-sm text-muted-foreground">{[s.contact_name, s.email, s.phone].filter(Boolean).join(" · ")}</p>
                </div>
                <button className="text-sm font-semibold text-primary" onClick={() => setForm({ id: s.id, name: s.name, contact_name: s.contact_name ?? "", email: s.email ?? "", phone: s.phone ?? "", integration_type: s.integration_type, api_endpoint: (s.api_config as { endpoint?: string })?.endpoint ?? "", lead_time_days: String(s.lead_time_days), notes: s.notes ?? "" })}>Edit</button>
              </div>
              <p className="mt-3 text-sm"><span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">{s.integration_type}</span> · {s.lead_time_days} day lead time</p>
              {s.notes && <p className="mt-2 text-sm text-muted-foreground">{s.notes}</p>}
              <p className="mt-3 text-xs text-muted-foreground">{s.product_variants.length} linked SKU(s): {s.product_variants.slice(0, 4).map((v) => v.sku).join(", ")}{s.product_variants.length > 4 ? "…" : ""}</p>
            </Card>
          ))}
        </div>
      </States>
    </div>
  );
}
