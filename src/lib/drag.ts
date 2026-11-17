import type { DragEvent } from "react";
import { getProduct } from "@/lib/products";

const MIME = "application/x-correctbuy-product";
const FALLBACK = "text/plain";

type Listener = (id: string | null) => void;
const listeners = new Set<Listener>();

function emit(id: string | null) {
  for (const l of listeners) l(id);
}

/** Subscribe to product drags anywhere on the page. Returns an unsubscribe fn. */
export function onProductDrag(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Call from a draggable element's onDragStart. */
export function beginProductDrag(e: DragEvent, id: string) {
  e.dataTransfer.setData(MIME, id);
  e.dataTransfer.setData(FALLBACK, id);
  e.dataTransfer.effectAllowed = "copy";
  const product = getProduct(id);
  if (product && typeof document !== "undefined") {
    const chip = document.createElement("div");
    chip.className = "drag-chip";
    const img = document.createElement("img");
    img.src = product.image;
    const text = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = product.name;
    const price = document.createElement("span");
    price.textContent = `$${product.price} · drop on cart`;
    text.append(name, price);
    chip.append(img, text);
    document.body.appendChild(chip);
    e.dataTransfer.setDragImage?.(chip, 28, 28);
    setTimeout(() => chip.remove(), 0);
  }
  emit(id);
}

/** Call from a draggable element's onDragEnd. */
export function endProductDrag() {
  emit(null);
}

/** True when a drag currently carrying a CorrectBuy product is passing over an element. */
export function carriesProduct(e: DragEvent) {
  return Array.from(e.dataTransfer.types).some((t) => t === MIME || t === FALLBACK);
}

/** Read the dropped product id, or null when the drop is not a product. */
export function droppedProductId(e: DragEvent): string | null {
  e.preventDefault();
  const id = e.dataTransfer.getData(MIME) || e.dataTransfer.getData(FALLBACK);
  return id && getProduct(id) ? id : null;
}
