import { afterEach, describe, expect, it, vi } from "vitest";

// Order emails go straight to Resend with the store's own key, from the configured sender.
describe("order email sender", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("skips sending when no Resend key is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { dispatchQueuedEmails } = await import("@/lib/email.server");
    expect(await dispatchQueuedEmails("https://shop.test")).toEqual({ sent: 0, skipped: "email not configured" });
  });

  it("sends from info@correctbuy.ng through the Resend API", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "info@correctbuy.ng");
    const calls: { url: string; body: { from: string; to: string[] }; auth: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get("Authorization") ?? "" });
      return new Response("{}", { status: 200 });
    });
    const rows = [{ id: "l1", order_id: null, event: "order_paid", recipient: "shopper@example.com" }];
    const chain: { eq?: () => unknown; order?: () => unknown; limit?: () => Promise<{ data: typeof rows }> } = {};
    chain.eq = () => chain;
    chain.order = () => chain;
    chain.limit = async () => ({ data: rows });
    const update = { eq: async () => ({}) };
    const db = { from: () => ({ select: () => chain, update: () => update }) };
    vi.doMock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));
    vi.doMock("@/lib/order-email-templates", () => ({ composeOrderEmail: async () => ({ subject: "Paid", html: "<p>hi</p>", text: "hi" }) }));
    const { dispatchQueuedEmails } = await import("@/lib/email.server");
    expect(await dispatchQueuedEmails("https://shop.test")).toEqual({ sent: 1 });
    expect(calls[0]!.url).toBe("https://api.resend.com/emails");
    expect(calls[0]!.body.from).toBe("CorrectBuy <info@correctbuy.ng>");
    expect(calls[0]!.body.to).toEqual(["shopper@example.com"]);
    expect(calls[0]!.auth).toBe("Bearer re_test");
  });
});
