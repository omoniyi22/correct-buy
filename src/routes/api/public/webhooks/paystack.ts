import { createFileRoute } from "@tanstack/react-router";

// Paystack calls this after a payment. The signature proves the call is from Paystack;
// we then re-verify server-to-server before anything is marked paid (idempotent in the DB).
async function hmacSha512Hex(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/webhooks/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"] || process.env["STRIPE_TEST_API_KEY"];
        if (!secret) return new Response("Payments not configured", { status: 503 });
        const raw = await request.text();
        const expected = await hmacSha512Hex(secret, raw);
        const given = request.headers.get("x-paystack-signature") ?? "";
        if (given.length !== expected.length || given !== expected) return new Response("Invalid signature", { status: 401 });

        const event = JSON.parse(raw) as { event: string; data?: { reference?: string } };
        const reference = event.data?.reference;
        if (reference && (event.event === "charge.success" || event.event === "charge.failed")) {
          const { verifyWithProvider } = await import("@/lib/orders.functions");
          await verifyWithProvider(reference);
        }
        return new Response("ok");
      },
    },
  },
});
