ALTER TABLE public.tags ADD COLUMN color text NOT NULL DEFAULT '#493533';
UPDATE public.tags SET color = '#ee3533' WHERE name = 'UK used';
UPDATE public.tags SET color = '#1c8742' WHERE name = 'New';
UPDATE public.tags SET color = '#f0b135' WHERE name = 'Fairly used';