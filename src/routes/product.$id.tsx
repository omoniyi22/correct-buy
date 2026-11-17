import { createFileRoute, redirect } from "@tanstack/react-router";

// Old URL kept working: /product/:id now lives at /p/:slug
export const Route = createFileRoute("/product/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/p/$slug", params: { slug: params.id }, statusCode: 301 });
  },
});
