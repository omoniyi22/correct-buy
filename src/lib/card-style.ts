export type ProductCardStyle = "style-1" | "style-2" | "style-3";
export const resolveCardStyle = (value: unknown): ProductCardStyle => value === "style-2" || value === "style-3" ? value : "style-1";
export function discountPercent(price: number, compareAt: number | null) {
  return compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : null;
}