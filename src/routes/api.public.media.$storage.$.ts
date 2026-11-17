import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/media/$storage/$")({
  server: { handlers: { GET: async ({ params }) => {
    const index = Number(params.storage);
    const key = params._splat ?? "";
    const count = Number(process.env["AMOUNT_OF_DB"] ?? "1");
    if (!Number.isInteger(index) || index < 1 || index > count || !key || key.split("/").includes("..") || key.startsWith("returns/")) return new Response("Not found", { status: 404 });
    const base = process.env[`BASE_${index}`];
    if (!base) return new Response("Photos unavailable", { status: 503 });
    return Response.redirect(`${base.replace(/\/+$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`, 302);
  } } },
});