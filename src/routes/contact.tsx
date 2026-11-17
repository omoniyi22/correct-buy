import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { StaticPage, staticHead } from "@/components/StaticPage";
import { supabase } from "@/integrations/supabase/client";
import { storeConfigQuery } from "@/lib/settings";

export const Route = createFileRoute("/contact")({
  head: () => staticHead("Contact us", "Questions about an order or a product? Message the CorrectBuy team."),
  component: ContactPage,
});

const field = "mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function ContactPage() {
  const { data } = useSuspenseQuery(storeConfigQuery);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    const { error } = await supabase.from("contact_messages").insert({ name: form.name.trim(), email: form.email.trim(), message: form.message.trim() });
    if (error) {
      setState("idle");
      toast.error("We couldn't send that — please check the fields and try again.");
      return;
    }
    setState("sent");
  };

  return (
    <StaticPage title="Contact us" intro="We reply within one working day.">
      <div className="grid gap-10 md:grid-cols-[1fr_240px]">
        {state === "sent" ? (
          <div className="rounded-3xl bg-accent p-8">
            <p className="font-display text-2xl font-bold">Thanks — message received.</p>
            <p className="mt-2 text-muted-foreground">We'll get back to you at {form.email}.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div><label htmlFor="c-name" className="text-sm font-semibold">Name</label><input id="c-name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} /></div>
            <div><label htmlFor="c-email" className="text-sm font-semibold">Email</label><input id="c-email" type="email" required maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} /></div>
            <div><label htmlFor="c-msg" className="text-sm font-semibold">Message</label><textarea id="c-msg" required minLength={3} maxLength={3000} rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={field} /></div>
            <button disabled={state === "busy"} className="rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground disabled:opacity-60">{state === "busy" ? "Sending…" : "Send message"}</button>
          </form>
        )}
        <div className="space-y-4 text-sm">
          <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {data.settings.support_email}</p>
          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {data.settings.support_phone}</p>
          <p className="text-muted-foreground">Mon–Sat, 9am–6pm WAT</p>
        </div>
      </div>
    </StaticPage>
  );
}
