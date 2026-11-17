import { render } from "@react-email/render";
import { cdnImage } from "@/lib/storage";
import { brand, Column, CtaButton, EmailShell, Hr, Img, Pill, Row, s, Section, Text } from "@/lib/email-layout";

export type EmailOrder = {
  order_number: string; total: number; currency: string; status: string;
  email?: string | null; phone?: string | null;
  subtotal?: number | null; shipping_fee?: number | null; discount?: number | null; tax?: number | null;
  coupon_code?: string | null; created_at?: string | null; paid_at?: string | null;
  shipping_address: { full_name?: string; phone?: string; line1?: string; city?: string; state?: string } | null;
  order_items: { product_name: string; variant_name: string; qty: number; unit_price: number; sku: string; supplier_id: string | null; image_url?: string | null }[];
  shipments: { carrier: string; tracking_no: string; estimated_delivery?: string | null }[];
};
export const ORDER_EMAIL_EVENTS = ["order_paid", "order_processing", "order_shipped", "order_delivered", "order_cancelled", "order_refunded", "order_return_requested", "admin_new_order", "supplier_po"] as const;
type OrderEvent = (typeof ORDER_EMAIL_EVENTS)[number];
/** "checkout_abandoned" is the cancelled email for an order that was never paid (payment window expired). */
type Event = OrderEvent | "checkout_abandoned";

type Definition = {
  badge: string; color: string; title: string; subject: string; message: string;
  next?: string[]; cta?: string; stage?: number; // stage = how many tracker steps are complete
};
const definitions: Record<Event, Definition> = {
  order_paid: { badge: "Order confirmed", color: brand.green, title: "Thank you — your order is confirmed", subject: "Order confirmed", stage: 1, cta: "View your order",
    message: "We've received your payment and your order is now with our team. Here's a summary for your records.",
    next: ["We'll prepare and pack your items.", "You'll get another email with tracking details as soon as it ships.", "You can follow every step any time from the Track order page."] },
  order_processing: { badge: "In preparation", color: brand.blue, title: "We're preparing your order", subject: "We're preparing your order", stage: 2, cta: "Track your order",
    message: "Good news — your items are being checked and packed for dispatch." },
  order_shipped: { badge: "On its way", color: brand.blue, title: "Your order is on its way", subject: "Your order has shipped", stage: 3, cta: "Track your delivery",
    message: "Your order has left our hands and is heading to you. Use the tracking details below to follow its progress.",
    next: ["Keep your phone close — the courier may call to confirm delivery.", "Please check items on arrival and contact us right away if anything isn't right."] },
  order_delivered: { badge: "Delivered", color: brand.green, title: "Your order has been delivered", subject: "Your order was delivered", stage: 4, cta: "View your order",
    message: "Your delivery has been marked complete. We hope you love it! If something isn't right, tell us and we'll help.",
    next: ["Need to send something back? Request a return from your account or see our returns policy.", "Enjoying your purchase? Tell a friend — we'd love to serve them too."] },
  checkout_abandoned: { badge: "Payment not completed", color: brand.amber, title: "You left something behind", subject: "Complete your purchase", cta: "Shop again",
    message: "Your payment wasn't completed in time, so we've released the items we were holding and no money was taken. If you still want them, head back to the store and check out again — it only takes a minute.",
    next: ["Your items are listed above so you can find them again quickly.", "Had trouble paying? Reply to this email and we'll help."] },
  order_cancelled: { badge: "Cancelled", color: brand.amber, title: "Your order was cancelled", subject: "Your order was cancelled", cta: "View order details",
    message: "This order has been cancelled. If you were charged, the refund is handled by your payment provider — reply to this email and we'll help you follow it up." },
  order_refunded: { badge: "Refund issued", color: brand.green, title: "Your refund has been issued", subject: "Your refund has been issued", cta: "View order details",
    message: "We've refunded this order. The time it takes to show up on your statement depends on your bank or payment provider, and can take several business days." },
  order_return_requested: { badge: "Return requested", color: brand.amber, title: "We received your return request", subject: "Return request received", cta: "View order details",
    message: "Thanks for letting us know. Our team will review your request and contact you with the next steps.",
    next: ["Keep the item(s) and original packaging safe until you hear from us.", "We'll reply to this email once the request has been reviewed."] },
  admin_new_order: { badge: "New paid order", color: brand.red, title: "New paid order received", subject: "New paid order", cta: "Open order dashboard",
    message: "A customer payment has been confirmed. Review the order and arrange fulfilment." },
  supplier_po: { badge: "Purchase order", color: brand.navy, title: "New purchase order from CorrectBuy", subject: "Purchase order",
    message: "Please prepare the items below for CorrectBuy and reply to this email to confirm availability and dispatch timing." },
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const emailMoney = (kobo: number, currency = "NGN") => new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(kobo / 100);
const niceDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeZone: "Africa/Lagos" }).format(d);
};
const absolute = (rawUrl: string | null | undefined, origin: string) => { const url = cdnImage(rawUrl); return (!url ? null : url.startsWith("/") ? `${origin}${url}` : /^https?:\/\//.test(url) ? url : null); };
const firstName = (o: EmailOrder) => o.shipping_address?.full_name?.trim().split(/\s+/)[0] || "";

const STEPS = ["Confirmed", "Preparing", "Shipped", "Delivered"];
function Tracker({ stage }: { stage: number }) {
  return (
    <Section style={{ margin: "6px 0 22px" }}>
      <Row>{STEPS.map((_, i) => <Column key={i} style={{ width: "25%", paddingRight: i < 3 ? "4px" : 0 }}><div style={{ height: "6px", borderRadius: "3px", backgroundColor: i < stage ? brand.blue : brand.line, fontSize: 0, lineHeight: 0 }}>&nbsp;</div></Column>)}</Row>
      <Row>{STEPS.map((label, i) => <Column key={label} style={{ width: "25%", paddingTop: "8px" }}><Text style={{ margin: 0, fontSize: "12px", fontFamily: FONT, fontWeight: i === stage - 1 ? 700 : 500, color: i < stage ? brand.navy : "#9aa3b5" }}>{i < stage ? "✓ " : ""}{label}</Text></Column>)}</Row>
    </Section>
  );
}

function Items({ order, event, origin }: { order: EmailOrder; event: Event; origin: string }) {
  const supplier = event === "supplier_po";
  return (
    <Section style={{ margin: "4px 0 0" }}>
      <Text style={s.label}>{supplier ? "Items requested" : "Your items"}</Text>
      {order.order_items.map((item, i) => {
        const img = supplier ? null : absolute(item.image_url, origin);
        return (
          <Row key={i} style={{ borderBottom: `1px solid ${brand.line}` }}>
            {!supplier && <Column style={{ width: "64px", padding: "12px 0", verticalAlign: "top" }}>{img ? <Img src={img} alt={item.product_name} width={52} height={52} style={{ borderRadius: "8px", objectFit: "cover", border: `1px solid ${brand.line}` }} /> : <div style={{ width: "52px", height: "52px", borderRadius: "8px", backgroundColor: brand.soft, border: `1px solid ${brand.line}` }} />}</Column>}
            <Column style={{ padding: "12px 8px 12px 0", verticalAlign: "top" }}>
              <Text style={{ ...s.p, margin: 0, fontWeight: 600, fontSize: "14px", lineHeight: "20px" }}>{item.product_name}</Text>
              <Text style={{ ...s.muted, fontSize: "12px" }}>{[item.variant_name, `Qty ${item.qty}`, supplier ? `SKU ${item.sku}` : ""].filter(Boolean).join(" · ")}</Text>
            </Column>
            {!supplier && <Column style={{ padding: "12px 0", verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap" }}><Text style={{ ...s.p, margin: 0, fontWeight: 600, fontSize: "14px", lineHeight: "20px" }}>{emailMoney(item.unit_price * item.qty, order.currency)}</Text></Column>}
          </Row>
        );
      })}
    </Section>
  );
}

function Totals({ order }: { order: EmailOrder }) {
  const line = (label: string, value: string, strong = false, color: string = brand.text) => (
    <Row><Column><Text style={{ ...s.p, margin: "6px 0 0", fontSize: strong ? "16px" : "14px", fontWeight: strong ? 700 : 400, color: strong ? brand.navy : brand.muted }}>{label}</Text></Column>
      <Column style={{ textAlign: "right" }}><Text style={{ ...s.p, margin: "6px 0 0", fontSize: strong ? "18px" : "14px", fontWeight: strong ? 700 : 500, color }}>{value}</Text></Column></Row>
  );
  const c = order.currency;
  return (
    <Section style={{ margin: "8px 0 20px" }}>
      {order.subtotal != null && line("Subtotal", emailMoney(order.subtotal, c))}
      {order.shipping_fee != null && line("Delivery", order.shipping_fee === 0 ? "Free" : emailMoney(order.shipping_fee, c))}
      {!!order.discount && line(order.coupon_code ? `Discount (${order.coupon_code})` : "Discount", `−${emailMoney(order.discount, c)}`, false, brand.green)}
      {!!order.tax && line("Tax", emailMoney(order.tax, c))}
      <Hr style={{ borderColor: brand.line, margin: "10px 0 2px" }} />
      {line("Total", emailMoney(order.total, c), true)}
    </Section>
  );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return <Section style={s.box}><Text style={s.label}>{label}</Text>{children}</Section>;
}

export function OrderEmail({ event, order, origin }: { event: Event; order: EmailOrder; origin: string }) {
  const t = definitions[event];
  const supplier = event === "supplier_po";
  const internal = supplier || event === "admin_new_order";
  const customer = !internal;
  const url = event === "admin_new_order" ? `${origin}/admin/orders` : event === "checkout_abandoned" ? `${origin}/shop` : `${origin}/track?order=${encodeURIComponent(order.order_number)}`;
  const addr = order.shipping_address;
  const addressLines = [addr?.full_name, addr?.line1, [addr?.city, addr?.state].filter(Boolean).join(", "), addr?.phone].filter(Boolean) as string[];
  const placed = niceDate(order.paid_at ?? order.created_at);
  const name = firstName(order);
  const reason = customer ? `You're receiving this email because of your CorrectBuy order ${order.order_number}.` : supplier ? "You're receiving this because you're a registered CorrectBuy supplier." : "Internal notification for CorrectBuy staff.";
  return (
    <EmailShell preview={`${t.subject} · ${order.order_number}`} origin={origin} reason={reason} accent={t.color}>
      <Pill color={t.color}>{t.badge}</Pill>
      <Text style={s.h1}>{t.title}</Text>
      {customer && <Text style={s.p}>Hi {name || "there"},</Text>}
      <Text style={s.p}>{t.message}</Text>

      {t.stage != null && <Tracker stage={t.stage} />}

      <Box label="Order">
        <Text style={{ ...s.p, margin: 0, fontWeight: 700, fontSize: "16px", color: brand.navy }}>{order.order_number}</Text>
        {placed && <Text style={s.muted}>{order.paid_at ? "Paid" : "Placed"} on {placed}</Text>}
        {event === "admin_new_order" && (order.email || order.phone) && <Text style={{ ...s.muted, marginTop: "6px" }}>Customer: {[order.email, order.phone].filter(Boolean).join(" · ")}</Text>}
      </Box>

      {event === "order_shipped" && order.shipments.length > 0 && (
        <Box label="Delivery tracking">
          {order.shipments.map((sh, i) => (
            <div key={i} style={{ marginTop: i ? "10px" : 0 }}>
              <Text style={{ ...s.p, margin: 0, fontWeight: 600 }}>{sh.carrier}</Text>
              <Text style={{ ...s.p, margin: 0, fontFamily: "'SFMono-Regular', Menlo, Consolas, monospace", fontSize: "14px" }}>Tracking no: {sh.tracking_no}</Text>
              {sh.estimated_delivery && <Text style={s.muted}>Estimated delivery: {niceDate(sh.estimated_delivery)}</Text>}
            </div>
          ))}
        </Box>
      )}

      {order.order_items.length > 0 && <Items order={order} event={event} origin={origin} />}
      {!supplier && <Totals order={order} />}

      {!supplier && addressLines.length > 0 && (
        <Box label={internal ? "Ship to" : "Delivering to"}>{addressLines.map((l, i) => <Text key={i} style={{ ...s.p, margin: 0, fontSize: "14px", lineHeight: "22px" }}>{l}</Text>)}</Box>
      )}

      {t.next && (
        <Section style={{ margin: "10px 0 0" }}>
          <Text style={s.label}>What happens next</Text>
          {t.next.map((n, i) => <Text key={i} style={{ ...s.p, margin: "0 0 6px", fontSize: "14px", lineHeight: "22px" }}>• {n}</Text>)}
        </Section>
      )}

      {t.cta && !supplier && <CtaButton href={url}>{t.cta}</CtaButton>}
      {customer && <Text style={{ ...s.muted, textAlign: "center", marginTop: "10px" }}>Button not working? Copy this link: {url}</Text>}
    </EmailShell>
  );
}

const subjectFor = (event: Event, order: EmailOrder) =>
  event === "admin_new_order" ? `New paid order ${order.order_number} · ${emailMoney(order.total, order.currency)}` : `${definitions[event].subject} — ${order.order_number}`;

export async function composeOrderEmail(event: string, order: EmailOrder | null, origin: string) {
  const normalized = event.replace(/_resend$/, "");
  if (!order || !ORDER_EMAIL_EVENTS.some((name) => name === normalized)) return null;
  // A cancellation with no payment behind it is an abandoned checkout, not a cancelled purchase.
  const name: Event = normalized === "order_cancelled" && !order.paid_at ? "checkout_abandoned" : (normalized as OrderEvent);
  const element = <OrderEmail event={name} order={order} origin={origin} />;
  return { subject: subjectFor(name, order), html: await render(element), text: await render(element, { plainText: true }) };
}
