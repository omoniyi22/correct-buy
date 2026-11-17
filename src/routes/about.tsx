import { createFileRoute } from "@tanstack/react-router";
import { Block, StaticPage, staticHead } from "@/components/StaticPage";

export const Route = createFileRoute("/about")({
  head: () => staticHead("About us", "CorrectBuy is a small Lagos team that researches, tests and stocks only the gear we'd buy ourselves."),
  component: Page,
});

function Page() {
  return (
    <StaticPage
      after={
        <section className="mx-auto max-w-6xl px-5 pt-14 sm:px-6">
          <div className="grid gap-6 rounded-[2rem] bg-accent p-8 sm:grid-cols-2 lg:grid-cols-4">
            {[["2,000+", "Happy customers"], ["300+", "Products tested"], ["4.9★", "Average rating"], ["48h", "Average delivery"]].map(([n, l]) => (
              <div key={l}><p className="font-display text-3xl font-extrabold">{n}</p><p className="mt-1 text-sm text-muted-foreground">{l}</p></div>
            ))}
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[["We research", "We compare hundreds of options in every category."], ["We test", "Only what survives weeks of real use makes the cut."], ["You buy right", "One great choice per need — no regrets."]].map(([t, d], i) => (
              <div key={t} className="rounded-2xl border border-border bg-card p-6">
                <span className="font-display text-4xl font-extrabold text-muted">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-bold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>
      }
      title="About us" intro="CorrectBuy is a small Lagos team that researches, tests and stocks only the gear we'd buy ourselves.">
      <Block h={"What we do"}>
        <p>We compare hundreds of products in every category, test the shortlist for weeks, and stock the few that earn it.</p>
        <p>Every order is packed and checked by a person before it leaves our partners' warehouses.</p>
      </Block>
      <Block h={"Who we work with"}>
        <p>We buy directly from trusted distributors and makers across Nigeria, so delivery is fast and warranties are honoured.</p>
      </Block>
    </StaticPage>
  );
}
