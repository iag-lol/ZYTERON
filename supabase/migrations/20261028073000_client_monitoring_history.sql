-- Client history exposes measurements and published summaries, never internal errors or configuration.
GRANT SELECT(enabled,interval_seconds,last_status_code,created_at,ssl_checked_at)
  ON public.monitors TO zyteron_portal_client;
GRANT SELECT(active,endpoint_type) ON public.project_endpoints TO zyteron_portal_client;
GRANT SELECT(id,monitor_id,checked_at,success,status_code,latency_ms,in_maintenance,trigger_type)
  ON public.monitor_checks TO zyteron_portal_client;
GRANT SELECT(id,uptime_maintenance_policy) ON public.monitoring_settings TO zyteron_portal_client;
GRANT SELECT(id,monitor_id,incident_number,client_summary,severity,status,detected_at,confirmed_at,recovered_at,resolved_at,downtime_seconds)
  ON public.incidents TO zyteron_portal_client;

CREATE POLICY zyteron_client_monitoring_settings ON public.monitoring_settings
  FOR SELECT TO zyteron_portal_client USING(public.zyteron_portal_module_enabled('monitoring'));

CREATE POLICY zyteron_client_check_history ON public.monitor_checks
  FOR SELECT TO zyteron_portal_client USING (
    public.zyteron_portal_module_enabled('monitoring')
    AND checked_at >= ((date_trunc('week',now() AT TIME ZONE 'America/Santiago') - interval '7 days') AT TIME ZONE 'America/Santiago')
    AND checked_at <= now()
    AND EXISTS (
      SELECT 1 FROM public.monitors m JOIN public.project_endpoints e ON e.id=m.endpoint_id
      WHERE m.id=monitor_checks.monitor_id AND m.enabled AND e.active
        AND e.environment='PRODUCTION' AND e.endpoint_type IN ('WEB','CLIENT_PORTAL')
        AND m.client_visibility='CLIENT_VISIBLE' AND public.zyteron_client_business(m.client_id)
    )
  );

CREATE POLICY zyteron_client_monitoring_incidents ON public.incidents
  FOR SELECT TO zyteron_portal_client USING (
    public.zyteron_portal_module_enabled('monitoring')
    AND client_visibility='CLIENT_VISIBLE' AND nullif(trim(client_summary),'') IS NOT NULL
    AND public.zyteron_client_business(client_id)
    AND EXISTS (
      SELECT 1 FROM public.monitors m JOIN public.project_endpoints e ON e.id=m.endpoint_id
      WHERE m.id=incidents.monitor_id AND m.enabled AND e.active
        AND e.environment='PRODUCTION' AND e.endpoint_type IN ('WEB','CLIENT_PORTAL')
        AND m.client_visibility='CLIENT_VISIBLE' AND public.zyteron_client_business(m.client_id)
    )
  );
