import { createContext, useContext, type ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { storeConfigQuery } from "@/lib/settings";
import { resolveCardStyle, type ProductCardStyle } from "@/lib/card-style";

const Appearance = createContext<ProductCardStyle>("style-1");
export const useProductCardStyle = () => useContext(Appearance);
export function StoreAppearance({ children }: { children: ReactNode }) {
  const { data } = useSuspenseQuery(storeConfigQuery);
  return <Appearance.Provider value={resolveCardStyle(data.settings.product_card_style)}>{children}</Appearance.Provider>;
}