import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, authField, Divider, GoogleButton } from "@/components/AuthCard";
import { safeRedirect } from "@/hooks/useAuth";

export const Route = createFileRoute("/register")({
  validateSearch: zodValidator(z.object({ redirect: fallback(z.string(), "").default(""), email: fallback(z.string(), "").default("") })),
  head: () => ({ meta: [{ title: "Create account — CorrectBuy" }, { name: "description", content: "Create a CorrectBuy account to track orders and save addresses." }, { property: "og:title", content: "Create account — CorrectBuy" }, { property: "og:description", content: "Create a CorrectBuy account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const search = Route.useSearch();
  const [f, setF] = useState({ full_name: "", email: search.email, phone: "", password: "" });
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return setError("Please accept the terms to continue.");
    if (f.password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(safeRedirect(search.redirect))}`,
        data: { full_name: f.full_name.trim(), phone: f.phone.trim(), marketing_opt_in: marketing },
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    setSent(true);
  };

  if (sent)
    return (
      <AuthCard title="Check your email">
        <MailCheck className="h-10 w-10 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">We sent a confirmation link to <span className="font-semibold text-foreground">{f.email}</span>. Click it to activate your account, then sign in.</p>
        <Link to="/login" className="mt-6 inline-block font-semibold text-primary">Go to sign in</Link>
      </AuthCard>
    );

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <AuthCard title="Create your account" subtitle={<>Already have one? <Link to="/login" search={{ redirect: search.redirect }} className="font-semibold text-primary">Sign in</Link></>}>
      <GoogleButton after={safeRedirect(search.redirect)} />
      <Divider />
      <form onSubmit={submit} className="space-y-4">
        <div><label htmlFor="r-name" className="text-sm font-semibold">Full name</label><input id="r-name" required autoComplete="name" value={f.full_name} onChange={set("full_name")} className={authField} /></div>
        <div><label htmlFor="r-email" className="text-sm font-semibold">Email</label><input id="r-email" type="email" required autoComplete="email" value={f.email} onChange={set("email")} className={authField} /></div>
        <div><label htmlFor="r-phone" className="text-sm font-semibold">Phone</label><input id="r-phone" type="tel" required minLength={7} autoComplete="tel" value={f.phone} onChange={set("phone")} className={authField} /></div>
        <div><label htmlFor="r-pass" className="text-sm font-semibold">Password</label><input id="r-pass" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set("password")} className={authField} /><p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> <span>I agree to the <Link to="/terms" className="underline">terms</Link> and <Link to="/privacy" className="underline">privacy policy</Link>.</span></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /> Email me new drops and offers.</label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account
        </button>
      </form>
    </AuthCard>
  );
}
