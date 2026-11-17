import { createFileRoute } from "@tanstack/react-router";
import { CatalogGroups } from "@/components/admin/CatalogGroups";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "Manage categories — CorrectBuy" }, { name: "description", content: "Edit CorrectBuy categories and their products." }, { property: "og:title", content: "Manage categories — CorrectBuy" }, { property: "og:description", content: "Edit CorrectBuy categories and their products." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <CatalogGroups kind="category" />,
});