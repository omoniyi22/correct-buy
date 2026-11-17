import { describe, expect, it } from "vitest";
import { composeOrderEmail, emailMoney, ORDER_EMAIL_EVENTS, type EmailOrder } from "@/lib/order-email-templates";
const order: EmailOrder = { order_number: "CB-TEST-1", total: 1234500, currency: "NGN", status: "PAID", shipping_address: { full_name: "Test buyer", city: "Lagos" }, order_items: [{ product_name: "Headphones", variant_name: "Black", qty: 2, unit_price: 617250, sku: "HP-1", supplier_id: null }], shipments: [{ carrier: "Test carrier", tracking_no: "TRACK-1" }] };
describe("order email templates", () => {
  it("covers all nine existing order event types with rendered email and text", async () => {
    expect(ORDER_EMAIL_EVENTS).toHaveLength(9);
    for (const event of ORDER_EMAIL_EVENTS) { const result = await composeOrderEmail(event, order, "https://example.test"); expect(result?.html.length).toBeGreaterThan(500); expect(result?.text.length).toBeGreaterThan(50); }
  });
  it("does not send an unrelated or missing order notification", async () => { expect(await composeOrderEmail("unknown", order, "https://example.test")).toBeNull(); expect(await composeOrderEmail("order_paid", null, "https://example.test")).toBeNull(); });
  it("converts kobo to naira without changing order amounts", () => { expect(emailMoney(1234500)).toBe("₦12,345.00"); });
  it("escapes customer-supplied executable content", async () => { const result = await composeOrderEmail("order_paid", { ...order, order_number: '<script>alert(1)</script>' }, "https://example.test"); expect(result?.html).not.toContain('<script>alert(1)</script>'); });
});
describe("abandoned checkout email", () => {
  it("turns a cancellation with no payment into a 'complete your purchase' email pointing back to the shop", async () => {
    const result = await composeOrderEmail("order_cancelled", { ...order, paid_at: null }, "https://example.test");
    expect(result?.subject).toContain("Complete your purchase");
    expect(result?.html).toContain("https://example.test/shop");
  });
  it("keeps a normal cancellation for an order that was paid", async () => {
    const result = await composeOrderEmail("order_cancelled", { ...order, paid_at: "2026-11-14T09:00:00Z" }, "https://example.test");
    expect(result?.subject).toContain("Your order was cancelled");
  });
});
