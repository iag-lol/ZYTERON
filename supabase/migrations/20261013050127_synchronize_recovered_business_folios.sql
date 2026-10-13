-- Original folio generators also use free-standing sequences (not identity columns).
-- Discover each sequence through the actual column default/function dependency.
DO $$
DECLARE r record; highest bigint; current_value bigint; was_called boolean; increment bigint; next_value bigint;
BEGIN
  FOR r IN
    WITH generators AS MATERIALIZED (
      SELECT c.relname table_name,a.attname column_name,
        (regexp_match(pg_get_functiondef(p.oid),$rx$nextval\('([^']+)'$rx$))[1] sequence_name
      FROM pg_attrdef d JOIN pg_class c ON c.oid=d.adrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=d.adnum
      JOIN pg_proc p ON p.prokind='f' AND p.pronargs=0
      JOIN pg_namespace pn ON pn.oid=p.pronamespace AND pn.nspname='public'
      WHERE n.nspname='public' AND c.relkind='r'
        AND strpos(pg_get_expr(d.adbin,d.adrelid),p.proname||'(')>0
    ) SELECT DISTINCT * FROM generators WHERE sequence_name IS NOT NULL ORDER BY table_name,column_name
  LOOP
    EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',r.table_name);
    EXECUTE format('SELECT max(substring(%I::text FROM ''([0-9]+)$'')::bigint) FROM public.%I',r.column_name,r.table_name) INTO highest;
    EXECUTE format('SELECT last_value,is_called FROM %s',r.sequence_name::regclass) INTO current_value,was_called;
    SELECT seqincrement INTO increment FROM pg_sequence WHERE seqrelid=r.sequence_name::regclass;
    IF increment<=0 THEN RAISE EXCEPTION 'Descending business sequence requires explicit review'; END IF;
    next_value:=current_value+CASE WHEN was_called THEN increment ELSE 0 END;
    IF highest IS NOT NULL AND next_value<=highest THEN
      EXECUTE format('ALTER SEQUENCE %s RESTART WITH %s',r.sequence_name::regclass,highest+increment);
      RAISE NOTICE 'Business folio sequence synchronized: %',r.sequence_name;
    END IF;
  END LOOP;
END $$;
