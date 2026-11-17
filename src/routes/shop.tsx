import { createFileRoute, redirect } from "@tanstack/react-router";

// Old URL kept working: /shop?q= now lives at /search?q=
export const Route = createFileRoute("/shop")({
  beforeLoad: ({ search }) => {
    const s = search as { q?: string };
    throw redirect({ to: "/search", search: { q: typeof s.q === "string" ? s.q : "" }, statusCode: 301 });
  },
});
