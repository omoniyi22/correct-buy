import { createFileRoute } from "@tanstack/react-router";
import { CatalogGroups } from "@/components/admin/CatalogGroups";

export const Route = createFileRoute("/admin/collections")({
  head: () => ({ meta: [{ title: "Manage collections — CorrectBuy" }, { name: "description", content: "Edit CorrectBuy custom collections and product selections." }, { property: "og:title", content: "Manage collections — CorrectBuy" }, { property: "og:description", content: "Edit CorrectBuy custom collections and product selections." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <CatalogGroups kind="collection" />,
});