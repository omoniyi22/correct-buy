import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const sourcingSchema = z.object({
  request: z
    .string()
    .trim()
    .min(3, "Say a little more about what you're after")
    .max(500, "Keep it under 500 characters"),
  email: z.string().trim().email("That email doesn't look right").max(255),
});

export type SourcingResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Partial<Record<"request" | "email", string>>; message?: string };

/** Hand a "can't find it" search to a person on the sourcing team. */
export async function requestSourcing(input: unknown): Promise<SourcingResult> {
  const parsed = sourcingSchema.safeParse(input);
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      fieldErrors: {
        ...(f.request?.[0] ? { request: f.request[0] } : {}),
        ...(f.email?.[0] ? { email: f.email[0] } : {}),
      },
    };
  }

  const { error } = await supabase
    .from("sourcing_requests")
    .insert({ request: parsed.data.request, email: parsed.data.email });

  if (error) {
    console.error("sourcing request failed", error.message);
    return { ok: false, message: "We couldn't send that just now — please try again." };
  }
  return { ok: true };
}
