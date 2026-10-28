import "server-only";
import { clientDatabase } from "./scoped-db";
import { portalModulePermissions } from "./module-permissions";
import {
  monitoringPeriod,
  buildMonitoringHistory,
  type PublishedMonitor,
  type PublishedIncident,
  type MonitoringAggregate,
  type PublishedFailure,
} from "@/lib/client-experience/monitoring-history";

export async function clientMonitoringHistory(userId: string, now = new Date()) {
  const period = monitoringPeriod(now);
  return clientDatabase(userId, async (db) => {
    const flags = await portalModulePermissions(db);
    if (!flags.enabled || !flags.monitoring) throw Error("PORTAL_MONITORING_DISABLED");
    const monitors = await db.$queryRaw<PublishedMonitor[]>`
      SELECT m.id,e.name,e.url,m.status,m.interval_seconds,m.created_at,m.last_checked_at,m.last_latency_ms,m.last_status_code,m.ssl_status,m.ssl_expires_at
      FROM public.monitors m JOIN public.project_endpoints e ON e.id=m.endpoint_id
      WHERE m.enabled AND e.active AND e.environment='PRODUCTION' AND e.endpoint_type IN ('WEB','CLIENT_PORTAL')
      ORDER BY e.name`;
    const [settings] = await db.$queryRaw<Array<{ uptime_maintenance_policy: string }>>`
      SELECT uptime_maintenance_policy FROM public.monitoring_settings WHERE id=true`;
    const maintenancePolicy = settings?.uptime_maintenance_policy || "EXCLUDE";
    if (!monitors.length) return buildMonitoringHistory(period, [], [], [], maintenancePolicy);
    const aggregates = await db.$queryRaw<MonitoringAggregate[]>`
      WITH samples AS (
        SELECT c.monitor_id,c.checked_at,c.success,c.latency_ms,c.in_maintenance,c.trigger_type,
          (date_trunc('day',c.checked_at AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago') AS day,
          (date_trunc('hour',c.checked_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS hour,
          (date_trunc('week',c.checked_at AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago') AS week,
          (NOT c.in_maintenance OR ${maintenancePolicy}='INCLUDE') AS evaluated
        FROM public.monitor_checks c JOIN public.monitors m ON m.id=c.monitor_id
          JOIN public.project_endpoints e ON e.id=m.endpoint_id
        WHERE m.enabled AND e.active AND e.environment='PRODUCTION' AND e.endpoint_type IN ('WEB','CLIENT_PORTAL')
          AND c.checked_at>=${period.from}::timestamptz AND c.checked_at<=${period.asOf}::timestamptz
      )
      SELECT monitor_id,
        CASE WHEN GROUPING(day)=0 THEN 'day' WHEN GROUPING(hour)=0 THEN 'hour' ELSE 'week' END AS kind,
        coalesce(day,hour,week) AS bucket,
        count(*)::int AS checks,count(*) FILTER(WHERE evaluated AND success)::int AS successes,
        count(*) FILTER(WHERE evaluated AND NOT success)::int AS failures,
        count(*) FILTER(WHERE in_maintenance)::int AS maintenance,
        count(*) FILTER(WHERE trigger_type='SCHEDULED')::int AS scheduled,
        count(*) FILTER(WHERE evaluated)::int AS evaluated,
        count(*) FILTER(WHERE evaluated AND success AND latency_ms IS NOT NULL)::int AS latency_samples,
        avg(latency_ms) FILTER(WHERE evaluated AND success) AS avg_latency,
        CASE WHEN count(latency_ms) FILTER(WHERE evaluated AND success)>=20
          THEN percentile_cont(0.95) WITHIN GROUP(ORDER BY latency_ms) FILTER(WHERE evaluated AND success) ELSE NULL END AS p95_latency
      FROM samples GROUP BY GROUPING SETS((monitor_id,day),(monitor_id,hour),(monitor_id,week))`;
    const incidents = await db.$queryRaw<PublishedIncident[]>`
      SELECT id,monitor_id,incident_number,client_summary,severity,status,detected_at,resolved_at
      FROM public.incidents
      WHERE detected_at<=${period.asOf}::timestamptz
        AND (detected_at>=${period.from}::timestamptz OR resolved_at>=${period.from}::timestamptz
          OR status IN ('DETECTED','CONFIRMED','ACKNOWLEDGED','INVESTIGATING','MITIGATING','MONITORING'))
      ORDER BY detected_at DESC LIMIT 100`;
    const failures = await db.$queryRaw<PublishedFailure[]>`
      SELECT monitor_id,checked_at,status_code,latency_ms FROM (
        SELECT monitor_id,checked_at,status_code,latency_ms,
          row_number() OVER(PARTITION BY monitor_id ORDER BY checked_at DESC) AS rank
        FROM public.monitor_checks
        WHERE NOT success AND (NOT in_maintenance OR ${maintenancePolicy}='INCLUDE')
          AND checked_at>=${period.from}::timestamptz AND checked_at<=${period.asOf}::timestamptz
      ) recent WHERE rank<=20 ORDER BY checked_at DESC`;
    return buildMonitoringHistory(
      period,
      monitors,
      aggregates,
      incidents,
      maintenancePolicy,
      failures,
    );
  });
}
