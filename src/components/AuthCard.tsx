import media from "@/lib/media";
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const logo = media["correctbuy-logo-full.png"];

export const authField = "mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 block text-center font-display text-2xl font-extrabold"><img src={logo} alt="CorrectBuy" width={1298} height={299} className="mx-auto h-10 w-auto" /></Link>
        <div className="rounded-3xl bg-card p-8 shadow-xl ring-1 ring-border">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Google sign-in goes straight through this project's own Supabase Auth.
 * (The old Lovable broker issues sessions for Lovable Cloud, not for the owner's Supabase
 * project, so setSession() rejected them and sign-in silently failed.)
 * Setup is in the Supabase dashboard: Authentication > Providers > Google, plus the site URL
 * and redirect URLs under Authentication > URL Configuration.
 */
export function GoogleButton({ after }: { after?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if (after) sessionStorage.setItem("post-auth-redirect", after);
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/login`, queryParams: { prompt: "select_account" } },
          });
          // On success the browser is already navigating to Google, so leave the button disabled.
          if (error) throw error;
        } catch {
          setBusy(false);
          toast.error("Google sign-in didn't work. Please try again.");
        }
      }}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-semibold hover:bg-muted disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.43-1.66 4.2-5.35 4.2-3.22 0-5.85-2.67-5.85-5.96S8.78 6.36 12 6.36c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.69 3.83 14.56 2.9 12 2.9 6.98 2.9 2.9 6.98 2.9 12s4.08 9.1 9.1 9.1c5.25 0 8.73-3.69 8.73-8.89 0-.6-.07-1.05-.15-1.51z" /></svg>
      Continue with Google
    </button>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  );
}
