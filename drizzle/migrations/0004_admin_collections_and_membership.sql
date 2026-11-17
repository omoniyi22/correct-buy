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
 IF _kind NOT IN ('category','collection') THEN RAISE EXCEPTION 'Invalid group'; END IF;
 IF _slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(_slug) > 120 OR length(btrim(_name)) NOT BETWEEN 1 AND 120 OR length(_description) > 2000 THEN RAISE EXCEPTION 'Enter a valid name, URL slug and description'; END IF;
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
