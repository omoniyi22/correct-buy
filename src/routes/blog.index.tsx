import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { readBlog } from "@/lib/blog.functions";
import { SiteFooter } from "@/components/SiteHeader";
import { PageExtras } from "@/components/PageExtras";

const articlesQuery = { queryKey: ["blog", "published"], queryFn: () => readBlog({ data: {} }), staleTime: 60000 };
export const Route = createFileRoute("/blog/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(articlesQuery),
  head: () => ({ meta: [{ title: "Blog — CorrectBuy buying guides & stories" }, { name: "description", content: "Buying guides, product advice and everyday inspiration from CorrectBuy." }, { property: "og:title", content: "Blog — CorrectBuy buying guides & stories" }, { property: "og:description", content: "Buying guides, product advice and everyday inspiration from CorrectBuy." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: BlogPage,
});
function BlogPage() {
  const { data: posts } = useSuspenseQuery(articlesQuery);
  return <><main>
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase text-primary">The CorrectBuy journal</p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Blog</h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">Good finds. Thoughtful choices. Everyday inspiration.</p>
      {posts.length ? <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <Link key={post.id} to="/blog/$slug" params={{ slug: post.slug }} className="group min-w-0">
        {post.cover_url ? <img src={post.cover_url} alt={post.title} className="aspect-[16/10] w-full rounded-lg bg-muted object-cover" /> : <div className="grid aspect-[16/10] place-items-center rounded-lg bg-muted"><BookOpen className="h-12 w-12 text-primary" /></div>}
        <p className="mt-5 text-xs font-semibold uppercase text-primary">{post.category}</p>
        <h2 className="mt-2 text-2xl font-bold group-hover:text-primary">{post.title}</h2>
        <p className="mt-3 text-muted-foreground">{post.excerpt}</p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">Read article <ArrowUpRight className="h-4 w-4" /></span>
      </Link>)}</div> : <div className="mt-12 border-y border-border py-10"><BookOpen className="h-8 w-8 text-primary" /><h2 className="mt-4 text-2xl font-bold">Fresh stories are on the way</h2><p className="mt-2 text-muted-foreground">Explore our latest finds while the first articles are being prepared.</p></div>}
    </section><PageExtras /></main><SiteFooter /></>;
}