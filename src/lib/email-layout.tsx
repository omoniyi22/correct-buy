import { Body, Button, Column, Container, Head, Hr, Html, Img, Link, Preview, Row, Section, Text } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

/** Brand tokens for email. Email clients ignore CSS variables, so these are literal values. */
export const brand = {
  navy: "#0d1f5c",
  blue: "#2b7bff",
  red: "#d6262d",
  text: "#1c2433",
  muted: "#5b6578",
  line: "#e6eaf2",
  page: "#f4f6fb",
  card: "#ffffff",
  soft: "#f8faff",
  green: "#12805c",
  amber: "#b45309",
};
export const SUPPORT_EMAIL = "info@correctbuy.ng";
export const SITE_URL = "https://correctbuy.ng";
export const LOGO_URL = "https://newbucket.t3.tigrisfiles.io/correctbuy-logo-full-CzRq_Vg0.png";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const s = {
  h1: { margin: "14px 0 8px", color: brand.navy, fontSize: "26px", lineHeight: "32px", fontWeight: 700, fontFamily: FONT } satisfies CSSProperties,
  p: { margin: "0 0 14px", color: brand.text, fontSize: "15px", lineHeight: "24px", fontFamily: FONT } satisfies CSSProperties,
  muted: { margin: 0, color: brand.muted, fontSize: "13px", lineHeight: "20px", fontFamily: FONT } satisfies CSSProperties,
  label: { margin: "0 0 4px", color: brand.muted, fontSize: "11px", lineHeight: "16px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: FONT } satisfies CSSProperties,
  box: { backgroundColor: brand.soft, border: `1px solid ${brand.line}`, borderRadius: "10px", padding: "16px 18px", margin: "0 0 14px" } satisfies CSSProperties,
  button: { backgroundColor: brand.red, color: "#ffffff", borderRadius: "999px", padding: "14px 28px", fontSize: "15px", fontWeight: 700, textDecoration: "none", fontFamily: FONT, display: "inline-block" } satisfies CSSProperties,
};

export function Pill({ children, color = brand.blue }: { children: ReactNode; color?: string }) {
  return <Text style={{ margin: 0, display: "inline-block", backgroundColor: color, color: "#ffffff", borderRadius: "999px", padding: "5px 12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: FONT }}>{children}</Text>;
}

export function CtaButton({ href, children }: { href: string; children: ReactNode }) {
  return <Section style={{ margin: "22px 0 8px", textAlign: "center" }}><Button href={href} style={s.button}>{children}</Button></Section>;
}

/**
 * The shared CorrectBuy email frame: preheader, logo header, white card, trust footer.
 * `origin` is the site origin (absolute URLs are required in email); `reason` is the
 * "why you received this" line every transactional email should carry.
 */
export function EmailShell({ preview, origin, reason, children, accent = brand.blue }: { preview: string; origin: string; reason: string; children: ReactNode; accent?: string }) {
  const link = { color: brand.muted, textDecoration: "underline" } satisfies CSSProperties;
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <style>{`@media only screen and (max-width:620px){.cb-card{padding:24px 18px !important}.cb-outer{padding:12px 8px !important}}`}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, backgroundColor: brand.page, fontFamily: FONT }}>
        <Container className="cb-outer" style={{ maxWidth: "600px", padding: "28px 12px" }}>
          <Section style={{ textAlign: "center", padding: "4px 0 18px" }}>
            <Link href={origin}><Img src={LOGO_URL} alt="CorrectBuy" width={168} height={38} style={{ margin: "0 auto", display: "block" }} /></Link>
          </Section>
          <Section style={{ backgroundColor: brand.card, borderRadius: "14px", border: `1px solid ${brand.line}`, borderTop: `4px solid ${accent}` }}>
            <Section className="cb-card" style={{ padding: "32px 32px 28px" }}>{children}</Section>
          </Section>
          <Section style={{ padding: "22px 12px 0", textAlign: "center" }}>
            <Text style={{ ...s.muted, marginBottom: "10px" }}>
              <Link href={`${origin}/track`} style={link}>Track an order</Link> · <Link href={`${origin}/shipping-policy`} style={link}>Shipping</Link> · <Link href={`${origin}/returns-policy`} style={link}>Returns</Link> · <Link href={`${origin}/faq`} style={link}>FAQ</Link> · <Link href={`${origin}/contact`} style={link}>Contact</Link>
            </Text>
            <Text style={{ ...s.muted, marginBottom: "10px" }}>{reason}</Text>
            <Text style={{ ...s.muted, fontSize: "12px" }}>
              Questions? Reply to this email or write to <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link>.<br />
              © {new Date().getFullYear()} CorrectBuy. Buy right, the first time. · <Link href={`${origin}/privacy`} style={link}>Privacy</Link> · <Link href={`${origin}/terms`} style={link}>Terms</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export { Button, Column, Hr, Row, Section, Text, Img, Link };
