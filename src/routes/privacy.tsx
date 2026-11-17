import { createFileRoute } from "@tanstack/react-router";
import { Block, StaticPage, staticHead } from "@/components/StaticPage";

export const Route = createFileRoute("/privacy")({
  head: () => staticHead("Privacy policy", "What we collect, why, and how we protect it."),
  component: Page,
});

function Page() {
  return (
    <StaticPage title="Privacy policy" intro="What we collect, why, and how we protect it.">
      <Block h={"What we collect"}>
        <p>Your name, contact details and delivery address so we can fulfil orders, plus order history if you have an account.</p>
      </Block>
      <Block h={"Payments"}>
        <p>Card details are entered on our payment partner's secure page and never touch our servers.</p>
      </Block>
      <Block h={"Marketing"}>
        <p>We only email you offers if you opt in. You can unsubscribe at any time.</p>
      </Block>
      <Block h={"Your rights"}>
        <p>You can ask us to show, correct or delete your personal data by contacting support.</p>
      </Block>
    </StaticPage>
  );
}
