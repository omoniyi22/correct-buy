CREATE TABLE public.storage_state (id integer PRIMARY KEY DEFAULT 1 CHECK (id=1), active_index integer NOT NULL DEFAULT 1 CHECK(active_index>=1), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.storage_state TO service_role;
ALTER TABLE public.storage_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY storage_service ON public.storage_state FOR ALL TO service_role USING(true) WITH CHECK(true);
INSERT INTO public.storage_state(id,active_index) VALUES(1,1);
CREATE FUNCTION public.touch_storage_state() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER touch_storage_state BEFORE UPDATE ON public.storage_state FOR EACH ROW EXECUTE FUNCTION public.touch_storage_state();
ALTER TABLE public.products ADD COLUMN image_refs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(image_refs)='array');