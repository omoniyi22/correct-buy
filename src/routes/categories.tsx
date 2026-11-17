import { createFileRoute } from "@tanstack/react-router";
import { CollectionDirectory } from "@/components/CollectionDirectory";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [
    { title: "Shop by category — CorrectBuy" },
    { name: "description", content: "Browse audio, wearables, footwear and bags at CorrectBuy." },
    { property: "og:title", content: "Shop by category — CorrectBuy" },
    { property: "og:description", content: "Browse audio, wearables, footwear and bags at CorrectBuy." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Categories,
});

function Categories() { return <CollectionDirectory mode="categories" />; }