import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, Card } from "@/components/admin/ui";
import { ListSkeleton } from "@/components/Skeletons";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { HOME_SECTIONS, resolveHomeSections } from "@/lib/home-sections";
import { PUBLIC_PAGES, PUBLIC_SECTIONS, resolvePublicSections, movePublicSection } from "@/lib/public-sections";
import { resolveCardStyle, type ProductCardStyle } from "@/lib/card-style";
import { products } from "@/lib/products";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/layout")({
  head: () => ({ meta: [
    { title: "Store appearance & layouts — CorrectBuy admin" },
    { name: "description", content: "Choose product cards and arrange CorrectBuy public page sections." },
    { property: "og:title", content: "Store appearance & layouts — CorrectBuy admin" },
    { property: "og:description", content: "Choose product cards and arrange CorrectBuy public page sections." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: LayoutPage,
});

type Section = { id: string; visible: boolean };
function LayoutPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["admin-home-sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("home_sections, public_sections, product_card_style").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });
  const [home, setHome] = useState<Section[] | null>(null);
  const [pages, setPages] = useState<Record<string, Section[]>>({});
  const [style, setStyle] = useState<ProductCardStyle>("style-1");
  const [page, setPage] = useState("home");
  const [drag, setDrag] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!settings.data) return;
    setHome(resolveHomeSections(settings.data.home_sections));
    setPages(Object.fromEntries(PUBLIC_PAGES.map((p) => [p.id, resolvePublicSections(settings.data.public_sections, p.id)])));
    setStyle(resolveCardStyle(settings.data.product_card_style));
  }, [settings.data]);

  if (!isAdmin) return <p>Only admins can change store appearance and layouts.</p>;
  if (settings.isError) return <div role="alert" className="space-y-3"><p>Unable to load saved settings. Your website has not been changed.</p><Button variant="outline" onClick={() => settings.refetch()}>Try again</Button></div>;
  if (!home) return <ListSkeleton rows={10} />;

  const list = page === "home" ? home : pages[page] ?? resolvePublicSections({}, page);
  const label = (id: string) => [...HOME_SECTIONS, ...PUBLIC_SECTIONS].find((s) => s.id === id)?.label ?? id;
  const updateList = (next: Section[]) => page === "home" ? setHome(next) : setPages((old) => ({ ...old, [page]: next }));
  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.from("store_settings").update({ home_sections: home, public_sections: pages, product_card_style: style, updated_at: new Date().toISOString() }).eq("id", 1).select("id").single();
    setSaving(false);
    if (error || !data) return void toast.error(error?.message ?? "Settings were not saved");
    toast.success("Store appearance and layouts saved");
    await Promise.all([qc.invalidateQueries({ queryKey: ["admin-home-sections"] }), qc.invalidateQueries({ queryKey: ["store-config"] })]);
  };
  const previewProduct = products.find((p) => p.compareAt && p.compareAt > p.price) ?? products[0];
  return (
    <div className="space-y-8">
      <AdminHeader title="Store appearance & layouts" />
      <section aria-labelledby="card-style-heading">
        <h2 id="card-style-heading" className="mb-4 text-xl font-bold">Product card style</h2>
        <div role="radiogroup" aria-label="Product card style" className="grid max-w-5xl grid-cols-1 gap-6 min-[380px]:grid-cols-2 lg:grid-cols-3 sm:gap-8">
          {(["style-1", "style-2", "style-3"] as const).map((option) => (
            <div key={option} className="min-w-0">
              <label className="mb-3 flex cursor-pointer items-center gap-2 font-semibold"><input type="radio" name="product-card-style" value={option} checked={style === option} onChange={() => setStyle(option)} className="h-4 w-4 shrink-0 accent-primary" />{option === "style-1" ? "Style 1 (default)" : option === "style-2" ? "Style 2" : "Style 3 — Large photo"}</label>
              <div className={cn("rounded-2xl", style === option && "ring-2 ring-primary ring-offset-4 ring-offset-background")}>
                {previewProduct && <ProductCard product={previewProduct} style={option} preview />}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section aria-labelledby="page-layout-heading">
        <h2 id="page-layout-heading" className="mb-4 text-xl font-bold">Page sections</h2>
        <label className="mb-4 block max-w-sm text-sm font-semibold">Page
          <select aria-label="Page layout" value={page} onChange={(e) => { setPage(e.target.value); setDrag(null); }} className="mt-2 w-full rounded-md border border-input bg-background p-2.5">
            <option value="home">Homepage</option>{PUBLIC_PAGES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <Card>
          <ol className="space-y-2">
            {list.map((item, i) => <li key={item.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDragEnd={() => setDrag(null)} onDrop={() => { if (drag !== null) updateList(movePublicSection(list, drag, i - drag)); setDrag(null); }} className={cn("flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-2 py-2.5 text-sm sm:gap-3 sm:px-3", !item.visible && "opacity-55", drag === i && "ring-2 ring-primary/40")}>
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="w-4 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 font-semibold">{label(item.id)}</span>
              <Button variant="ghost" size="icon" title="Move up" aria-label={`Move ${label(item.id)} up`} disabled={i === 0} onClick={() => updateList(movePublicSection(list, i, -1))} className="h-8 w-8 shrink-0"><ArrowUp /></Button>
              <Button variant="ghost" size="icon" title="Move down" aria-label={`Move ${label(item.id)} down`} disabled={i === list.length - 1} onClick={() => updateList(movePublicSection(list, i, 1))} className="h-8 w-8 shrink-0"><ArrowDown /></Button>
              <Button variant="ghost" size="icon" title={item.visible ? "Hide section" : "Show section"} aria-label={`${item.visible ? "Hide" : "Show"} ${label(item.id)}`} aria-pressed={!item.visible} onClick={() => updateList(list.map((s, j) => j === i ? { ...s, visible: !s.visible } : s))} className="h-8 w-8 shrink-0">{item.visible ? <Eye /> : <EyeOff />}</Button>
            </li>)}
          </ol>
          <Button variant="outline" className="mt-4" onClick={() => updateList(page === "home" ? resolveHomeSections([]) : resolvePublicSections({}, page))}><RotateCcw />Reset this page</Button>
        </Card>
      </section>
      <Button disabled={saving} onClick={save}><Save />{saving ? "Saving…" : "Save appearance & layouts"}</Button>
    </div>
  );
}