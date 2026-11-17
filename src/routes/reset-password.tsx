import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, authField } from "@/components/AuthCard";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a new password — CorrectBuy" }, { name: "description", content: "Set a new password for your CorrectBuy account." }, { property: "og:title", content: "New password — CorrectBuy" }, { property: "og:description", content: "Set a new password." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"wait" | "ok" | "expired">("wait");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("error")) return setReady("expired");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady("ok");
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && hash.includes("type=recovery")) setReady("ok");
      else if (s.session) setReady("ok");
      else setTimeout(() => setReady((r) => (r === "wait" ? "expired" : r)), 2500);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    navigate({ to: "/account" });
  };

  return (
    <AuthCard title="Choose a new password">
      {ready === "wait" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking your link…</p>}
      {ready === "expired" && (
        <p className="text-sm">This reset link has expired or was already used. <Link to="/forgot-password" className="font-semibold text-primary">Request a new one</Link>.</p>
      )}
      {ready === "ok" && (
        <form onSubmit={submit} className="space-y-4">
          <div><label htmlFor="rp-pass" className="text-sm font-semibold">New password</label><input id="rp-pass" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={authField} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save password</button>
        </form>
      )}
    </AuthCard>
  );
}
