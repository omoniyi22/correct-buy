import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/blog-ai")({ server: { handlers: { POST: async ({ request }) => {
  const { handleBlogAi } = await import("@/lib/blog-ai.server");
  return handleBlogAi(request);
} } } });