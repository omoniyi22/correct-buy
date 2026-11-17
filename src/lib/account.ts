import { supabase } from "@/integrations/supabase/client";

export const myOrdersQuery = {
  queryKey: ["my-orders"] as const,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, order_items(id)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
};

export const myOrderQuery = (id: string) => ({
  queryKey: ["my-order", id] as const,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*), shipments(*), order_status_history(*), payments(reference, status, provider, created_at), return_requests(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});
