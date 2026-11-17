import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, authField } from "@/components/AuthCard";

/** Staff sign-in. Repeated failures are slowed down client-side; the auth service rate-limits too. */
export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fails, setFails] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < lockedUntil) return setError(`Too many attempts. Try again in ${Math.ceil((lockedUntil - Date.now()) / 1000)}s.`);
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      const n = fails + 1;
      setFails(n);
      if (n >= 5) setLockedUntil(Date.now() + 60_000 * Math.min(n - 4, 5));
      setError("Those details don't match a staff account.");
    }
  };

  return (
    <AuthCard title="Staff sign in" subtitle={<span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> CorrectBuy back office</span>}>
      <form onSubmit={submit} className="space-y-4">
        <div><label htmlFor="ad-email" className="text-sm font-semibold">Email</label><input id="ad-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={authField} /></div>
        <div><label htmlFor="ad-pass" className="text-sm font-semibold">Password</label><input id="ad-pass" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={authField} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in</button>
        <p className="text-xs text-muted-foreground">Administrator access is reserved for the verified store owner.</p>
      </form>
    </AuthCard>
  );
}
