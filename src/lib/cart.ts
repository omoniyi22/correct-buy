import { useSyncExternalStore } from "react";
import { getProduct, defaultVariant, getVariant } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";

/** One cart line per product variant. `id` is the variant id. */
export type CartLine = { id: string; qty: number };
const KEY = "correctbuy-cart";
const COUPON_KEY = "correctbuy-coupon";
const EMPTY: CartLine[] = [];
let lines: CartLine[] = EMPTY;
let loaded = false;
let userId: string | null = null;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    lines = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    lines = [];
  }
}
function set(next: CartLine[], sync = true) {
  lines = next.filter((l) => l.qty > 0);
  localStorage.setItem(KEY, JSON.stringify(lines));
  subs.forEach((f) => f());
  if (sync) void pushToAccount();
}

/** Accepts a variant id, or a product slug (adds that product's default variant). */
function resolve(idOrSlug: string): string | null {
  if (getVariant(idOrSlug)) return idOrSlug;
  const p = getProduct(idOrSlug);
  const v = p ? defaultVariant(p) : undefined;
  return v?.id ?? (idOrSlug.length === 36 ? idOrSlug : null);
}

async function pushToAccount() {
  if (!userId) return;
  const uid = userId;
  const ids = lines.map((l) => l.id);
  const del = supabase.from("cart_items").delete().eq("user_id", uid);
  await (ids.length ? del.not("variant_id", "in", `(${ids.join(",")})`) : del);
  if (lines.length)
    await supabase
      .from("cart_items")
      .upsert(lines.map((l) => ({ user_id: uid, variant_id: l.id, qty: l.qty, updated_at: new Date().toISOString() })));
}

/** On sign-in: merge the guest cart into the saved account cart. On sign-out: keep the device cart. */
export async function attachCartToUser(uid: string | null) {
  load();
  if (uid === userId) return;
  userId = uid;
  if (!uid) return;
  const { data } = await supabase.from("cart_items").select("variant_id, qty").eq("user_id", uid);
  const merged = new Map<string, number>();
  for (const r of data ?? []) merged.set(r.variant_id, r.qty);
  for (const l of lines) merged.set(l.id, Math.max(merged.get(l.id) ?? 0, l.qty));
  set(Array.from(merged, ([id, qty]) => ({ id, qty })));
}

export const cart = {
  add: (idOrSlug: string, qty = 1) => {
    load();
    const id = resolve(idOrSlug);
    if (!id) return;
    const ex = lines.find((l) => l.id === id);
    set(ex ? lines.map((l) => (l.id === id ? { ...l, qty: l.qty + qty } : l)) : [...lines, { id, qty }]);
  },
  setQty: (id: string, qty: number) => {
    load();
    set(lines.map((l) => (l.id === id ? { ...l, qty } : l)));
  },
  remove: (id: string) => {
    load();
    set(lines.filter((l) => l.id !== id));
  },
  /** Replace with server-corrected quantities (stock changed). */
  replace: (next: CartLine[]) => {
    load();
    set(next);
  },
  clear: () => {
    loaded = true;
    set([]);
    if (typeof window !== "undefined") localStorage.removeItem(COUPON_KEY);
  },
  getCoupon: () => (typeof window === "undefined" ? "" : localStorage.getItem(COUPON_KEY) || ""),
  setCoupon: (code: string) => {
    if (code) localStorage.setItem(COUPON_KEY, code);
    else localStorage.removeItem(COUPON_KEY);
  },
};

export function useCart() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => {
      load();
      return lines;
    },
    () => EMPTY,
  );
}
