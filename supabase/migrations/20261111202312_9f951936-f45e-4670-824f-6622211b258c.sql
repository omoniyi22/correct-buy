DO $$ DECLARE definition text; BEGIN
SELECT pg_get_functiondef('public.quote_cart(jsonb,text,text)'::regprocedure) INTO definition;
IF position('p.image_url AS pimg' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected quote function; cannot safely update photos'; END IF;
definition := replace(definition,'p.image_url AS pimg', $replacement$coalesce('/api/public/media/' || (p.image_refs->0->>'storage') || '/' || (p.image_refs->0->>'key'),'') AS pimg$replacement$);
EXECUTE definition;
END $$;