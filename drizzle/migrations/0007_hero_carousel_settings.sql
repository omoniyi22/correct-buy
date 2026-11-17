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