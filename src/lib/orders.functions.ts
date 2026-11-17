import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

const currentRequest = createServerOnlyFn(() => getRequest());
import { z } from "zod";

// Server functions for the checkout critical path. Totals, stock and payment
// status are decided here and in the database — never in the browser.

/** Fail with a clear message when the server key is not a service-role key (anon keys get "permission denied for function place_order"). */
function assertServiceRoleKey() {
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  if (key.startsWith("sb_publishable_")) throw new Error("SUPABASE_SERVICE_ROLE_KEY is set to a publishable/anon key. Use the service_role (secret) key.");
  const part = key.split(".")[1];
  if (!part) return;
  try {
    const role = (JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string }).role;
    if (role && role !== "service_role") throw new Error(`SUPABASE_SERVICE_ROLE_KEY has role "${role}". Use the service_role key, otherwise checkout fails with "permission denied for function place_order".`);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("SUPABASE_SERVICE_ROLE_KEY")) throw e;
  }
}

async function admin() {
  assertServiceRoleKey();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Signed-in shopper id if a valid bearer token came with the request; guests get null. */
async function optionalUserId(): Promise<string | null> {
  const auth = currentRequest()?.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  if (token.split(".").length !== 3) return null;
  const db = await admin();
  const { data } = await db.auth.getUser(token);
  return data.user?.id ?? null;
}

async function requestOrigin() {
  const req = currentRequest();
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

const paystackKey = () => process.env["PAYSTACK_SECRET_KEY"] || process.env["STRIPE_TEST_API_KEY"] || "";

/** Create a payment attempt for a pending order; returns where to send the shopper. */
async function startPayment(order: { id: string; total: number; currency: string; email: string }) {
  const db = await admin();
  const reference = `CB_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const provider = paystackKey() ? "paystack" : "test";
  const { error } = await db
    .from("payments")
    .insert({ order_id: order.id, reference, provider, amount: order.total, currency: order.currency });
  if (error) throw new Error("Could not start payment");
  const callback = `${await requestOrigin()}/checkout/callback?reference=${reference}`;

  if (provider === "paystack") {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${paystackKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: order.email, amount: order.total, currency: order.currency, reference, callback_url: callback }),
    });
    const body = (await res.json()) as { status: boolean; data?: { authorization_url: string } };
    if (!body.status || !body.data) throw new Error("The payment provider is unavailable. Please try again.");
    return { reference, redirectUrl: body.data.authorization_url };
  }
  return { reference, redirectUrl: `/checkout/pay?reference=${reference}` };
}

/** Ask the provider directly (server-to-server) and record the verified result. */
export async function verifyWithProvider(reference: string) {
  const db = await admin();
  const { data: p } = await db.from("payments").select("provider, status").eq("reference", reference).maybeSingle();
  if (!p || p.status !== "INITIATED" || p.provider !== "paystack" || !paystackKey()) return;
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${paystackKey()}` },
  });
  const body = (await res.json()) as { data?: { status: string; amount: number; currency: string } };
  if (!body.data || body.data.status === "abandoned" || body.data.status === "ongoing" || body.data.status === "pending") return;
  await db.rpc("confirm_payment", {
    _reference: reference,
    _success: body.data.status === "success",
    _amount: body.data.amount,
    _currency: body.data.currency,
    _payload: body as never,
  });
  await sendOrderEmails(reference);
}

/** Send the emails the database queued for this payment's order (confirmation, admin alert, supplier PO). */
async function sendOrderEmails(reference: string) {
  try {
    const db = await admin();
    const { data } = await db.from("payments").select("order_id").eq("reference", reference).maybeSingle();
    if (!data) return;
    let origin = "https://correctbuy.ng";
    try { origin = await requestOrigin(); } catch { /* webhook context */ }
    const { dispatchQueuedEmails } = await import("./email.server");
    await dispatchQueuedEmails(origin, data.order_id);
  } catch (e) {
    console.error("Order emails failed", e);
  }
}

const addressSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  line1: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().trim().email().max(255),
      phone: z.string().trim().min(7).max(30),
      items: z.array(z.object({ variant_id: z.string().uuid(), qty: z.number().int().min(1).max(99) })).min(1).max(50),
      zone: z.string().min(1).max(80),
      address: addressSchema,
      coupon: z.string().max(40).optional().default(""),
      notes: z.string().max(500).optional().default(""),
      saveAddress: z.boolean().optional().default(false),
    }).parse,
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const userId = await optionalUserId();
    const { data: placed, error } = await db.rpc("place_order", {
      _user: userId as string,
      _email: data.email,
      _phone: data.phone,
      _items: data.items,
      _zone: data.zone,
      _address: data.address,
      _coupon: data.coupon,
      _notes: data.notes,
    });
    if (error) throw new Error(error.message);
    const o = placed as { order_id: string; order_number: string; access_token: string; total: number; currency: string; email: string };

    if (userId && data.saveAddress) {
      const { count } = await db.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", userId);
      await db.from("addresses").insert({ user_id: userId, ...data.address, is_default: !count });
    }
    if (userId) await db.from("cart_items").delete().eq("user_id", userId);

    const pay = await startPayment({ id: o.order_id, total: o.total, currency: o.currency, email: o.email });
    return { orderNumber: o.order_number, token: o.access_token, ...pay };
  });

/** "Retry payment" — a fresh attempt against the same pending order. */
export const retryPayment = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderNumber: z.string().max(40), token: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    const db = await admin();
    await db.rpc("expire_stale_orders");
    const { data: o } = await db
      .from("orders")
      .select("id, total, currency, email, status")
      .eq("order_number", data.orderNumber)
      .eq("access_token", data.token)
      .maybeSingle();
    if (!o) throw new Error("Order not found");
    if (o.status !== "PENDING_PAYMENT") throw new Error("This order can no longer be paid — the payment window has closed.");
    return startPayment(o);
  });

/** Test-mode stand-in for the provider's hosted page + webhook. Disabled once a live key exists. */
export const completeTestPayment = createServerFn({ method: "POST" })
  .inputValidator(z.object({ reference: z.string().max(60), outcome: z.enum(["success", "failed"]) }).parse)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: p } = await db.from("payments").select("provider, amount, currency, status").eq("reference", data.reference).maybeSingle();
    if (!p || p.provider !== "test") throw new Error("Unknown test payment");
    const { data: result, error } = await db.rpc("confirm_payment", {
      _reference: data.reference,
      _success: data.outcome === "success",
      _amount: p.amount,
      _currency: p.currency,
      _payload: { provider: "test", outcome: data.outcome, at: new Date().toISOString() },
    });
    if (error) throw new Error(error.message);
    await sendOrderEmails(data.reference);
    return { result };
  });

export const getTestPayment = createServerFn({ method: "GET" })
  .inputValidator(z.object({ reference: z.string().max(60) }).parse)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: p } = await db
      .from("payments")
      .select("amount, currency, status, provider, orders(order_number, email)")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!p) return null;
    const o = p.orders as unknown as { order_number: string; email: string };
    return { amount: p.amount, currency: p.currency, status: p.status, provider: p.provider, orderNumber: o.order_number, email: o.email };
  });

/** Polled by the callback page. Reads what the webhook/verify step recorded — never sets it from the browser. */
export const getPaymentStatus = createServerFn({ method: "GET" })
  .inputValidator(z.object({ reference: z.string().max(60) }).parse)
  .handler(async ({ data }) => {
    await verifyWithProvider(data.reference);
    const db = await admin();
    const { data: p } = await db
      .from("payments")
      .select("status, orders(order_number, access_token, status)")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!p) return null;
    const o = p.orders as unknown as { order_number: string; access_token: string; status: string };
    return { paymentStatus: p.status, orderStatus: o.status, orderNumber: o.order_number, token: o.access_token };
  });

const orderSelect =
  "id, order_number, status, email, phone, subtotal, shipping_fee, discount, tax, total, currency, coupon_code, shipping_zone, shipping_address, created_at, paid_at, user_id, order_items(id, product_name, product_slug, variant_name, sku, image_url, unit_price, qty), shipments(carrier, tracking_no, status, estimated_delivery, created_at), order_status_history(to_status, created_at, note)";

/** Confirmation page for guests and members: the private link token unlocks the full order. */
export const getOrderByToken = createServerFn({ method: "GET" })
  .inputValidator(z.object({ orderNumber: z.string().max(40), token: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: o } = await db.from("orders").select(orderSelect).eq("order_number", data.orderNumber).eq("access_token", data.token).maybeSingle();
    if (!o) return null;
    const { user_id, ...rest } = o;
    return { ...rest, hasAccount: !!user_id };
  });

/** Public tracking: order number must match the email or phone; returns limited data only. */
export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderNumber: z.string().trim().min(3).max(40), contact: z.string().trim().min(3).max(255) }).parse)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: o } = await db
      .from("orders")
      .select("order_number, status, email, phone, created_at, paid_at, delivered_at, shipping_zone, shipments(carrier, tracking_no, status, estimated_delivery), order_status_history(to_status, created_at)")
      .eq("order_number", data.orderNumber.toUpperCase())
      .maybeSingle();
    const digits = (s: string) => s.replace(/\D/g, "").slice(-10);
    const c = data.contact.toLowerCase();
    const match = o && (o.email === c || (digits(c).length >= 7 && digits(o.phone) === digits(c)));
    if (!o || !match) return { found: false as const };
    return {
      found: true as const,
      orderNumber: o.order_number,
      status: o.status,
      createdAt: o.created_at,
      paidAt: o.paid_at,
      deliveredAt: o.delivered_at,
      zone: o.shipping_zone,
      shipments: o.shipments,
      history: o.order_status_history,
    };
  });
