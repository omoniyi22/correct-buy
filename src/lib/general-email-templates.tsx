import { render } from "@react-email/render";
import { brand, CtaButton, EmailShell, Pill, s, Section, Text, Link } from "@/lib/email-layout";

/** Emails that aren't about an order: welcome, contact auto-reply, staff contact alert, newsletter welcome. */
export const GENERAL_EMAIL_EVENTS = ["welcome", "contact_received", "admin_contact_message", "newsletter_welcome"] as const;
export type GeneralEvent = (typeof GENERAL_EMAIL_EVENTS)[number];
export type GeneralPayload = { name?: string; email?: string; message?: string };

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
function Perks() {
  const perks = ["Every product tested in real use", "Secure online payment", "Track every order to your door", "Real human support"];
  return (
    <Section style={s.box}>
      <Text style={s.label}>Why shoppers choose CorrectBuy</Text>
      {perks.map((p) => <Text key={p} style={{ ...s.p, margin: "0 0 4px", fontSize: "14px", lineHeight: "22px" }}><span style={{ color: brand.green, fontWeight: 700 }}>✓</span> {p}</Text>)}
    </Section>
  );
}
function Quote({ children }: { children: string }) {
  return <Section style={{ ...s.box, borderLeft: `4px solid ${brand.blue}` }}><Text style={{ ...s.p, margin: 0, whiteSpace: "pre-wrap", fontSize: "14px" }}>{children}</Text></Section>;
}

export function GeneralEmail({ event, payload, origin }: { event: GeneralEvent; payload: GeneralPayload; origin: string }) {
  const name = clean(payload.name, 80);
  const message = clean(payload.message, 3000);
  const account = "You're receiving this email because of your activity on CorrectBuy.";
  if (event === "welcome") return (
    <EmailShell preview="Your account is ready — welcome to CorrectBuy" origin={origin} reason={account}>
      <Pill color={brand.green}>Welcome</Pill>
      <Text style={s.h1}>Welcome to CorrectBuy{name ? `, ${name}` : ""} 👋</Text>
      <Text style={s.p}>Your account is ready. We help you buy right, the first time — real products, clear prices and people who pick up when you need help.</Text>
      <Perks />
      <Text style={s.p}>With your account you can track every order, save delivery addresses and check out faster.</Text>
      <CtaButton href={`${origin}/shop`}>Start shopping</CtaButton>
      <Text style={{ ...s.muted, textAlign: "center" }}>Or <Link href={`${origin}/account`} style={{ color: brand.blue }}>go to your account</Link>.</Text>
    </EmailShell>
  );
  if (event === "contact_received") return (
    <EmailShell preview="We've received your message" origin={origin} reason="You're receiving this email because you contacted CorrectBuy through our website.">
      <Pill>Message received</Pill>
      <Text style={s.h1}>Thanks for getting in touch</Text>
      <Text style={s.p}>Hi {name || "there"}, we've received your message and a real person on our team will reply to this email address as soon as possible.</Text>
      {message && <><Text style={s.label}>Your message</Text><Quote>{message}</Quote></>}
      <Text style={s.p}>Need to add something? Just reply to this email.</Text>
      <Text style={s.p}>In the meantime, you may find a quick answer in our <Link href={`${origin}/faq`} style={{ color: brand.blue }}>FAQ</Link>, or you can <Link href={`${origin}/track`} style={{ color: brand.blue }}>track an order</Link>.</Text>
    </EmailShell>
  );
  if (event === "admin_contact_message") return (
    <EmailShell preview={`New contact message from ${name || "a visitor"}`} origin={origin} reason="Internal notification for CorrectBuy staff." accent={brand.red}>
      <Pill color={brand.red}>New message</Pill>
      <Text style={s.h1}>New contact form message</Text>
      <Section style={s.box}>
        <Text style={s.label}>From</Text>
        <Text style={{ ...s.p, margin: 0, fontWeight: 600 }}>{name || "—"}</Text>
        <Text style={{ ...s.muted }}>{payload.email ? <Link href={`mailto:${clean(payload.email, 255)}`} style={{ color: brand.blue }}>{clean(payload.email, 255)}</Link> : "—"}</Text>
      </Section>
      <Text style={s.label}>Message</Text>
      <Quote>{message || "—"}</Quote>
      <Text style={s.muted}>Reply to this email to answer the customer directly.</Text>
    </EmailShell>
  );
  return (
    <EmailShell preview="You're on the list — welcome to CorrectBuy" origin={origin} reason="You're receiving this email because this address was subscribed to CorrectBuy updates. To stop, reply with “unsubscribe”.">
      <Pill>Subscribed</Pill>
      <Text style={s.h1}>You're on the list 🎉</Text>
      <Text style={s.p}>Thanks for subscribing. We'll send you new arrivals, honest product picks and the occasional deal — never spam.</Text>
      <Perks />
      <CtaButton href={`${origin}/shop`}>Browse new arrivals</CtaButton>
      <Text style={{ ...s.muted, textAlign: "center" }}>Changed your mind? Reply with “unsubscribe” or email <Link href="mailto:info@correctbuy.ng?subject=Unsubscribe" style={{ color: brand.blue }}>info@correctbuy.ng</Link> and we'll remove you.</Text>
    </EmailShell>
  );
}

const SUBJECTS: Record<GeneralEvent, string> = {
  welcome: "Welcome to CorrectBuy",
  contact_received: "We've received your message",
  admin_contact_message: "New contact form message",
  newsletter_welcome: "You're subscribed to CorrectBuy updates",
};
export async function composeGeneralEmail(event: string, payload: unknown, origin: string) {
  if (!GENERAL_EMAIL_EVENTS.some((e) => e === event)) return null;
  const name = event as GeneralEvent;
  const data = (payload && typeof payload === "object" ? payload : {}) as GeneralPayload;
  const element = <GeneralEmail event={name} payload={data} origin={origin} />;
  const subject = name === "admin_contact_message" ? `${SUBJECTS[name]} — ${clean(data.name, 60) || "visitor"}` : SUBJECTS[name];
  return { subject, html: await render(element), text: await render(element, { plainText: true }) };
}
