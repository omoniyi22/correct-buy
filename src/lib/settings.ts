import { supabase } from "@/integrations/supabase/client";

export async function fetchStorefrontConfig() {
  const [s, z, c] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", 1).single(),
    supabase.from("shipping_zones").select("*").order("sort"),
    supabase.from("shipping_cities").select("*").order("sort").order("name"),
  ]);
  if (s.error) throw s.error;
  if (z.error) throw z.error;
  if (c.error) throw c.error;
  const zones = z.data.filter((state) => state.active);
  return { settings: s.data, zones, cities: c.data.filter((city) => city.active && zones.some((state) => state.id === city.state_id)) };
}

export const storeConfigQuery = {
  queryKey: ["store-config"] as const,
  queryFn: fetchStorefrontConfig,
  staleTime: 60_000,
};
