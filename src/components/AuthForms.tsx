import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authField, Divider, GoogleButton } from "@/components/AuthCard";
import { safeRedirect } from "@/hooks/useAuth";

/** Shared sign-in / sign-up forms used by the /login and /register pages and the header modal. */
export function LoginForm({ redirect, onDone, switchLink }: { redirect: string; onDone: () => void; switchLink?: ReactNode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError(error.message.includes("confirm") ? "Please confirm your email first — check your inbox." : "That email and password don't match.");
    onDone();
  };
  return (
    <>
      {switchLink}
      <GoogleButton after={safeRedirect(redirect)} />
      <Divider />
      <form onSubmit={submit} className="space-y-4">
        <div><label htmlFor="l-email" className="text-sm font-semibold">Email</label><input id="l-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={authField} /></div>
        <div>
          <div className="flex items-center justify-between"><label htmlFor="l-pass" className="text-sm font-semibold">Password</label><Link to="/forgot-password" className="text-xs font-semibold text-primary">Forgot password?</Link></div>
          <input id="l-pass" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={authField} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
      </form>
    </>
  );
}

export function RegisterForm({ redirect, initialEmail = "", switchLink, onSent }: { redirect: string; initialEmail?: string; switchLink?: ReactNode; onSent?: () => void }) {
  const [f, setF] = useState({ full_name: "", email: initialEmail, phone: "", password: "" });
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
        emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(safeRedirect(redirect))}`,
        data: { full_name: f.full_name.trim(), phone: f.phone.trim(), marketing_opt_in: marketing },
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    setSent(true);
    onSent?.();
  };

  if (sent)
    return (
      <div>
        <MailCheck className="h-10 w-10 text-primary" />
        <h2 className="mt-3 font-display text-xl font-bold">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to <span className="font-semibold text-foreground">{f.email}</span>. Click it to activate your account, then sign in.</p>
      </div>
    );

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      {switchLink}
      <GoogleButton after={safeRedirect(redirect)} />
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
    </>
  );
}
