import { useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Eye, Pencil, Sparkles, Square, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { saveBlog } from "@/lib/blog.functions";
import { blogSlug, cleanBlogHtml, type BlogInput } from "@/lib/blog-content";
import { AdminHeader, Field, input } from "@/components/admin/ui";
import { ListSkeleton } from "@/components/Skeletons";
import { Button } from "@/components/ui/button";
import { BlogArticle } from "@/components/BlogArticle";
import { QuillEditor } from "@/components/QuillEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/blog")({
  head: () => ({ meta: [{ title: "Blog editor — CorrectBuy admin" }, { name: "description", content: "Create, edit and preview CorrectBuy articles." }, { property: "og:title", content: "Blog editor — CorrectBuy admin" }, { property: "og:description", content: "Create, edit and preview CorrectBuy articles." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: BlogAdmin,
});
const blank = (): BlogInput => ({ title: "", slug: "", excerpt: "", body: "", cover_url: "", category: "Buying guides", status: "draft" });
function BlogAdmin() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const save = useServerFn(saveBlog);
  const [post, setPost] = useState<BlogInput | null>(null);
  const [mode, setMode] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [writing, setWriting] = useState(false);
  const [proposal, setProposal] = useState("");
  const [aiError, setAiError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const rows = useQuery({ queryKey: ["admin-blog"], enabled: isAdmin, queryFn: async () => { const { data, error } = await supabase.from("blog_posts").select("*").order("updated_at", { ascending: false }); if (error) throw error; return data; } });
  const patch = (values: Partial<BlogInput>) => setPost((old) => old ? { ...old, ...values } : old);
  const open = (next: BlogInput) => { if (post && !window.confirm("Leave the current editor? Unsaved changes will be lost.")) return; abort.current?.abort(); setPost(next); setMode("edit"); setProposal(""); setAiError(""); };
  const persist = async () => {
    if (!post) return;
    setSaving(true);
    try { const result = await save({ data: post }); setPost({ ...post, id: result.id }); await Promise.all([qc.invalidateQueries({ queryKey: ["admin-blog"] }), qc.invalidateQueries({ queryKey: ["blog"] })]); toast.success(post.status === "published" ? "Article published" : "Draft saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save article"); } finally { setSaving(false); }
  };
  const write = async () => {
    if (!post) return;
    setWriting(true); setProposal(""); setAiError("");
    const controller = new AbortController(); abort.current = controller;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Please sign in again");
      const res = await fetch("/api/blog-ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ title: post.title, body: post.body, instruction }), signal: controller.signal });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Writing service unavailable"); }
      const reader = res.body?.getReader(); if (!reader) throw new Error("No writing response received");
      const decoder = new TextDecoder(); let buffer = ""; let output = "";
      while (true) { const chunk = await reader.read(); if (chunk.done) break; buffer += decoder.decode(chunk.value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() ?? ""; for (const line of lines) { if (!line.trim()) continue; const event = JSON.parse(line); if (event.error) throw new Error(event.error); if (event.text) { output += event.text; setProposal(output); } } }
    } catch (e) { if (!controller.signal.aborted) setAiError(e instanceof Error ? e.message : "Writing failed"); } finally { setWriting(false); abort.current = null; }
  };
  if (!isAdmin) return <p>Only the store owner can manage the blog.</p>;
  return <div>
    <AdminHeader title="Blog" actions={<><Button variant="outline" asChild><Link to="/blog"><Eye />View blog</Link></Button><Button onClick={() => open(blank())}><Plus />New article</Button></>} />
    <div className="grid min-w-0 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="min-w-0 border-b border-border pb-5 lg:border-b-0 lg:border-r lg:pr-5">
        {rows.isPending ? <ListSkeleton rows={3} /> : rows.isError ? <p role="alert">Articles could not be loaded.</p> : !rows.data?.length ? <p className="text-sm text-muted-foreground">No articles yet.</p> : <ul className="space-y-2">{rows.data.map((row) => <li key={row.id}><Button variant={post?.id === row.id ? "secondary" : "ghost"} className="h-auto w-full justify-start whitespace-normal py-3 text-left" onClick={() => open({ ...row, status: row.status === "published" ? "published" : "draft" })}><span><span className="block font-semibold">{row.title}</span><span className="mt-1 block text-xs capitalize text-muted-foreground">{row.status}</span></span></Button></li>)}</ul>}
      </aside>
      {post ? <section className="min-w-0">
        <div className="mb-5 flex flex-wrap items-center gap-2"><Button variant={mode === "edit" ? "secondary" : "ghost"} onClick={() => setMode("edit")}><Pencil />Editor</Button><Button variant={mode === "preview" ? "secondary" : "ghost"} onClick={() => setMode("preview")}><Eye />Preview</Button><Button disabled={saving || writing} onClick={persist} className="ml-auto"><Save />{saving ? "Saving…" : post.status === "published" ? "Publish article" : "Save draft"}</Button></div>
        {mode === "preview" ? <BlogArticle post={post} /> : <div className="space-y-5">
          <Field label="Title"><input className={input} value={post.title} onChange={(e) => patch({ title: e.target.value, ...(!post.id ? { slug: blogSlug(e.target.value) } : {}) })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Article URL"><input className={input} value={post.slug} onChange={(e) => patch({ slug: e.target.value })} /></Field><Field label="Category"><input className={input} value={post.category} onChange={(e) => patch({ category: e.target.value })} /></Field></div>
          <Field label="Summary"><textarea rows={3} className={input} value={post.excerpt} onChange={(e) => patch({ excerpt: e.target.value })} /></Field>
          <Field label="Cover image URL"><input className={input} placeholder="https://…" value={post.cover_url} onChange={(e) => patch({ cover_url: e.target.value })} /></Field>
          <div><p className="mb-2 text-sm font-semibold">Article content</p><QuillEditor key={post.id ?? "new"} value={post.body} onChange={(body) => patch({ body })} /></div>
          <div className="border-y border-border py-5"><h2 className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-primary" />AI editor</h2><textarea aria-label="AI writing request" className={`${input} mt-3`} placeholder="Draft a buying guide, improve the wording, or shorten this article…" value={instruction} onChange={(e) => setInstruction(e.target.value)} /><div className="mt-3 flex gap-2"><Button disabled={writing || instruction.trim().length < 3} onClick={write}><Sparkles />{writing ? "Writing…" : "Generate suggestion"}</Button>{writing && <Button variant="outline" onClick={() => abort.current?.abort()}><Square />Stop</Button>}</div>{aiError && <p role="alert" className="mt-3 text-sm text-destructive">{aiError}</p>}{proposal && <div className="mt-5"><div className="blog-prose border-l-2 border-primary pl-4" dangerouslySetInnerHTML={{ __html: cleanBlogHtml(proposal) }} />{!writing && !aiError && <div className="mt-4 flex gap-2"><Button onClick={() => { patch({ body: cleanBlogHtml(proposal) }); setProposal(""); }}><Check />Use suggestion</Button><Button variant="outline" onClick={() => setProposal("")}><X />Discard</Button></div>}</div>}</div>
          <div className="max-w-xs"><p className="mb-2 text-sm font-semibold">Visibility</p><Select value={post.status} onValueChange={(v) => patch({ status: v === "published" ? "published" : "draft" })}><SelectTrigger aria-label="Article visibility"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent></Select></div>
        </div>}
      </section> : <div className="py-14 text-center"><h2 className="text-xl font-bold">Your next story starts here</h2><Button className="mt-5" onClick={() => open(blank())}><Plus />Create article</Button></div>}
    </div>
  </div>;
}