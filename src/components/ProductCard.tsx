import { formatMoney } from "@/lib/money";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { GripVertical, Plus, Check, Star, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { tagColor, totalAvailable, type Product } from "@/lib/products";
import { chipStyle } from "@/lib/badge";
import { track } from "@/lib/analytics";
import { cart } from "@/lib/cart";
import { beginProductDrag, endProductDrag } from "@/lib/drag";
import { Button } from "@/components/ui/button";
import { useProductCardStyle } from "@/components/StoreAppearance";
import { discountPercent, type ProductCardStyle } from "@/lib/card-style";

export function ProductCard({ product, style, preview = false }: { product: Product; style?: ProductCardStyle; preview?: boolean }) {
  const selectedStyle = useProductCardStyle();
  const [dragging, setDragging] = useState(false);
  const [added, setAdded] = useState(false);
  const soldOut = totalAvailable(product) <= 0;
  const discount = discountPercent(product.price, product.compareAt);

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (preview) return;
    if (soldOut) return;
    cart.add(product.id);
    track("add_to_cart", { value: product.price, items: [{ item_id: product.id, item_name: product.name, price: product.price / 100, quantity: 1 }] });
    toast.success(`${product.name} added to your cart`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  if ((style ?? selectedStyle) === "style-3") return (
    <div data-product-card-style="style-3" draggable={!preview}
      onDragStart={(e) => { beginProductDrag(e, product.id); setDragging(true); }}
      onDragEnd={() => { endProductDrag(); setDragging(false); }}
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-shadow hover:shadow-lg ${dragging ? "opacity-40" : ""}`}>
      <Link to="/p/$slug" params={{ slug: product.id }} draggable={false} tabIndex={preview ? -1 : undefined} onClick={(e) => { if (preview) e.preventDefault(); }} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <img src={product.image} alt={product.name} loading="lazy" width={1024} height={1024} draggable={false} className="h-full w-full object-contain transition-transform duration-500 motion-safe:group-hover:scale-105" />
          {discount !== null && <span className="absolute left-2 top-2 rounded bg-success px-2 py-1 text-xs font-bold text-success-foreground">-{discount}%</span>}
          {product.tags.length > 0 && <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">{product.tags.map((t) => <span key={t} style={chipStyle(tagColor(t))} className="rounded px-2 py-0.5 text-[10px] font-semibold">{t}</span>)}</div>}
        </div>
        <div className="px-3 pt-3 sm:px-4">
          <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{product.brand || product.category}</p>
          <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 sm:min-h-12 sm:text-base sm:leading-6">{product.name}</h3>
        </div>
      </Link>
      <div className="mt-auto space-y-3 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <div className="min-h-11">
          <p className="break-words font-display text-base font-bold sm:text-xl">{formatMoney(product.price)}</p>
          {discount !== null && <p className="text-xs text-muted-foreground line-through">{formatMoney(product.compareAt ?? product.price)}</p>}
        </div>
        <Button type="button" disabled={soldOut || preview} onClick={quickAdd} aria-label={`Add ${product.name} to cart`} className="h-10 w-full gap-1.5 px-2 text-xs sm:text-sm">
          {added ? <Check className="h-4 w-4 shrink-0" /> : <ShoppingBag className="h-4 w-4 shrink-0" />}{soldOut ? "Sold out" : added ? "Added" : "Add to cart"}
        </Button>
      </div>
    </div>
  );

  if ((style ?? selectedStyle) === "style-2") return (
    <div data-product-card-style="style-2" draggable={!preview}
      onDragStart={(e) => { beginProductDrag(e, product.id); setDragging(true); }}
      onDragEnd={() => { endProductDrag(); setDragging(false); }}
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-background text-reference-ink transition-shadow hover:shadow-lg ${dragging ? "opacity-40" : ""}`}>
      <Link to="/p/$slug" params={{ slug: product.id }} draggable={false} tabIndex={preview ? -1 : undefined} onClick={(e) => { if (preview) e.preventDefault(); }}>
        <div className="flex aspect-square items-center justify-center border-b border-border bg-background px-2.5 py-9">
          <img src={product.image} alt={product.name} loading="lazy" width={1024} height={1024} draggable={false} className="h-full w-full object-contain" />
        </div>
        <h3 className="mx-3 mt-3 line-clamp-2 min-h-12 font-reference text-base font-normal leading-6 sm:text-lg">{product.name}</h3>
      </Link>
      <Button variant="ghost" size="icon" type="button" disabled={soldOut || preview} onClick={quickAdd} aria-label={`Add ${product.name} to cart`} title={soldOut ? "Sold out" : "Add to cart"}
        className="absolute right-2.5 top-2.5 h-11 w-11 rounded-full bg-quick-add text-quick-add-foreground hover:bg-quick-add/90 hover:text-quick-add-foreground sm:h-12 sm:w-12 [&_svg]:size-6">
        {added ? <Check /> : <Plus />}
      </Button>
      <div className="mx-3 mb-3 mt-auto pt-1 font-reference">
        <div className="mb-2 flex h-5 items-center gap-1 text-xs text-muted-foreground sm:text-sm"><Star className="h-3.5 w-3.5 text-rating" /><span>No reviews yet</span></div>
        <p className="break-words text-lg font-bold leading-tight sm:text-2xl">{formatMoney(product.price)}</p>
        <div className="mt-1 flex min-h-6 flex-wrap items-center gap-1.5">
          {discount !== null && <><span className="text-xs text-muted-foreground line-through sm:text-sm">{formatMoney(product.compareAt ?? product.price)}</span><span className="rounded px-1.5 py-0.5 font-sans text-xs font-semibold text-success-foreground bg-success">-{discount}%</span></>}
          {soldOut && <span className="text-xs text-muted-foreground">Sold out</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div
      data-product-card-style="style-1"
      draggable={!preview}
      onDragStart={(e) => {
        beginProductDrag(e, product.id);
        setDragging(true);
      }}
      onDragEnd={() => {
        endProductDrag();
        setDragging(false);
      }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-background transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-grab active:cursor-grabbing ${
        dragging ? "scale-95 border-dashed border-primary opacity-40" : ""
      }`}
    >
      <Link to="/p/$slug" params={{ slug: product.id }} className="block" draggable={false} tabIndex={preview ? -1 : undefined} onClick={(e) => { if (preview) e.preventDefault(); }}>
        <div className="relative bg-muted">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width={1024}
            height={1024}
            draggable={false}
            className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 hidden rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground backdrop-blur sm:inline-flex">
            {product.category}
          </span>
          {product.tags.length > 0 && (
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap justify-start gap-1">
              {product.tags.map((t) => (
                <span key={t} style={chipStyle(tagColor(t))} className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">{t}</span>
              ))}
            </div>
          )}
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-secondary/85 px-2.5 py-1 text-[11px] font-medium text-secondary-foreground opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
            <GripVertical className="h-3 w-3" /> Drag to cart
          </span>
        </div>
        <div className="px-3 pt-3 sm:px-4">
          {product.brand && (
            <p className="mb-1">
              <span className="inline-flex rounded-full bg-brand-badge px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-badge-foreground">
                {product.brand}
              </span>
            </p>
          )}
          <h3 className="line-clamp-2 text-base font-bold leading-tight sm:text-lg">{product.name}</h3>
        </div>
      </Link>
      <div className="mt-auto grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 px-3 pb-3 pt-2 sm:px-4">
        <div className="min-w-0">
          {product.variants.length > 1 && <p className="text-[11px] text-muted-foreground">From</p>}
          <p className="break-words font-display text-sm font-bold sm:text-lg lg:text-xl">{formatMoney(product.price)}</p>
          {product.compareAt && product.compareAt > product.price && <p className="text-xs text-muted-foreground line-through">{formatMoney(product.compareAt)}</p>}
        </div>
        <Button size="icon"
          type="button"
          onClick={quickAdd}
          disabled={soldOut || preview}
          aria-label={`Add ${product.name} to cart`}
          className="h-9 w-9 shrink-0 rounded-full disabled:bg-muted disabled:text-muted-foreground transition-transform hover:scale-105 active:scale-95"
        >
          {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span className="sr-only">{soldOut ? "Sold out" : added ? "Added" : "Add"}</span>
        </Button>
      </div>
    </div>
  );
}
