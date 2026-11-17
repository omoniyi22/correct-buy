import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAllowedAdminEmail } from "@/lib/admin-owner";

// Admin-only actions that need the auth user list. The caller's role is checked
// through their own session first; only then is the privileged client used.
async function assertAdmin(supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Only admins can do this");
}

export const paymentConfigStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!data) throw new Error("Not allowed");
    return { paystack: !!(process.env["PAYSTACK_SECRET_KEY"] || process.env["STRIPE_TEST_API_KEY"]) };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const out: { user_id: string; email: string; role: string }[] = [];
    for (const r of roles ?? []) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      out.push({ user_id: r.user_id, role: r.role, email: data.user?.email ?? "(unknown)" });
    }
    return out;
  });

export const setStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ email: z.string().trim().email(), role: z.enum(["admin", "staff", "none"]) }).parse)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.role === "admin" && !isAllowedAdminEmail(data.email)) throw new Error("Only the store owner can be an administrator");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("email", data.email.toLowerCase()).maybeSingle();
    if (!profile) throw new Error("No account with that email — ask them to register first.");
    if (profile.id === context.userId && data.role !== "admin") throw new Error("You can't remove your own admin access.");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", profile.id);
    if (data.role !== "none") await supabaseAdmin.from("user_roles").insert({ user_id: profile.id, role: data.role });
    return { ok: true };
  });
