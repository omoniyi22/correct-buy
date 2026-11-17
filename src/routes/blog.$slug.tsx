import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { readBlog } from "@/lib/blog.functions";
import { SiteFooter } from "@/components/SiteHeader";
import { PageExtras } from "@/components/PageExtras";
import { BlogArticle } from "@/components/BlogArticle";
import type { BlogPost } from "@/lib/blog-content";
const articleQuery = (slug: string) => ({ queryKey: ["blog", slug], queryFn: async () => { const rows = await readBlog({ data: { slug } }); const post = rows[0]; if (!post) throw notFound(); return post; }, staleTime: 60000 });
export const Route = createFileRoute("/blog/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(articleQuery(params.slug)),
  head: ({ loaderData }) => ({ meta: [
    { title: loaderData ? `${loaderData.title} — CorrectBuy blog` : "Article unavailable — CorrectBuy" },
    { name: "description", content: loaderData?.excerpt || "Product advice and buying guides from CorrectBuy." },
    { property: "og:title", content: loaderData?.title || "Article unavailable — CorrectBuy" },
    { property: "og:description", content: loaderData?.excerpt || "Product advice and buying guides from CorrectBuy." },
    { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary_large_image" },
    ...(loaderData?.cover_url.startsWith("https://") ? [{ property: "og:image", content: loaderData.cover_url }, { name: "twitter:image", content: loaderData.cover_url }] : []),
    ...(!loaderData ? [{ name: "robots", content: "noindex" }] : []),
  ] }),
  component: ArticlePage,
});
function ArticlePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(articleQuery(slug));
  return <><main><div className="mx-auto max-w-3xl px-5 pt-8 sm:px-6"><Link to="/blog" className="text-sm font-semibold text-primary">← All articles</Link></div><BlogArticle post={data as BlogPost} /><PageExtras /></main><SiteFooter /></>;
}