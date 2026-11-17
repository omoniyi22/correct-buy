CREATE TABLE public.tags (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.tags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Staff manage tags" ON public.tags FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
ALTER TABLE public.products ADD COLUMN tag_ids uuid[] NOT NULL DEFAULT '{}';
INSERT INTO public.tags (name) VALUES ('New'), ('Fairly used'), ('UK used');