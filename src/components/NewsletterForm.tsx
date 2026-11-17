import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function NewsletterForm({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      toast.error("Enter a valid email address");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("newsletter_signups").insert({ email: value });
    setBusy(false);
    if (error && error.code !== "23505") {
      toast.error("Could not subscribe — please try again");
      return;
    }
    setDone(true);
  };

  if (done) return <p className="mt-3 text-sm font-semibold text-primary">You're on the list. Welcome!</p>;
  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
      <label htmlFor={`nl-${variant}`} className="sr-only">Email address</label>
      <input
        id={`nl-${variant}`}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className={cn(
          "flex-1 rounded-full border px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring",
          variant === "dark" ? "border-secondary-foreground/20 bg-secondary-foreground/10 placeholder:text-secondary-foreground/50" : "border-border bg-background text-foreground",
        )}
      />
      <button disabled={busy} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? "…" : "Subscribe"}
      </button>
    </form>
  );
}
