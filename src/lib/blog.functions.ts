import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { blogInput, cleanBlogHtml } from "@/lib/blog-content";
import type { Database } from "@/integrations/supabase/types";

export const readBlog = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().max(180).optional() }).parse)
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const url = process.env["SUPABASE_URL"];
    if (!key || !url) throw new Error("Blog is temporarily unavailable");
    const db = createClient<Database>(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } } });
    let query = db.from("blog_posts").select("id,title,slug,excerpt,body,cover_url,category,status,created_at,updated_at").eq("status", "published").order("created_at", { ascending: false });
    if (data.slug) query = query.eq("slug", data.slug);
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load articles");
    return (rows ?? []).map((post) => ({ ...post, body: cleanBlogHtml(post.body) }));
  });

export const saveBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(blogInput.parse)
  .handler(async ({ context, data }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!allowed) throw new Error("Only the store owner can edit articles");
    const { id, ...fields } = data;
    const body = cleanBlogHtml(fields.body);
    if (!body.replace(/<[^>]*>/g, "").trim()) throw new Error("Add article content before saving");
    const values = { ...fields, body, updated_at: new Date().toISOString() };
    const query = id ? context.supabase.from("blog_posts").update(values).eq("id", id) : context.supabase.from("blog_posts").insert({ ...values, author_id: context.userId });
    const { data: saved, error } = await query.select().single();
    if (error) throw new Error(error.code === "23505" ? "That article URL already exists" : "Article could not be saved");
    return saved;
  });