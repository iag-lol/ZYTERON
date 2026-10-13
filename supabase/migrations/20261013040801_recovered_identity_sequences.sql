-- Explicit IDs restored from Control do not advance PostgreSQL identity sequences.
-- Keep this transactional (ALTER SEQUENCE RESTART, not non-transactional setval).
DO $$
DECLARE r record; highest bigint; current_value bigint; was_called boolean; next_value bigint;
BEGIN
  IF to_regclass('public.zyteron_control_recovery_records') IS NULL THEN RETURN; END IF;
  FOR r IN
    SELECT DISTINCT c.relname AS table_name,a.attname AS column_name,
      pg_get_serial_sequence(format('%I.%I',n.nspname,c.relname),a.attname) AS sequence_name,
      s.seqincrement
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
    JOIN pg_sequence s ON s.seqrelid=pg_get_serial_sequence(format('%I.%I',n.nspname,c.relname),a.attname)::regclass
    WHERE n.nspname='public' AND c.relkind='r'
      AND c.relname IN (SELECT table_name FROM public.zyteron_control_recovery_records WHERE disposition='RESTORED')
    ORDER BY c.relname,a.attname
  LOOP
    IF r.seqincrement<=0 THEN RAISE EXCEPTION 'Descending recovery sequence requires explicit review'; END IF;
    EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',r.table_name);
    EXECUTE format('SELECT max(%I)::bigint FROM public.%I',r.column_name,r.table_name) INTO highest;
    EXECUTE format('SELECT last_value,is_called FROM %s',r.sequence_name) INTO current_value,was_called;
    next_value:=current_value+CASE WHEN was_called THEN r.seqincrement ELSE 0 END;
    IF highest IS NOT NULL AND next_value<=highest THEN
      EXECUTE format('ALTER SEQUENCE %s RESTART WITH %s',r.sequence_name,highest+r.seqincrement);
      RAISE NOTICE 'Recovered sequence: %',r.sequence_name;
    END IF;
  END LOOP;
END $$;
