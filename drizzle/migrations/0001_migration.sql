
-- ===== Pricing: one quote used by cart, checkout and order placement =====
CREATE OR REPLACE FUNCTION public.quote_cart(_items jsonb, _zone text, _coupon text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  it jsonb; v record; lines jsonb := '[]'::jsonb; warnings jsonb := '[]'::jsonb;
  subtotal int := 0; fee int := 0; discount int := 0; tax int := 0; avail int; q int;
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
    subtotal := subtotal + v.price * q;
    lines := lines || jsonb_build_object('variant_id', v.id, 'ok', q > 0, 'qty', q, 'available', avail,
      'unit_price', v.price, 'line_total', v.price * q, 'product_name', v.pname, 'product_slug', v.pslug,
      'variant_name', v.name, 'sku', v.sku, 'image_url', v.pimg);
  END LOOP;

  IF _zone IS NOT NULL THEN
    SELECT fee INTO fee FROM public.shipping_zones WHERE name = _zone;
    zone_ok := FOUND;
    IF NOT zone_ok THEN fee := 0; END IF;
  END IF;
  IF subtotal >= s.free_shipping_threshold THEN fee := 0; END IF;

  IF nullif(btrim(coalesce(_coupon,'')),'') IS NOT NULL THEN
    SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(btrim(_coupon));
    IF NOT FOUND OR NOT c.active THEN
      coupon_info := jsonb_build_object('code', upper(btrim(_coupon)), 'valid', false, 'message', 'That code is not valid.');
    ELSIF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
      coupon_info := jsonb_build_object('code', c.code, 'valid', false, 'message', 'That code has expired.');
    ELSIF c.usage_limit IS NOT NULL AND c.usage_count >= c.usage_limit THEN
      coupon_info := jsonb_build_object('code', c.code, 'valid', false, 'message', 'That code has been fully used.');
    ELSIF subtotal < c.min_spend THEN
      coupon_info := jsonb_build_object('code', c.code, 'valid', false, 'message', 'Spend at least ' || (c.min_spend/100) || ' to use this code.', 'min_spend', c.min_spend);
    ELSE
      IF c.type = 'percent' THEN discount := (subtotal * LEAST(c.value,100)) / 100;
      ELSIF c.type = 'fixed' THEN discount := LEAST(c.value, subtotal);
      ELSE fee := 0; END IF;
      coupon_info := jsonb_build_object('code', c.code, 'valid', true, 'type', c.type, 'message', 'Code applied.');
    END IF;
  END IF;

  tax := ((subtotal - discount) * s.tax_rate_bp) / 10000;
  RETURN jsonb_build_object('lines', lines, 'warnings', warnings, 'subtotal', subtotal, 'shipping_fee', fee,
    'zone_valid', zone_ok, 'discount', discount, 'tax', tax, 'total', subtotal - discount + fee + tax,
    'coupon', coupon_info, 'free_shipping_threshold', s.free_shipping_threshold, 'currency', s.currency);
END $$;
GRANT EXECUTE ON FUNCTION public.quote_cart(jsonb, text, text) TO anon, authenticated;

-- ===== Order state machine (internal) =====
CREATE OR REPLACE FUNCTION public._order_transition(_order uuid, _to text, _actor text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; allowed text[]; it record;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  allowed := CASE o.status
    WHEN 'PENDING_PAYMENT' THEN ARRAY['PAID','CANCELLED']
    WHEN 'PAID' THEN ARRAY['PROCESSING','CANCELLED']
    WHEN 'PROCESSING' THEN ARRAY['SHIPPED','CANCELLED']
    WHEN 'SHIPPED' THEN ARRAY['DELIVERED']
    WHEN 'DELIVERED' THEN ARRAY['RETURN_REQUESTED']
    WHEN 'RETURN_REQUESTED' THEN ARRAY['REFUNDED','DELIVERED']
    ELSE ARRAY[]::text[] END;
  IF NOT (_to = ANY(allowed)) THEN
    RAISE EXCEPTION 'Cannot move order from % to %', o.status, _to;
  END IF;

  -- stock effects
  IF o.status = 'PENDING_PAYMENT' AND _to = 'CANCELLED' THEN
    FOR it IN SELECT variant_id, qty FROM public.order_items WHERE order_id = o.id AND variant_id IS NOT NULL ORDER BY variant_id LOOP
      UPDATE public.product_variants SET qty_reserved = GREATEST(qty_reserved - it.qty, 0) WHERE id = it.variant_id;
    END LOOP;
  ELSIF o.status = 'PENDING_PAYMENT' AND _to = 'PAID' THEN
    FOR it IN SELECT variant_id, qty FROM public.order_items WHERE order_id = o.id AND variant_id IS NOT NULL ORDER BY variant_id LOOP
      UPDATE public.product_variants SET qty_reserved = GREATEST(qty_reserved - it.qty, 0), qty_on_hand = GREATEST(qty_on_hand - it.qty, 0) WHERE id = it.variant_id;
    END LOOP;
  ELSIF o.status IN ('PAID','PROCESSING') AND _to = 'CANCELLED' THEN
    FOR it IN SELECT variant_id, qty FROM public.order_items WHERE order_id = o.id AND variant_id IS NOT NULL ORDER BY variant_id LOOP
      UPDATE public.product_variants SET qty_on_hand = qty_on_hand + it.qty WHERE id = it.variant_id;
    END LOOP;
    UPDATE public.supplier_orders SET status = 'CANCELLED', updated_at = now() WHERE order_id = o.id AND status IN ('CREATED','SENT','FAILED');
  END IF;

  UPDATE public.orders SET status = _to,
    paid_at = CASE WHEN _to = 'PAID' THEN now() ELSE paid_at END,
    delivered_at = CASE WHEN _to = 'DELIVERED' THEN now() ELSE delivered_at END
  WHERE id = o.id;
  INSERT INTO public.order_status_history (order_id, from_status, to_status, actor, note) VALUES (o.id, o.status, _to, _actor, _note);
  INSERT INTO public.notification_logs (order_id, channel, event, recipient) VALUES
    (o.id, 'email', 'order_' || lower(_to), o.email),
    (o.id, 'sms', 'order_' || lower(_to), o.phone);
END $$;
REVOKE ALL ON FUNCTION public._order_transition(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- Staff-facing transition
CREATE OR REPLACE FUNCTION public.transition_order(_order uuid, _to text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _to = 'PAID' THEN RAISE EXCEPTION 'Orders are only marked paid by a confirmed payment'; END IF;
  PERFORM public._order_transition(_order, _to, coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), 'staff'), _note);
END $$;
REVOKE ALL ON FUNCTION public.transition_order(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_order(uuid, text, text) TO authenticated;

-- Staff: add shipment + mark shipped in one step
CREATE OR REPLACE FUNCTION public.ship_order(_order uuid, _carrier text, _tracking text, _eta date DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF coalesce(btrim(_carrier),'') = '' OR coalesce(btrim(_tracking),'') = '' THEN RAISE EXCEPTION 'Carrier and tracking number are required'; END IF;
  SELECT status INTO st FROM public.orders WHERE id = _order;
  IF st = 'PAID' THEN PERFORM public._order_transition(_order, 'PROCESSING', 'staff', 'Auto before shipping'); END IF;
  INSERT INTO public.shipments (order_id, carrier, tracking_no, estimated_delivery) VALUES (_order, btrim(_carrier), btrim(_tracking), _eta);
  PERFORM public._order_transition(_order, 'SHIPPED', coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), 'staff'), _carrier || ' ' || _tracking);
END $$;
REVOKE ALL ON FUNCTION public.ship_order(uuid, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ship_order(uuid, text, text, date) TO authenticated;

-- Staff: mark delivered (also closes shipments)
CREATE OR REPLACE FUNCTION public.deliver_order(_order uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE public.shipments SET status = 'DELIVERED' WHERE order_id = _order;
  PERFORM public._order_transition(_order, 'DELIVERED', 'staff', NULL);
END $$;
REVOKE ALL ON FUNCTION public.deliver_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deliver_order(uuid) TO authenticated;

-- Abandoned checkouts release their reserved stock after 30 minutes
CREATE OR REPLACE FUNCTION public.expire_stale_orders()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT id FROM public.orders WHERE status = 'PENDING_PAYMENT' AND created_at < now() - interval '30 minutes' ORDER BY created_at FOR UPDATE SKIP LOCKED LOOP
    PERFORM public._order_transition(r.id, 'CANCELLED', 'system', 'Payment window expired');
    UPDATE public.payments SET status = 'FAILED', updated_at = now() WHERE order_id = r.id AND status = 'INITIATED';
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.expire_stale_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_orders() TO anon, authenticated;

-- ===== Place order (server only) =====
CREATE OR REPLACE FUNCTION public.place_order(_user uuid, _email text, _phone text, _items jsonb, _zone text, _address jsonb, _coupon text, _notes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q jsonb; ln jsonb; o public.orders; vid uuid; avail int; s public.store_settings;
BEGIN
  PERFORM public.expire_stale_orders();
  IF jsonb_array_length(coalesce(_items,'[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Your cart is empty'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shipping_zones WHERE name = _zone) THEN RAISE EXCEPTION 'Choose a delivery area'; END IF;
  SELECT * INTO s FROM public.store_settings WHERE id = 1;
  IF s.maintenance_mode THEN RAISE EXCEPTION 'The store is in maintenance — please try again later'; END IF;

  -- lock all variants in a stable order to prevent overselling
  PERFORM 1 FROM public.product_variants WHERE id IN (SELECT (e->>'variant_id')::uuid FROM jsonb_array_elements(_items) e) ORDER BY id FOR UPDATE;
  FOR ln IN SELECT * FROM jsonb_array_elements(_items) LOOP
    vid := (ln->>'variant_id')::uuid;
    SELECT GREATEST(qty_on_hand - qty_reserved, 0) INTO avail FROM public.product_variants WHERE id = vid;
    IF avail IS NULL OR avail < (ln->>'qty')::int THEN
      RAISE EXCEPTION 'Some items just sold out. Please review your cart.';
    END IF;
  END LOOP;

  q := public.quote_cart(_items, _zone, _coupon);
  IF jsonb_array_length(q->'warnings') > 0 AND EXISTS (SELECT 1 FROM jsonb_array_elements(q->'lines') l WHERE NOT (l->>'ok')::boolean) THEN
    RAISE EXCEPTION 'Some items are no longer available. Please review your cart.';
  END IF;
  IF (q->>'subtotal')::int <= 0 THEN RAISE EXCEPTION 'Your cart is empty'; END IF;
  IF q->'coupon' IS NOT NULL AND q->'coupon' <> 'null'::jsonb AND NOT (q->'coupon'->>'valid')::boolean THEN
    RAISE EXCEPTION '%', q->'coupon'->>'message';
  END IF;

  INSERT INTO public.orders (user_id, email, phone, subtotal, shipping_fee, discount, tax, total, currency, coupon_code, shipping_zone, shipping_address, notes)
  VALUES (_user, lower(btrim(_email)), btrim(_phone), (q->>'subtotal')::int, (q->>'shipping_fee')::int, (q->>'discount')::int, (q->>'tax')::int, (q->>'total')::int,
          s.currency, CASE WHEN (q->'coupon'->>'valid')::boolean THEN q->'coupon'->>'code' END, _zone, _address, nullif(btrim(coalesce(_notes,'')),''))
  RETURNING * INTO o;

  INSERT INTO public.order_items (order_id, variant_id, product_name, product_slug, variant_name, sku, image_url, unit_price, qty, supplier_id)
  SELECT o.id, (l->>'variant_id')::uuid, l->>'product_name', l->>'product_slug', l->>'variant_name', l->>'sku', coalesce(l->>'image_url',''),
         (l->>'unit_price')::int, (l->>'qty')::int, pv.supplier_id
  FROM jsonb_array_elements(q->'lines') l JOIN public.product_variants pv ON pv.id = (l->>'variant_id')::uuid
  WHERE (l->>'ok')::boolean;

  UPDATE public.product_variants pv SET qty_reserved = pv.qty_reserved + oi.qty
  FROM public.order_items oi WHERE oi.order_id = o.id AND oi.variant_id = pv.id;

  IF o.coupon_code IS NOT NULL THEN UPDATE public.coupons SET usage_count = usage_count + 1 WHERE code = o.coupon_code; END IF;
  INSERT INTO public.order_status_history (order_id, from_status, to_status, actor, note) VALUES (o.id, NULL, 'PENDING_PAYMENT', 'customer', 'Order placed');

  RETURN jsonb_build_object('order_id', o.id, 'order_number', o.order_number, 'access_token', o.access_token, 'total', o.total, 'currency', o.currency, 'email', o.email);
END $$;
REVOKE ALL ON FUNCTION public.place_order(uuid, text, text, jsonb, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, text, text, jsonb, text, jsonb, text, text) TO service_role;

-- ===== Confirm payment (server only, idempotent) =====
CREATE OR REPLACE FUNCTION public.confirm_payment(_reference text, _success boolean, _amount int, _currency text, _payload jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.payments; o public.orders; grp record; so_id uuid; sup public.suppliers;
BEGIN
  SELECT * INTO p FROM public.payments WHERE reference = _reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown payment reference'; END IF;
  IF p.status = 'SUCCESS' THEN RETURN 'already_processed'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = p.order_id FOR UPDATE;

  IF NOT _success THEN
    UPDATE public.payments SET status = 'FAILED', raw_payload = _payload, updated_at = now() WHERE id = p.id;
    RETURN 'failed';
  END IF;
  IF _amount <> o.total OR upper(_currency) <> upper(o.currency) OR _amount <> p.amount THEN
    UPDATE public.payments SET status = 'FAILED', raw_payload = _payload || jsonb_build_object('mismatch', true), updated_at = now() WHERE id = p.id;
    RETURN 'amount_mismatch';
  END IF;

  UPDATE public.payments SET status = 'SUCCESS', raw_payload = _payload, updated_at = now() WHERE id = p.id;
  IF o.status <> 'PENDING_PAYMENT' THEN
    INSERT INTO public.order_status_history (order_id, from_status, to_status, actor, note)
      VALUES (o.id, o.status, o.status, 'system', 'Payment ' || _reference || ' succeeded after order was ' || o.status || ' — refund needed');
    RETURN 'needs_refund';
  END IF;
  -- other open attempts for this order are void
  UPDATE public.payments SET status = 'FAILED', updated_at = now() WHERE order_id = o.id AND id <> p.id AND status = 'INITIATED';

  PERFORM public._order_transition(o.id, 'PAID', 'payment', 'Payment ' || _reference);

  -- split the order by supplier
  FOR grp IN SELECT supplier_id FROM public.order_items WHERE order_id = o.id GROUP BY supplier_id LOOP
    INSERT INTO public.supplier_orders (order_id, supplier_id, status) VALUES (o.id, grp.supplier_id, 'CREATED')
      ON CONFLICT (order_id, supplier_id) DO NOTHING RETURNING id INTO so_id;
    IF so_id IS NOT NULL THEN
      INSERT INTO public.supplier_order_items (supplier_order_id, order_item_id, supplier_sku, qty, cost_price)
      SELECT so_id, oi.id, pv.supplier_sku, oi.qty, pv.cost_price
      FROM public.order_items oi LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
      WHERE oi.order_id = o.id AND oi.supplier_id IS NOT DISTINCT FROM grp.supplier_id;
      SELECT * INTO sup FROM public.suppliers WHERE id = grp.supplier_id;
      IF FOUND AND sup.integration_type = 'email' AND sup.email IS NOT NULL THEN
        INSERT INTO public.notification_logs (order_id, channel, event, recipient) VALUES (o.id, 'email', 'supplier_po', sup.email);
      END IF;
    END IF;
  END LOOP;
  INSERT INTO public.notification_logs (order_id, channel, event, recipient) VALUES (o.id, 'email', 'admin_new_order', (SELECT support_email FROM public.store_settings WHERE id = 1));
  RETURN 'paid';
END $$;
REVOKE ALL ON FUNCTION public.confirm_payment(text, boolean, int, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(text, boolean, int, text, jsonb) TO service_role;

-- ===== Customer actions =====
CREATE OR REPLACE FUNCTION public.customer_cancel_order(_order uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order;
  IF NOT FOUND OR o.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status NOT IN ('PENDING_PAYMENT','PAID') THEN RAISE EXCEPTION 'This order can no longer be cancelled online — please contact us'; END IF;
  PERFORM public._order_transition(_order, 'CANCELLED', 'customer', 'Cancelled by customer');
  UPDATE public.payments SET status = 'FAILED', updated_at = now() WHERE order_id = _order AND status = 'INITIATED';
END $$;
REVOKE ALL ON FUNCTION public.customer_cancel_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_cancel_order(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_return(_order uuid, _items uuid[], _reason text, _comments text, _photo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; win int; rid uuid;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order;
  IF NOT FOUND OR o.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status <> 'DELIVERED' THEN RAISE EXCEPTION 'Returns open once your order is delivered'; END IF;
  SELECT return_window_days INTO win FROM public.store_settings WHERE id = 1;
  IF o.delivered_at < now() - make_interval(days => win) THEN RAISE EXCEPTION 'The % day return window has closed', win; END IF;
  IF coalesce(array_length(_items,1),0) = 0 THEN RAISE EXCEPTION 'Choose at least one item'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(_items) i WHERE NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.id = i AND oi.order_id = _order)) THEN
    RAISE EXCEPTION 'Invalid item';
  END IF;
  IF coalesce(btrim(_reason),'') = '' THEN RAISE EXCEPTION 'Choose a reason'; END IF;
  INSERT INTO public.return_requests (order_id, user_id, item_ids, reason, comments, photo_url)
    VALUES (_order, auth.uid(), _items, _reason, left(_comments, 2000), _photo) RETURNING id INTO rid;
  PERFORM public._order_transition(_order, 'RETURN_REQUESTED', 'customer', _reason);
  RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.request_return(uuid, uuid[], text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_return(uuid, uuid[], text, text, text) TO authenticated;

-- Staff: process a return. _action in approve|reject|receive|refund
CREATE OR REPLACE FUNCTION public.process_return(_return uuid, _action text, _restock boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.return_requests; it record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO r FROM public.return_requests WHERE id = _return FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Return not found'; END IF;
  IF _action = 'approve' AND r.status = 'REQUESTED' THEN
    UPDATE public.return_requests SET status = 'APPROVED' WHERE id = r.id;
  ELSIF _action = 'reject' AND r.status IN ('REQUESTED','APPROVED') THEN
    UPDATE public.return_requests SET status = 'REJECTED' WHERE id = r.id;
    PERFORM public._order_transition(r.order_id, 'DELIVERED', 'staff', 'Return rejected');
  ELSIF _action = 'receive' AND r.status = 'APPROVED' THEN
    UPDATE public.return_requests SET status = 'RECEIVED', restock = _restock WHERE id = r.id;
  ELSIF _action = 'refund' AND r.status IN ('APPROVED','RECEIVED') THEN
    IF coalesce(_restock, r.restock) THEN
      FOR it IN SELECT variant_id, qty FROM public.order_items WHERE id = ANY(r.item_ids) AND variant_id IS NOT NULL LOOP
        UPDATE public.product_variants SET qty_on_hand = qty_on_hand + it.qty WHERE id = it.variant_id;
        INSERT INTO public.stock_adjustments (variant_id, delta, reason, actor) VALUES (it.variant_id, it.qty, 'Return restock', auth.uid());
      END LOOP;
    END IF;
    UPDATE public.return_requests SET status = 'REFUNDED', restock = coalesce(_restock, r.restock) WHERE id = r.id;
    UPDATE public.payments SET status = 'REFUNDED', updated_at = now() WHERE order_id = r.order_id AND status = 'SUCCESS';
    PERFORM public._order_transition(r.order_id, 'REFUNDED', 'staff', 'Refund issued');
  ELSE
    RAISE EXCEPTION 'Cannot % a return that is %', _action, r.status;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.process_return(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_return(uuid, text, boolean) TO authenticated;

-- Staff overview numbers
CREATE OR REPLACE FUNCTION public.admin_dashboard()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  PERFORM public.expire_stale_orders();
  RETURN jsonb_build_object(
    'orders_today', (SELECT count(*) FROM public.orders WHERE created_at >= date_trunc('day', now()) AND status <> 'PENDING_PAYMENT'),
    'revenue_today', (SELECT coalesce(sum(total),0) FROM public.orders WHERE paid_at >= date_trunc('day', now())),
    'pending_payment', (SELECT count(*) FROM public.orders WHERE status = 'PENDING_PAYMENT'),
    'to_ship', (SELECT count(*) FROM public.orders WHERE status IN ('PAID','PROCESSING')),
    'returns_open', (SELECT count(*) FROM public.return_requests WHERE status IN ('REQUESTED','APPROVED','RECEIVED')),
    'failed_supplier_orders', (SELECT count(*) FROM public.supplier_orders WHERE status = 'FAILED'),
    'open_supplier_orders', (SELECT count(*) FROM public.supplier_orders WHERE status = 'CREATED'),
    'failed_notifications', (SELECT count(*) FROM public.notification_logs WHERE status = 'FAILED'),
    'low_stock', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT pv.id, pv.sku, pv.name, p.name AS product_name, GREATEST(pv.qty_on_hand - pv.qty_reserved,0) AS available, pv.low_stock_threshold
        FROM public.product_variants pv JOIN public.products p ON p.id = pv.product_id
        WHERE pv.qty_on_hand - pv.qty_reserved <= pv.low_stock_threshold ORDER BY 5 LIMIT 10) x)
  );
END $$;
REVOKE ALL ON FUNCTION public.admin_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard() TO authenticated;
