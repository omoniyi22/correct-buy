import { createFileRoute } from "@tanstack/react-router";
import { Block, StaticPage, staticHead } from "@/components/StaticPage";

export const Route = createFileRoute("/terms")({
  head: () => staticHead("Terms of service", "The rules that apply when you shop with CorrectBuy."),
  component: Page,
});

function Page() {
  return (
    <StaticPage title="Terms of service" intro="The rules that apply when you shop with CorrectBuy.">
      <Block h={"Orders"}>
        <p>An order is confirmed once payment succeeds. We may cancel and fully refund an order if an item becomes unavailable.</p>
      </Block>
      <Block h={"Prices"}>
        <p>Prices are in Nigerian Naira and include any applicable taxes shown at checkout. The price you pay is the price shown at checkout.</p>
      </Block>
      <Block h={"Liability"}>
        <p>Our products carry the warranty described on each product page. Nothing in these terms limits your statutory rights.</p>
      </Block>
    </StaticPage>
  );
}
