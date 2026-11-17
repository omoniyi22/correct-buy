// Commerce events (view_item, add_to_cart, begin_checkout, purchase) go to a GA4-style
// dataLayer. Connect GA4 / Meta Pixel by loading their tag; nothing else needs to change.
type Item = { item_id: string; item_name: string; price: number; quantity: number };

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function track(event: "view_item" | "add_to_cart" | "begin_checkout" | "purchase", data: { value: number; currency?: string; items: Item[]; transaction_id?: string }) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ecommerce: { currency: "NGN", ...data, value: data.value / 100 } });
}
