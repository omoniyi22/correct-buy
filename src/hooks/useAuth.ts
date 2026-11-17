import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { user: User | null; isStaff: boolean; isAdmin: boolean; loading: boolean };

let state: AuthState = { user: null, isStaff: false, isAdmin: false, loading: true };
const subs = new Set<(s: AuthState) => void>();
let started = false;

async function refresh(user: User | null) {
  let isStaff = false;
  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    isAdmin = !!data?.some((r) => r.role === "admin");
    isStaff = isAdmin || !!data?.some((r) => r.role === "staff");
  }
  state = { user, isStaff, isAdmin, loading: false };
  subs.forEach((f) => f(state));
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  supabase.auth.getUser().then(({ data }) => refresh(data.user ?? null));
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void refresh(session?.user ?? null);
  });
}

/** Shared signed-in state (user + staff role from the protected roles table). */
export function useAuth() {
  const [s, setS] = useState<AuthState>(state);
  useEffect(() => {
    start();
    setS(state);
    subs.add(setS);
    return () => {
      subs.delete(setS);
    };
  }, []);
  return s;
}

/** Only allow same-site relative paths as post-login destinations. */
export function safeRedirect(path: unknown, fallback = "/account") {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}
