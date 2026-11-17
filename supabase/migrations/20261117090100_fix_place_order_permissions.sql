-- "permission denied for function place_order": checkout calls these RPCs with the service-role key only
-- (they are SECURITY DEFINER and take a caller-supplied user id, so anon/authenticated must never run them).
-- Re-assert the intended grants so they survive a re-created function or a schema re-import.
GRANT USAGE ON SCHEMA public TO service_role;

REVOKE ALL ON FUNCTION public.place_order(uuid, text, text, jsonb, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, text, text, jsonb, text, jsonb, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.confirm_payment(text, boolean, int, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(text, boolean, int, text, jsonb) TO service_role;

-- Called inside place_order / by the server jobs.
GRANT EXECUTE ON FUNCTION public.expire_stale_orders() TO service_role;
GRANT EXECUTE ON FUNCTION public.quote_cart(jsonb, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.quote_cart_city(jsonb, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delivery_city_fee(text, text) TO service_role;

-- Tables the checkout path writes to as service_role.
GRANT ALL ON public.orders, public.order_items, public.order_status_history, public.payments, public.coupons, public.product_variants, public.shipping_zones, public.shipping_cities, public.store_settings TO service_role;
