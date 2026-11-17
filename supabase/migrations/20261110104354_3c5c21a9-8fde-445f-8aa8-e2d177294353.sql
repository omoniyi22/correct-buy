CREATE OR REPLACE FUNCTION public.export_schema_sql()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  out text := '';
  r record;
  cols text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;

  out := out || '-- CorrectBuy database schema' || E'\n' || '-- Generated ' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC from the live database.' || E'\n'
             || '-- Paste into the Supabase SQL Editor of an empty project and run.' || E'\n\n'
             || 'CREATE EXTENSION IF NOT EXISTS pgcrypto;' || E'\n\n';

  -- Enum types
  out := out || '-- ===== Types =====' || E'\n';
  FOR r IN
    SELECT t.typname, string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS labels
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' GROUP BY t.typname ORDER BY t.typname
  LOOP
    out := out || format('CREATE TYPE public.%I AS ENUM (%s);', r.typname, r.labels) || E'\n';
  END LOOP;

  -- Sequences
  out := out || E'\n-- ===== Sequences =====\n';
  FOR r IN
    SELECT c.relname, s.seqstart, s.seqincrement FROM pg_class c JOIN pg_sequence s ON s.seqrelid = c.oid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'S'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype IN ('a','i'))
    ORDER BY c.relname
  LOOP
    out := out || format('CREATE SEQUENCE IF NOT EXISTS public.%I START %s INCREMENT %s;', r.relname, r.seqstart, r.seqincrement) || E'\n';
  END LOOP;

  -- Tables (columns + primary/unique/check constraints)
  out := out || E'\n-- ===== Tables =====\n';
  FOR r IN
    SELECT c.oid, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname
  LOOP
    SELECT string_agg(
             format('  %I %s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
               CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END,
               CASE WHEN ad.adbin IS NOT NULL THEN ' DEFAULT ' || pg_get_expr(ad.adbin, ad.adrelid) ELSE '' END),
             E',\n' ORDER BY a.attnum)
      INTO cols
    FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
    WHERE a.attrelid = r.oid AND a.attnum > 0 AND NOT a.attisdropped;

    SELECT cols || coalesce(E',\n' || string_agg(format('  CONSTRAINT %I %s', con.conname, pg_get_constraintdef(con.oid)), E',\n' ORDER BY con.contype DESC, con.conname), '')
      INTO cols
    FROM pg_constraint con WHERE con.conrelid = r.oid AND con.contype IN ('p','u','c');

    out := out || format('CREATE TABLE public.%I (', r.relname) || E'\n' || cols || E'\n);\n';
  END LOOP;

  -- Foreign keys (relationships) after all tables exist
  out := out || E'\n-- ===== Relationships =====\n';
  FOR r IN
    SELECT c.relname, con.conname, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND con.contype = 'f' ORDER BY c.relname, con.conname
  LOOP
    out := out || format('ALTER TABLE public.%I ADD CONSTRAINT %I %s;', r.relname, r.conname, r.def) || E'\n';
  END LOOP;

  -- Indexes not backing constraints
  out := out || E'\n-- ===== Indexes =====\n';
  FOR r IN
    SELECT pg_get_indexdef(i.indexrelid) AS def
    FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = i.indexrelid)
    ORDER BY c.relname, 1
  LOOP
    out := out || r.def || ';' || E'\n';
  END LOOP;

  -- Functions
  out := out || E'\n-- ===== Functions =====\n';
  FOR r IN
    SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
    ORDER BY p.proname
  LOOP
    out := out || pg_get_functiondef(r.oid) || ';' || E'\n\n';
  END LOOP;

  -- Views
  out := out || '-- ===== Views =====' || E'\n';
  FOR r IN
    SELECT c.relname, pg_get_viewdef(c.oid, true) AS def, c.reloptions FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v' ORDER BY c.relname
  LOOP
    out := out || format('CREATE OR REPLACE VIEW public.%I%s AS', r.relname,
             CASE WHEN r.reloptions IS NOT NULL THEN ' WITH (' || array_to_string(r.reloptions, ', ') || ')' ELSE '' END)
           || E'\n' || r.def || E'\n\n';
  END LOOP;

  -- Triggers (including auth.users signup hooks)
  out := out || '-- ===== Triggers =====' || E'\n';
  FOR r IN
    SELECT pg_get_triggerdef(t.oid) AS def FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid JOIN pg_namespace pn ON pn.oid = p.pronamespace
    WHERE NOT t.tgisinternal AND (n.nspname = 'public' OR pn.nspname = 'public') ORDER BY 1
  LOOP
    out := out || r.def || ';' || E'\n';
  END LOOP;

  -- Row level security + policies
  out := out || E'\n-- ===== Row level security =====\n';
  FOR r IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity ORDER BY c.relname
  LOOP
    out := out || format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.relname) || E'\n';
  END LOOP;
  out := out || E'\n-- ===== Policies =====\n';
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies
    WHERE schemaname IN ('public','storage') ORDER BY schemaname, tablename, policyname
  LOOP
    out := out || format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
      r.policyname, r.schemaname, r.tablename, r.permissive, r.cmd,
      array_to_string(ARRAY(SELECT quote_ident(x) FROM unnest(r.roles) x), ', '),
      CASE WHEN r.qual IS NOT NULL THEN ' USING (' || r.qual || ')' ELSE '' END,
      CASE WHEN r.with_check IS NOT NULL THEN ' WITH CHECK (' || r.with_check || ')' ELSE '' END) || E'\n';
  END LOOP;

  -- Grants
  out := out || E'\n-- ===== Permissions =====\n';
  FOR r IN
    SELECT table_name, grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privs
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee IN ('anon','authenticated','service_role')
    GROUP BY table_name, grantee ORDER BY table_name, grantee
  LOOP
    out := out || format('GRANT %s ON public.%I TO %I;', r.privs, r.table_name, r.grantee) || E'\n';
  END LOOP;
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS a, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS u
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prokind = 'f' ORDER BY p.proname
  LOOP
    out := out || format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated;', r.proname, r.args) || E'\n';
    IF r.a THEN out := out || format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon;', r.proname, r.args) || E'\n'; END IF;
    IF r.u THEN out := out || format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated;', r.proname, r.args) || E'\n'; END IF;
    out := out || format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role;', r.proname, r.args) || E'\n';
  END LOOP;

  RETURN out;
END $$;
REVOKE ALL ON FUNCTION public.export_schema_sql() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_schema_sql() TO authenticated;