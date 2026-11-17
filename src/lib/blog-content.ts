import sanitizeHtml from "sanitize-html";
import { z } from "zod";

export const blogInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().trim().max(500),
  body: z.string().min(1).max(100000),
  cover_url: z.string().max(2000).refine((v) => !v || /^https:\/\//.test(v) || /^\/(?!\/)/.test(v), "Use a secure image URL"),
  category: z.string().trim().min(1).max(80),
  status: z.enum(["draft", "published"]),
});
export type BlogInput = z.infer<typeof blogInput>;
export type BlogPost = BlogInput & { id: string; created_at: string; updated_at: string };
export const blogSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const cleanBlogHtml = (html: string) => sanitizeHtml(html, {
  allowedTags: ["p", "br", "h2", "h3", "strong", "b", "em", "i", "u", "s", "blockquote", "ol", "ul", "li", "a"],
  allowedAttributes: { a: ["href", "title"], li: ["data-list"] },
  allowedSchemes: ["https", "http", "mailto"], allowProtocolRelative: false,
});