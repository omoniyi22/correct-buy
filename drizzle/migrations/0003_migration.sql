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
