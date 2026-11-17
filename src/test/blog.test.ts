import { describe, it, expect } from "vitest";
import { blogInput, blogSlug, cleanBlogHtml } from "@/lib/blog-content";
import { publicPageId, resolvePublicSections } from "@/lib/public-sections";
describe("blog publishing rules", () => {
  const draft = { title: "Headphone guide", slug: "headphone-guide", body: "<p>Compare comfort.</p>", excerpt: "", cover_url: "", category: "Buying guides", status: "draft" };
  it("accepts draft and published articles only", () => {
    expect(blogInput.safeParse(draft).success).toBe(true);
    expect(blogInput.safeParse({ ...draft, status: "published" }).success).toBe(true);
    expect(blogInput.safeParse({ ...draft, status: "hidden" }).success).toBe(false);
  });
  it("rejects unsafe cover URLs", () => { expect(blogInput.safeParse({ ...draft, cover_url: "javascript:alert(1)" }).success).toBe(false); });
  it("strips executable content while preserving rich text", () => {
    expect(cleanBlogHtml('<p onclick="alert(1)"><strong>Guide</strong><script>alert(1)</script><a href="javascript:alert(1)">link</a></p>')).toBe('<p><strong>Guide</strong><a>link</a></p>');
  });
  it("makes shareable slugs", () => { expect(blogSlug("Choosing Your Next Headphones!")).toBe("choosing-your-next-headphones"); });
  it("restores sales sections on blog and article pages", () => {
    expect(publicPageId("/blog/guide")).toBe("article");
    expect(resolvePublicSections({}, "blog").map((s) => s.id)).toEqual(["trust", "products", "brands", "help", "newsletter"]);
    expect(resolvePublicSections({}, "article").map((s) => s.id)).toEqual(["trust", "products", "brands", "help", "newsletter"]);
  });
});