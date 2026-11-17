ALTER TABLE public.shipping_zones ADD COLUMN active boolean NOT NULL DEFAULT true;
CREATE TABLE public.shipping_cities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 state_id uuid NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
 fee integer CHECK (fee >= 0),
 active boolean NOT NULL DEFAULT true,
 sort integer NOT NULL DEFAULT 0,
 UNIQUE(state_id,name)
);
GRANT SELECT ON public.shipping_cities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shipping_cities TO authenticated;
GRANT ALL ON public.shipping_cities TO service_role;
ALTER TABLE public.shipping_cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active cities public read" ON public.shipping_cities FOR SELECT TO anon,authenticated USING (active AND EXISTS(SELECT 1 FROM public.shipping_zones s WHERE s.id=state_id AND s.active));
CREATE POLICY "admin manage cities" ON public.shipping_cities FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
DROP POLICY "zones public read" ON public.shipping_zones;
CREATE POLICY "active states public read" ON public.shipping_zones FOR SELECT TO anon,authenticated USING(active);
CREATE OR REPLACE FUNCTION public.delivery_city_fee(_state text,_city text) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(c.fee,s.fee) FROM public.shipping_zones s JOIN public.shipping_cities c ON c.state_id=s.id WHERE s.name=_state AND c.name=_city AND s.active AND c.active
$$;
REVOKE ALL ON FUNCTION public.delivery_city_fee(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delivery_city_fee(text,text) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.quote_cart_city(_items jsonb,_zone text,_coupon text,_city text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE q jsonb; f integer; valid boolean;
BEGIN
 q:=public.quote_cart(_items,_zone,_coupon);
 IF nullif(_city,'') IS NULL THEN
  SELECT fee INTO f FROM public.shipping_zones WHERE name=_zone AND active;
 ELSE
  f:=public.delivery_city_fee(_zone,_city);
 END IF;
 valid:=f IS NOT NULL;
 IF NOT valid THEN f:=0; END IF;
 IF (q->>'subtotal')::bigint >= (q->>'free_shipping_threshold')::bigint OR (coalesce((q->'coupon'->>'valid')::boolean,false) AND q->'coupon'->>'type'='free_shipping') THEN f:=0; END IF;
 RETURN q || jsonb_build_object('zone_valid',valid,'shipping_fee',f,'total',(q->>'total')::bigint-(q->>'shipping_fee')::bigint+f);
END $$;
REVOKE ALL ON FUNCTION public.quote_cart_city(jsonb,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_cart_city(jsonb,text,text,text) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.validate_order_delivery() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f integer; threshold integer; free_coupon boolean;
BEGIN
 IF NEW.shipping_address->>'state' IS DISTINCT FROM NEW.shipping_zone THEN RAISE EXCEPTION 'Delivery state does not match'; END IF;
 f:=public.delivery_city_fee(NEW.shipping_zone,NEW.shipping_address->>'city');
 IF f IS NULL THEN RAISE EXCEPTION 'Choose an active state and city for delivery'; END IF;
 SELECT free_shipping_threshold INTO threshold FROM public.store_settings WHERE id=1;
 SELECT active AND type='free_shipping' INTO free_coupon FROM public.coupons WHERE code=NEW.coupon_code;
 IF NEW.subtotal >= threshold OR coalesce(free_coupon,false) THEN f:=0; END IF;
 NEW.total:=NEW.total-NEW.shipping_fee+f;
 NEW.shipping_fee:=f;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_order_delivery() FROM PUBLIC;
CREATE TRIGGER validate_order_delivery BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.validate_order_delivery();