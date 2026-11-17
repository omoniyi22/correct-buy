import { render } from "@react-email/render";
import { brand, CtaButton, EmailShell, Pill, SITE_URL, s, Text } from "@/lib/email-layout";

/**
 * Account emails sent by Supabase Auth. Supabase fills the {{ .Placeholders }} itself, so these are
 * rendered once to static HTML (see scripts/build-auth-emails.tsx) and pasted into
 * Supabase Dashboard → Authentication → Emails → Templates.
 */
const ORIGIN = SITE_URL;
export const AUTH_EMAILS = {
  "confirm-signup": { subject: "Confirm your CorrectBuy account", badge: "Welcome", title: "Welcome to CorrectBuy 👋", body: "You're one step away. Confirm your email address to activate your account and start shopping — track orders, save addresses and check out faster.", cta: "Confirm my email", href: "{{ .ConfirmationURL }}", note: "If you didn't create a CorrectBuy account, you can safely ignore this email." },
  "reset-password": { subject: "Reset your CorrectBuy password", badge: "Password reset", title: "Reset your password", body: "We received a request to reset the password on your CorrectBuy account. Click the button below to choose a new one. This link expires shortly and can only be used once.", cta: "Choose a new password", href: "{{ .ConfirmationURL }}", note: "If you didn't ask for this, you can ignore this email — your password will stay the same." },
  "magic-link": { subject: "Your CorrectBuy sign-in link", badge: "Sign in", title: "Your sign-in link", body: "Use the button below to sign in to CorrectBuy. No password needed. The link expires shortly and works once.", cta: "Sign in to CorrectBuy", href: "{{ .ConfirmationURL }}", note: "If you didn't request this link, you can ignore this email." },
  "change-email": { subject: "Confirm your new CorrectBuy email", badge: "Email change", title: "Confirm your new email address", body: "You asked to change the email on your CorrectBuy account to {{ .NewEmail }}. Confirm the change with the button below.", cta: "Confirm new email", href: "{{ .ConfirmationURL }}", note: "If you didn't make this request, please contact us right away at info@correctbuy.ng." },
  "invite": { subject: "You've been invited to CorrectBuy", badge: "Invitation", title: "You've been invited", body: "You've been invited to join CorrectBuy. Accept the invitation to set up your account.", cta: "Accept invitation", href: "{{ .ConfirmationURL }}", note: "If you weren't expecting this invitation, you can ignore this email." },
} as const;
export type AuthEmailKey = keyof typeof AUTH_EMAILS | "reauthentication";

function AuthEmail({ k }: { k: keyof typeof AUTH_EMAILS }) {
  const t = AUTH_EMAILS[k];
  return (
    <EmailShell preview={t.subject} origin={ORIGIN} reason="You're receiving this email because of activity on your CorrectBuy account.">
      <Pill>{t.badge}</Pill>
      <Text style={s.h1}>{t.title}</Text>
      <Text style={s.p}>{t.body}</Text>
      <CtaButton href={t.href}>{t.cta}</CtaButton>
      <Text style={{ ...s.muted, textAlign: "center", marginTop: "10px" }}>Button not working? Paste this link into your browser:<br />{t.href}</Text>
      <Text style={{ ...s.muted, marginTop: "18px", paddingTop: "14px", borderTop: `1px solid ${brand.line}` }}>{t.note}</Text>
    </EmailShell>
  );
}
function Reauth() {
  return (
    <EmailShell preview="Your CorrectBuy verification code" origin={ORIGIN} reason="You're receiving this email because of activity on your CorrectBuy account.">
      <Pill>Verification</Pill>
      <Text style={s.h1}>Your verification code</Text>
      <Text style={s.p}>Enter this code to confirm it's you:</Text>
      <Text style={{ margin: "8px 0 18px", textAlign: "center", fontSize: "34px", fontWeight: 700, letterSpacing: "0.3em", color: brand.navy, backgroundColor: brand.soft, border: `1px solid ${brand.line}`, borderRadius: "10px", padding: "16px 0" }}>{"{{ .Token }}"}</Text>
      <Text style={s.muted}>If you didn't request this code, please ignore this email.</Text>
    </EmailShell>
  );
}
export async function renderAuthEmail(k: AuthEmailKey) {
  return render(k === "reauthentication" ? <Reauth /> : <AuthEmail k={k} />);
}
