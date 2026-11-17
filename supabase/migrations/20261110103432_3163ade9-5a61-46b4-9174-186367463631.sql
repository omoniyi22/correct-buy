CREATE OR REPLACE FUNCTION public.quote_cart(_items jsonb, _zone text, _coupon text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  it jsonb; v record; lines jsonb := '[]'::jsonb; warnings jsonb := '[]'::jsonb;
  subtotal bigint := 0; ship_fee bigint := 0; discount bigint := 0; tax bigint := 0; avail int; q int;
  s public.store_settings; c public.coupons; coupon_info jsonb := null; zone_ok boolean := false;
BEGIN
  SELECT * INTO s FROM public.store_settings WHERE id = 1;
  FOR it IN SELECT * FROM jsonb_array_elements(coalesce(_items,'[]'::jsonb)) LOOP
    q := GREATEST(coalesce((it->>'qty')::int, 0), 0);
    SELECT pv.*, p.name AS pname, p.slug AS pslug, p.image_url AS pimg, p.published AS ppub
      INTO v FROM public.product_variants pv JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = (it->>'variant_id')::uuid;
    IF NOT FOUND OR NOT v.ppub THEN
      warnings := warnings || to_jsonb('An item in your cart is no longer available and was removed.'::text);
      lines := lines || jsonb_build_object('variant_id', it->>'variant_id', 'ok', false, 'removed', true, 'qty', 0);
      CONTINUE;
    END IF;
    avail := GREATEST(v.qty_on_hand - v.qty_reserved, 0);
    IF q > avail THEN
      warnings := warnings || to_jsonb(CASE WHEN avail = 0 THEN v.pname || ' is out of stock.' ELSE 'Only ' || avail || ' of ' || v.pname || ' left — quantity updated.' END);
      q := avail;
    END IF;
    IF it ? 'seen_price' AND (it->>'seen_price')::int <> v.price THEN
      warnings := warnings || to_jsonb('The price of ' || v.pname || ' has changed.');
    END IF;
    subtotal := subtotal + v.price::bigint * q;
    lines := lines || jsonb_build_object('variant_id', v.id, 'ok', q > 0, 'qty', q, 'available', avail,
      'unit_price', v.price, 'line_total', v.price::bigint * q, 'product_name', v.pname, 'product_slug', v.pslug,
      'variant_name', v.name, 'sku', v.sku, 'image_url', v.pimg);
  END LOOP;

  IF _zone IS NOT NULL THEN
    SELECT z.fee INTO ship_fee FROM public.shipping_zones z WHERE z.name = _zone;
    zone_ok := FOUND;
    IF NOT zone_ok THEN ship_fee := 0; END IF;
  END IF;
  IF subtotal >= s.free_shipping_threshold THEN ship_fee := 0; END IF;

  IF nullif(btrim(coalesce(_coupon,'')),'') IS NOT NULL THEN
    SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(btrim(_coupon));
    IF NOT FOUND OR NOT c.active THEN
      coupon_info := jsonb_build_object('code', upper(btrim(_coupon)), 'valid', false, 'message', 'That code is not valid.');
    ELSIF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
      coupon_info := jsonb_build_object('code', c.code, 'valid', false, 'message', 'That code has expired.');
    ELSIF c.usage_limit IS NOT NULL AND c.usage_count >= c.usage_limit THEN
      coupon_info := jsonb_build_object('code', c.code, 'valid', false, 'message', 'That code has been fully used.');
    ELSIF subtotal < c.min_spend THEN
      coupon_info := jsonb_build_object('code', c.code, 'valid', false, 'message', 'Spend at least ₦' || to_char(c.min_spend/100, 'FM999,999,999') || ' to use this code.', 'min_spend', c.min_spend);
    ELSE
      IF c.type = 'percent' THEN discount := (subtotal * LEAST(c.value,100)) / 100;
      ELSIF c.type = 'fixed' THEN discount := LEAST(c.value, subtotal);
      ELSE ship_fee := 0; END IF;
      coupon_info := jsonb_build_object('code', c.code, 'valid', true, 'type', c.type, 'message', 'Code applied.');
    END IF;
  END IF;

  tax := ((subtotal - discount) * s.tax_rate_bp) / 10000;
  RETURN jsonb_build_object('lines', lines, 'warnings', warnings, 'subtotal', subtotal, 'shipping_fee', ship_fee,
    'zone_valid', zone_ok, 'discount', discount, 'tax', tax, 'total', subtotal - discount + ship_fee + tax,
    'coupon', coupon_info, 'free_shipping_threshold', s.free_shipping_threshold, 'currency', s.currency);
END $$;

CREATE TABLE public.collections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
 description text NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
 product_ids uuid[] NOT NULL DEFAULT '{}',
 published boolean NOT NULL DEFAULT true,
 sort integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.collections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY collections_public_read ON public.collections FOR SELECT TO anon, authenticated USING (published);
CREATE POLICY collections_staff_all ON public.collections FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.save_catalog_group(_kind text, _id uuid, _slug text, _name text, _description text, _products uuid[], _sort integer, _published boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_id uuid;
BEGIN
 IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
 _id := NULLIF(_id, '00000000-0000-0000-0000-000000000000'::uuid);
 IF _kind IS NULL OR _kind NOT IN ('category','collection') THEN RAISE EXCEPTION 'Invalid group'; END IF;
 IF _slug IS NULL OR _name IS NULL OR _description IS NULL OR _products IS NULL OR _sort IS NULL OR _published IS NULL OR _slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(_slug) > 120 OR length(btrim(_name)) NOT BETWEEN 1 AND 120 OR length(_description) > 2000 OR _sort < 0 THEN RAISE EXCEPTION 'Enter a valid name, URL slug and description'; END IF;
 IF EXISTS (SELECT 1 FROM unnest(_products) p WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE id = p)) THEN RAISE EXCEPTION 'Product not found'; END IF;
 IF _kind = 'collection' THEN
  IF _id IS NULL THEN
   INSERT INTO public.collections(slug,name,description,product_ids,sort,published) VALUES (_slug,btrim(_name),_description,_products,_sort,_published) RETURNING id INTO result_id;
  ELSE
   UPDATE public.collections SET slug=_slug,name=btrim(_name),description=_description,product_ids=_products,sort=_sort,published=_published WHERE id=_id RETURNING id INTO result_id;
  END IF;
 ELSE
  IF _id IS NULL THEN
   INSERT INTO public.categories(slug,name,description,sort) VALUES (_slug,btrim(_name),_description,_sort) RETURNING id INTO result_id;
  ELSE
   UPDATE public.categories SET slug=_slug,name=btrim(_name),description=_description,sort=_sort WHERE id=_id RETURNING id INTO result_id;
  END IF;
  IF result_id IS NULL THEN RAISE EXCEPTION 'Group not found'; END IF;
  UPDATE public.products SET category_id=NULL,updated_at=now() WHERE category_id=result_id AND NOT (id=ANY(_products));
  UPDATE public.products SET category_id=result_id,updated_at=now() WHERE id=ANY(_products);
 END IF;
 IF result_id IS NULL THEN RAISE EXCEPTION 'Group not found'; END IF;
 RETURN result_id;
END $$;
REVOKE ALL ON FUNCTION public.save_catalog_group(text,uuid,text,text,text,uuid[],integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_catalog_group(text,uuid,text,text,text,uuid[],integer,boolean) TO authenticated;

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

INSERT INTO public.shipping_cities (state_id, name, sort)
SELECT z.id, c.name, c.sort FROM public.shipping_zones z JOIN (VALUES
 ('Lagos','Ikeja',1),('Lagos','Lekki',2),('Lagos','Victoria Island',3),('Lagos','Surulere',4),('Lagos','Yaba',5),
 ('Abuja (FCT)','Garki',1),('Abuja (FCT)','Wuse',2),('Abuja (FCT)','Maitama',3),
 ('Rivers','Port Harcourt',1),('Oyo','Ibadan',1),('Other states','Main city',1)
) AS c(state,name,sort) ON c.state = z.name;

CREATE TABLE public.hero_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eyebrow text NOT NULL DEFAULT '',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT 'Shop now',
  cta_href text NOT NULL DEFAULT '/shop',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hero_promotions TO authenticated;
GRANT ALL ON public.hero_promotions TO service_role;
ALTER TABLE public.hero_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions public read" ON public.hero_promotions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff manage promotions" ON public.hero_promotions FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.hero_carousels (
  id text PRIMARY KEY CHECK (id IN ('featured','main')),
  enabled boolean NOT NULL DEFAULT true,
  autoplay boolean NOT NULL DEFAULT true,
  interval_ms int NOT NULL DEFAULT 5000 CHECK (interval_ms BETWEEN 1500 AND 30000),
  product_count int NOT NULL DEFAULT 4 CHECK (product_count BETWEEN 0 AND 12),
  promo_count int NOT NULL DEFAULT 1 CHECK (promo_count BETWEEN 0 AND 6),
  product_ids uuid[] NOT NULL DEFAULT '{}',
  promo_ids uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_carousels TO anon, authenticated;
GRANT UPDATE ON public.hero_carousels TO authenticated;
GRANT ALL ON public.hero_carousels TO service_role;
ALTER TABLE public.hero_carousels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carousels public read" ON public.hero_carousels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff update carousels" ON public.hero_carousels FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO public.hero_promotions (id, eyebrow, title, body, cta_label, cta_href) VALUES
  ('00000000-0000-4000-8000-000000000001', 'The CorrectBuy edit', 'Find your next favourite.', 'Tech, footwear and everyday gear. Discover the CorrectBuy collection.', 'Shop the collection', '/shop');
INSERT INTO public.hero_carousels (id, product_count, promo_count, promo_ids) VALUES
  ('featured', 4, 1, ARRAY['00000000-0000-4000-8000-000000000001'::uuid]),
  ('main', 4, 0, '{}');

CREATE TABLE public.tags (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.tags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Staff manage tags" ON public.tags FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
ALTER TABLE public.products ADD COLUMN tag_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tags ADD COLUMN color text NOT NULL DEFAULT '#493533';
INSERT INTO public.tags (name, color) VALUES ('New','#1c8742'), ('Fairly used','#f0b135'), ('UK used','#ee3533');

COMMENT ON SCHEMA public IS 'CorrectBuy store schema';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS home_sections jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS product_card_style text NOT NULL DEFAULT 'style-1';
ALTER TABLE public.store_settings ADD CONSTRAINT store_settings_product_card_style_check CHECK (product_card_style IN ('style-1', 'style-2', 'style-3'));
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS public_sections jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE public.store_settings SET support_email = 'info@correctbuy.ng' WHERE id = 1;

CREATE OR REPLACE FUNCTION public.is_store_owner(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS (SELECT 1 FROM auth.users WHERE id=_user_id AND lower(email)='omoniyioluwaseun22@gmail.com' AND email_confirmed_at IS NOT NULL) $$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) AND (_role <> 'admin' OR public.is_store_owner(_user_id)) $$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'staff') $$;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.profiles (id,full_name,phone,email,marketing_opt_in) VALUES (NEW.id,NEW.raw_user_meta_data->>'full_name',NEW.raw_user_meta_data->>'phone',NEW.email,COALESCE((NEW.raw_user_meta_data->>'marketing_opt_in')::boolean,false)) ON CONFLICT(id) DO NOTHING; IF lower(NEW.email)='omoniyioluwaseun22@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'admin') ON CONFLICT DO NOTHING; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.assign_verified_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF public.is_store_owner(NEW.id) THEN INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'admin') ON CONFLICT DO NOTHING; ELSE DELETE FROM public.user_roles WHERE user_id=NEW.id AND role='admin'; END IF; RETURN NEW; END $$;
CREATE TRIGGER assign_verified_store_owner AFTER UPDATE OF email,email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_verified_owner();
CREATE OR REPLACE FUNCTION public.validate_admin_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NEW.role='admin' AND NOT public.is_store_owner(NEW.user_id) THEN RAISE EXCEPTION 'Only the verified store owner may be an administrator'; END IF; RETURN NEW; END $$;
CREATE TRIGGER validate_admin_owner BEFORE INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.validate_admin_owner();
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_verified_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_admin_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_order_delivery() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.blog_posts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), author_id uuid NOT NULL DEFAULT auth.uid(), title text NOT NULL DEFAULT '', slug text NOT NULL UNIQUE, excerpt text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '', cover_url text NOT NULL DEFAULT '', category text NOT NULL DEFAULT 'Buying guides', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published blog posts are public" ON public.blog_posts FOR SELECT TO anon,authenticated USING(status='published');
CREATE POLICY "Owner manages all blog posts" ON public.blog_posts FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE INDEX blog_posts_public_date ON public.blog_posts(status,created_at DESC);
CREATE TABLE public.ai_feature_access (feature text PRIMARY KEY, blocked boolean NOT NULL DEFAULT false, reason text NOT NULL DEFAULT '', status integer NOT NULL DEFAULT 403, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.ai_feature_access TO service_role;
ALTER TABLE public.ai_feature_access ENABLE ROW LEVEL SECURITY;