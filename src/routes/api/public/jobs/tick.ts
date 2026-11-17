import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Runs every few minutes: releases stock held by unpaid orders and sends any queued emails
// (shipping updates, retries, staff "resend update").
export const Route = createFileRoute("/api/public/jobs/tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("expire_stale_orders");
        const { dispatchQueuedEmails } = await import("@/lib/email.server");
        const emails = await dispatchQueuedEmails(new URL(request.url).origin);
        return Response.json({ expired: !error, error: error?.message ?? null, emails });
      },
    },
  },
});
