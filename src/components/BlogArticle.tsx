import { cleanBlogHtml, type BlogInput } from "@/lib/blog-content";

export function BlogArticle({ post }: { post: BlogInput }) {
  return <article className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
    <p className="text-sm font-semibold uppercase text-primary">{post.category}</p>
    <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">{post.title || "Untitled article"}</h1>
    {post.excerpt && <p className="mt-5 text-lg text-muted-foreground">{post.excerpt}</p>}
    {post.cover_url && <img src={post.cover_url} alt={post.title} className="mt-8 aspect-[16/9] w-full rounded-lg bg-muted object-cover" />}
    <div className="blog-prose mt-8" dangerouslySetInnerHTML={{ __html: cleanBlogHtml(post.body) }} />
  </article>;
}