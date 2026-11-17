import { createFileRoute } from "@tanstack/react-router";
import { CollectionDirectory } from "@/components/CollectionDirectory";

export const Route = createFileRoute("/collections/")({
  head: () => ({ meta: [
    { title: "Collections — CorrectBuy" },
    { name: "description", content: "Explore new arrivals, featured picks and curated everyday collections at CorrectBuy." },
    { property: "og:title", content: "Collections — CorrectBuy" },
    { property: "og:description", content: "Explore new arrivals, featured picks and curated everyday collections at CorrectBuy." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Collections,
});

function Collections() { return <CollectionDirectory mode="collections" />; }