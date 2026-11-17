import { createFileRoute } from "@tanstack/react-router";
import { Block, StaticPage, staticHead } from "@/components/StaticPage";

export const Route = createFileRoute("/returns-policy")({
  head: () => staticHead("Returns policy", "Changed your mind or something isn't right? Here's how returns work."),
  component: Page,
});

function Page() {
  return (
    <StaticPage title="Returns policy" intro="Changed your mind or something isn't right? Here's how returns work.">
      <Block h={"Return window"}>
        <p>You can request a return within 14 days of delivery. Items must be unused and in their original packaging, unless faulty.</p>
      </Block>
      <Block h={"How to return"}>
        <p>Signed in? Open the order in your account and choose Request return. Checked out as a guest? Contact us with your order number.</p>
      </Block>
      <Block h={"Refunds"}>
        <p>Once we receive and check the item, we refund to your original payment method. Banks usually take 3–10 working days to show it.</p>
      </Block>
    </StaticPage>
  );
}
