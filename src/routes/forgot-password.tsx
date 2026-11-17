import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, authField } from "@/components/AuthCard";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — CorrectBuy" }, { name: "description", content: "Get a link to reset your CorrectBuy password." }, { property: "og:title", content: "Reset password — CorrectBuy" }, { property: "og:description", content: "Reset your password." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    setSent(true); // same message whether or not the email exists
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="We'll email you a link to choose a new one.">
      {sent ? (
        <p className="text-sm">If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way. The link expires in one hour.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div><label htmlFor="f-email" className="text-sm font-semibold">Email</label><input id="f-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={authField} /></div>
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Send reset link</button>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-primary">Back to sign in</Link>
    </AuthCard>
  );
}
