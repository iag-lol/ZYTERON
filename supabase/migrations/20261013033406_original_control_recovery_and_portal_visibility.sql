-- Recovery lineage is internal. Operational rows are restored by the verified
-- recovery script after an exact legal-identity/contact match, never by email alone.
CREATE TABLE IF NOT EXISTS public.zyteron_control_recovery_batches (
 id uuid PRIMARY KEY, source_project text NOT NULL, source_sha256 text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), manifest jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.zyteron_control_recovery_records (
 batch_id uuid NOT NULL REFERENCES public.zyteron_control_recovery_batches(id),
 table_name text NOT NULL, source_pk text NOT NULL, target_pk jsonb NOT NULL,
 disposition text NOT NULL, snapshot jsonb NOT NULL,
 PRIMARY KEY(batch_id,table_name,source_pk)
);
ALTER TABLE public.zyteron_control_recovery_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyteron_control_recovery_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_control_recovery_batches,public.zyteron_control_recovery_records FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.zyteron_control_recovery_batches,public.zyteron_control_recovery_records TO service_role;
DO $$ DECLARE v text; f record; BEGIN
 FOREACH v IN ARRAY ARRAY['monitoring_portal_maintenance','monitoring_portal_status','monitoring_portal_incidents','finance_portal_payments','finance_portal_invoices','portal_quote_payments'] LOOP
  IF to_regclass('public.'||v) IS NOT NULL THEN
   EXECUTE format('ALTER VIEW public.%I SET (security_invoker=true)',v);
   EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',v);
   EXECUTE format('GRANT SELECT ON public.%I TO service_role',v);
  END IF;
 END LOOP;
 FOR f IN SELECT p.oid::regprocedure::text AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef LOOP
  EXECUTE 'REVOKE EXECUTE ON FUNCTION '||f.signature||' FROM PUBLIC,anon,authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION '||f.signature||' TO service_role';
 END LOOP;
END $$;
GRANT SELECT(progress) ON public.projects TO zyteron_portal_client;
GRANT SELECT(id,client_id,endpoint_id,status,last_checked_at,last_latency_ms,ssl_status,ssl_expires_at,client_visibility) ON public.monitors TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_customer_visible_monitors ON public.monitors;
CREATE POLICY zyteron_customer_visible_monitors ON public.monitors FOR SELECT TO zyteron_portal_client USING(client_visibility='CLIENT_VISIBLE' AND public.zyteron_client_business(client_id));
GRANT SELECT(id,name,url,environment) ON public.project_endpoints TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_customer_visible_endpoints ON public.project_endpoints;
CREATE POLICY zyteron_customer_visible_endpoints ON public.project_endpoints FOR SELECT TO zyteron_portal_client USING(EXISTS(SELECT 1 FROM public.monitors m WHERE m.endpoint_id=project_endpoints.id AND m.client_visibility='CLIENT_VISIBLE' AND public.zyteron_client_business(m.client_id)));
GRANT SELECT(id,client_id,gross_amount,currency,received_at,status,confirmed_at,provider) ON public.payments TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_customer_owned_recorded_payments ON public.payments;
CREATE POLICY zyteron_customer_owned_recorded_payments ON public.payments FOR SELECT TO zyteron_portal_client USING(public.zyteron_client_business(client_id));
