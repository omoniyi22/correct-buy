import { createFileRoute } from "@tanstack/react-router";
import { Block, StaticPage, staticHead } from "@/components/StaticPage";

export const Route = createFileRoute("/faq")({
  head: () => staticHead("Frequently asked questions", "Quick answers about orders, delivery, payment and returns."),
  component: Page,
});

function Page() {
  return (
    <StaticPage title="Frequently asked questions" intro="Quick answers about orders, delivery, payment and returns.">
      <Block h={"How fast is delivery?"}>
        <p>Lagos orders usually arrive in 1–2 working days, other states in 2–6. You'll get a tracking number as soon as your order ships.</p>
      </Block>
      <Block h={"How do I pay?"}>
        <p>Pay securely by card, bank transfer or USSD on our payment partner's page. We never see or store your card details.</p>
      </Block>
      <Block h={"Can I check out without an account?"}>
        <p>Yes. Guest checkout is open to everyone — you can create an account afterwards to track orders in one place.</p>
      </Block>
      <Block h={"How do I track my order?"}>
        <p>Use the Track order page with your order number and the email or phone you used at checkout.</p>
      </Block>
      <Block h={"Can I return an item?"}>
        <p>Yes, within 14 days of delivery. Signed-in customers can start a return from their order page; guests can contact us.</p>
      </Block>
      <Block h={"Do products come with a warranty?"}>
        <p>Every product is covered by our 2-year CorrectBuy warranty.</p>
      </Block>
    </StaticPage>
  );
}
