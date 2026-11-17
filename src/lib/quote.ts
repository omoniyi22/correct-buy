import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CartLine } from "@/lib/cart";
import { getVariant } from "@/lib/products";
import { cdnImage } from "@/lib/storage";

export type QuoteLine = {
  variant_id: string;
  ok: boolean;
  removed?: boolean;
  qty: number;
  available: number;
  unit_price: number;
  line_total: number;
  product_name: string;
  product_slug: string;
  variant_name: string;
  sku: string;
  image_url: string;
};
export type Quote = {
  lines: QuoteLine[];
  warnings: string[];
  subtotal: number;
  shipping_fee: number;
  zone_valid: boolean;
  discount: number;
  tax: number;
  total: number;
  coupon: { code: string; valid: boolean; message: string } | null;
  free_shipping_threshold: number;
  currency: string;
};

/** Server-side price + stock check. The cart never trusts prices stored in the browser. */
export function useQuote(lines: CartLine[], zone: string | null, coupon: string, city = "") {
  return useQuery({
    queryKey: ["quote", lines, zone, coupon, city],
    enabled: lines.length > 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const items = lines.map((l) => {
        const seen = getVariant(l.id)?.variant.price;
        return seen === undefined ? { variant_id: l.id, qty: l.qty } : { variant_id: l.id, qty: l.qty, seen_price: seen };
      });
      const { data, error } = await supabase.rpc("quote_cart_city", { _items: items, _zone: zone ?? "", _coupon: coupon, _city: city });
      if (error) throw error;
      const quote = data as unknown as Quote;
      return { ...quote, lines: (quote.lines ?? []).map((l) => ({ ...l, image_url: cdnImage(l.image_url) })) };
    },
  });
}
