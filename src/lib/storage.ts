export type ImageRef = { key: string; storage: number };
export function imageRefs(value: unknown): ImageRef[] {
  if (!Array.isArray(value)) return [];
  return value.filter((r): r is ImageRef => !!r && typeof r === "object" && typeof r.key === "string" && !r.key.startsWith("/") && !r.key.split("/").includes("..") && Number.isInteger(r.storage) && r.storage >= 1);
}
const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");
/** Public base URL for a storage bucket, from VITE_BASE_<index> (e.g. VITE_BASE_1). */
export function storageBase(index: number): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const server = typeof process !== "undefined" ? process.env?.[`BASE_${index}`] : undefined;
  return (env[`VITE_BASE_${index}`] ?? server ?? "").trim().replace(/\/+$/, "");
}
export const storage = {
  urlFor(index: number, key: string) {
    const base = storageBase(index);
    // Direct Tigris URL when VITE_BASE_<index> is set; otherwise fall back to the server redirect route.
    return base ? `${base}/${encodeKey(key)}` : `/api/public/media/${index}/${encodeKey(key)}`;
  },
};
export const productImages = (value: unknown) => imageRefs(value).map((r) => storage.urlFor(r.storage, r.key));
/**
 * Rewrites any stored `/api/public/media/<n>/<key>` link (relative or on any host, e.g.
 * https://www.correctbuy.ng/api/public/media/1/catalog/phone-titan.jpg) to the direct CDN URL,
 * so cart, checkout, orders and emails show the same image as the home page. Other URLs pass through.
 */
const MEDIA_PATH = /^(?:https?:\/\/[^/]+)?\/api\/public\/media\/(\d+)\/([^?#]+)/;
export function cdnImage(url: string | null | undefined): string {
  if (!url) return "";
  const m = MEDIA_PATH.exec(url);
  if (!m) return url;
  let key = m[2];
  try { key = decodeURIComponent(key); } catch { /* keep raw key */ }
  return storage.urlFor(Number(m[1]), key);
}
