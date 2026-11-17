import { createFileRoute } from "@tanstack/react-router";
import { Block, StaticPage, staticHead } from "@/components/StaticPage";

export const Route = createFileRoute("/shipping-policy")({
  head: () => staticHead("Delivery policy", "Where we deliver, how long it takes and what it costs."),
  component: Page,
});

function Page() {
  return (
    <StaticPage title="Delivery policy" intro="Where we deliver, how long it takes and what it costs.">
      <Block h={"Delivery areas and fees"}>
        <p>We deliver nationwide. Fees are set by state and shown at checkout before you pay. Orders over ₦200,000 ship free.</p>
      </Block>
      <Block h={"Timelines"}>
        <p>Lagos: 1–2 working days. Abuja and Oyo: 2–3. Rivers: 2–4. Other states: 3–6. Some items ship directly from our supplier and may take a day longer.</p>
      </Block>
      <Block h={"Tracking"}>
        <p>When your order ships we send the carrier name and tracking number by email and SMS. You can also check the Track order page any time.</p>
      </Block>
    </StaticPage>
  );
}
