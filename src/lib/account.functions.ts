import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Link earlier guest orders to this account — only for a confirmed email that matches exactly. */
export const claimGuestOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.auth.getUser();
    const user = data.user;
    if (!user?.email || !user.email_confirmed_at) return { claimed: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("orders")
      .update({ user_id: user.id })
      .is("user_id", null)
      .eq("email", user.email.toLowerCase())
      .select("id");
    return { claimed: rows?.length ?? 0 };
  });
