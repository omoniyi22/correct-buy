import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, toMinor } from "@/lib/money";
import { AdminHeader, btn, btnGhost, Card, Field, input, States, TableWrap, td, th } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/coupons")({
  head: () => ({"meta": [{"title": "Coupons \u2014 CorrectBuy"}, {"name": "description", "content": "Manage CorrectBuy discount codes."}, {"property": "og:title", "content": "Coupons \u2014 CorrectBuy"}, {"property": "og:description", "content": "Manage CorrectBuy discount codes."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: Coupons,
});

const blank = { code: "", type: "percent", value: "", min_spend: "", expires_at: "", usage_limit: "" };

function Coupons() {
  const qc = useQueryClient();
  const [form, setForm] = useState<typeof blank | null>(null);
  const list = useQuery({ queryKey: ["admin-coupons"], queryFn: async () => { const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; } });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const value = form.type === "percent" ? Number(form.value) : form.type === "fixed" ? toMinor(form.value) : 0;
    if (form.type === "percent" && (value <= 0 || value > 100)) return void toast.error("Percent must be between 1 and 100");
    const { error } = await supabase.from("coupons").insert({
      code: form.code.trim().toUpperCase(), type: form.type, value, min_spend: form.min_spend ? toMinor(form.min_spend) : 0,
      expires_at: form.expires_at ? new Date(`${form.expires_at}T23:59:59`).toISOString() : null, usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
    });
    if (error) return void toast.error(error.code === "23505" ? "That code already exists" : error.message);
    setForm(null);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  const toggle = async (code: string, active: boolean) => {
    await supabase.from("coupons").update({ active }).eq("code", code);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  return (
    <div>
      <AdminHeader title="Coupons" actions={!form && <button className={btn} onClick={() => setForm(blank)}><Plus className="h-4 w-4" /> New coupon</button>} />
      {form && (
        <Card className="mb-6">
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
            <Field label="Code"><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })} className={input} /></Field>
            <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={input}><option value="percent">Percent off</option><option value="fixed">Fixed amount off</option><option value="free_shipping">Free delivery</option></select></Field>
            {form.type !== "free_shipping" && <Field label={form.type === "percent" ? "Percent" : "Amount (₦)"}><input required inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={input} /></Field>}
            <Field label="Minimum spend (₦)"><input inputMode="decimal" value={form.min_spend} onChange={(e) => setForm({ ...form, min_spend: e.target.value })} className={input} /></Field>
            <Field label="Expires on"><input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={input} /></Field>
            <Field label="Usage limit"><input inputMode="numeric" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className={input} placeholder="Unlimited" /></Field>
            <div className="flex gap-2 sm:col-span-3"><button className={btn}>Create</button><button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancel</button></div>
          </form>
        </Card>
      )}
      <States q={list} empty="No coupons yet.">
        <TableWrap>
          <thead className="bg-muted"><tr><th className={th}>Code</th><th className={th}>Discount</th><th className={th}>Min spend</th><th className={th}>Expires</th><th className={th}>Used</th><th className={th}>Active</th></tr></thead>
          <tbody className="divide-y divide-border">
            {list.data?.map((c) => (
              <tr key={c.code}>
                <td className={`${td} font-mono font-bold`}>{c.code}</td>
                <td className={td}>{c.type === "percent" ? `${c.value}%` : c.type === "fixed" ? formatMoney(c.value) : "Free delivery"}</td>
                <td className={td}>{c.min_spend ? formatMoney(c.min_spend) : "—"}</td>
                <td className={td}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-NG") : "Never"}</td>
                <td className={td}>{c.usage_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                <td className={td}><input type="checkbox" aria-label={`${c.code} active`} className="h-4 w-4 accent-primary" checked={c.active} onChange={(e) => toggle(c.code, e.target.checked)} /></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </States>
    </div>
  );
}
