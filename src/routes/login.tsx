import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, authField, Divider, GoogleButton } from "@/components/AuthCard";
import { safeRedirect } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  validateSearch: zodValidator(z.object({ redirect: fallback(z.string(), "").default("") })),
  head: () => ({ meta: [{ title: "Sign in — CorrectBuy" }, { name: "description", content: "Sign in to your CorrectBuy account." }, { property: "og:title", content: "Sign in — CorrectBuy" }, { property: "og:description", content: "Sign in to your CorrectBuy account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Returning from Google, or already signed in: go where the shopper was heading.
  useEffect(() => {
    // Google/Supabase report a failed or cancelled sign-in in the URL; surface it instead of failing silently.
    const params = new URLSearchParams(window.location.search + "&" + window.location.hash.replace(/^#/, ""));
    if (params.get("error") || params.get("error_description")) {
      toast.error("Google sign-in didn't work. Please try again.");
      window.history.replaceState(null, "", window.location.pathname);
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const stored = sessionStorage.getItem("post-auth-redirect");
      sessionStorage.removeItem("post-auth-redirect");
      window.location.replace(safeRedirect(redirect || stored));
    });
  }, [redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setError(error.message.includes("confirm") ? "Please confirm your email first — check your inbox." : "That email and password don't match.");
      return;
    }
    navigate({ href: safeRedirect(redirect) });
  };

  return (
    <AuthCard title="Welcome back" subtitle={<>New here? <Link to="/register" search={{ redirect }} className="font-semibold text-primary">Create an account</Link></>}>
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
    </AuthCard>
  );
}
