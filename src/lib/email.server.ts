// Sends queued email notifications (notification_logs, channel=email, status=QUEUED) through Resend.
// The database queues them on every order change; this drains the queue.

const RESEND_URL = "https://api.resend.com/emails";
const fromAddress = () => `CorrectBuy <${process.env["RESEND_FROM_EMAIL"] || "info@correctbuy.ng"}>`;

import { composeOrderEmail, type EmailOrder } from "@/lib/order-email-templates";
import { composeGeneralEmail } from "@/lib/general-email-templates";
import { SITE_URL } from "@/lib/email-layout";

type Log = { id: string; order_id: string | null; event: string; recipient: string; payload?: Record<string, unknown> | null };
const SUPPORT = "info@correctbuy.ng";

export async function dispatchQueuedEmails(requestOrigin: string, orderId?: string) {
  // Links inside emails always point at the live store, whatever host triggered the send.
  const origin = process.env["PUBLIC_SITE_URL"]?.replace(/\/+$/, "") || (/localhost|127\.0\.0\.1/.test(requestOrigin) ? requestOrigin : SITE_URL);
  const resendKey = process.env["RESEND_API_KEY"];
  if (!resendKey) return { sent: 0, skipped: "email not configured" };
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  let q = db.from("notification_logs").select("id, order_id, event, recipient, payload").eq("channel", "email").eq("status", "QUEUED").order("created_at").limit(50);
  if (orderId) q = q.eq("order_id", orderId);
  const { data: logs } = await q;
  let sent = 0;
  for (const log of (logs ?? []) as Log[]) {
    let order: EmailOrder | null = null;
    if (log.order_id) {
      const { data } = await db.from("orders").select("order_number, access_token, email, phone, subtotal, shipping_fee, discount, tax, coupon_code, created_at, paid_at, total, currency, status, shipping_address, order_items(product_name, variant_name, qty, unit_price, sku, supplier_id, image_url), shipments(carrier, tracking_no, estimated_delivery)").eq("id", log.order_id).maybeSingle();
      order = data as unknown as EmailOrder | null;
    }
    const msg = (await composeOrderEmail(log.event, order, origin)) ?? (await composeGeneralEmail(log.event, log.payload, origin));
    if (!msg || !log.recipient?.includes("@")) {
      await db.from("notification_logs").update({ status: "FAILED", error: "No template for this event" }).eq("id", log.id);
      continue;
    }
    try {
      const res = await fetch(RESEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({ from: fromAddress(), to: [log.recipient], reply_to: log.event === "admin_contact_message" && typeof log.payload?.["email"] === "string" ? log.payload["email"] : SUPPORT, subject: msg.subject, html: msg.html, text: msg.text, ...(log.event === "newsletter_welcome" ? { headers: { "List-Unsubscribe": `<mailto:${SUPPORT}?subject=Unsubscribe>` } } : {}) }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Email send failed [${res.status}]: ${body}`);
        await db.from("notification_logs").update({ status: "FAILED", error: `${res.status}: ${body.slice(0, 300)}` }).eq("id", log.id);
      } else {
        await db.from("notification_logs").update({ status: "SENT" }).eq("id", log.id);
        sent++;
      }
    } catch (e) {
      await db.from("notification_logs").update({ status: "FAILED", error: String(e).slice(0, 300) }).eq("id", log.id);
    }
  }
  return { sent };
}
