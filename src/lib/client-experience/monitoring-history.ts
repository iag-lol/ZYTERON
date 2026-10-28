import { Temporal } from "@js-temporal/polyfill";

export const MONITORING_TIME_ZONE = "America/Santiago";
export function monitoringPeriod(now = new Date()) {
  const today = Temporal.Instant.from(now.toISOString())
    .toZonedDateTimeISO(MONITORING_TIME_ZONE)
    .toPlainDate();
  const monday = today.subtract({ days: today.dayOfWeek - 1 });
  const start = monday.subtract({ days: 7 });
  const instant = (date: Temporal.PlainDate) =>
    date.toZonedDateTime(MONITORING_TIME_ZONE).toInstant().toString();
  return {
    from: instant(start),
    to: instant(monday.add({ days: 7 })),
    asOf: now.toISOString(),
    today: today.toString(),
    weeks: [start, monday].map((date, index) => ({
      key: index === 0 ? "previous" : "current",
      label: index === 0 ? "Semana pasada" : "Esta semana",
      from: date.toString(),
      to: date.add({ days: 6 }).toString(),
      start: instant(date),
      end: instant(date.add({ days: 7 })),
    })),
    days: Array.from({ length: 14 }, (_, index) => {
      const date = start.add({ days: index });
      const from = date.toZonedDateTime(MONITORING_TIME_ZONE);
      const to = date.add({ days: 1 }).toZonedDateTime(MONITORING_TIME_ZONE);
      const hours: string[] = [];
      for (
        let cursor = from.toInstant();
        Temporal.Instant.compare(cursor, to.toInstant()) < 0;
        cursor = cursor.add({ hours: 1 })
      )
        hours.push(cursor.toString());
      return {
        date: date.toString(),
        start: from.toInstant().toString(),
        end: to.toInstant().toString(),
        hours,
        future: Temporal.PlainDate.compare(date, today) > 0,
      };
    }),
  };
}

export type MonitoringPeriod = ReturnType<typeof monitoringPeriod>;
export type MonitoringAggregate = {
  monitor_id: string;
  kind: string;
  bucket: Date | string | null;
  checks: number;
  successes: number;
  failures: number;
  maintenance: number;
  scheduled: number;
  evaluated: number;
  latency_samples: number;
  avg_latency: number | null;
  p95_latency: number | null;
};
export type PublishedMonitor = {
  id: string;
  name: string;
  url: string;
  status: string;
  interval_seconds: number;
  created_at: Date | string;
  last_checked_at: Date | string | null;
  last_latency_ms: number | null;
  last_status_code: number | null;
  ssl_status: string;
  ssl_expires_at: Date | string | null;
};
export type PublishedIncident = {
  id: string;
  monitor_id: string;
  incident_number: string;
  client_summary: string;
  severity: string;
  status: string;
  detected_at: Date | string;
  resolved_at: Date | string | null;
};
export type PublishedFailure = {
  monitor_id: string;
  checked_at: Date | string;
  status_code: number | null;
  latency_ms: number | null;
};
const iso = (value: Date | string) => new Date(value).toISOString();
export function monitoringMetrics(row?: MonitoringAggregate) {
  return {
    checks: row?.checks || 0,
    evaluated: row?.evaluated || 0,
    successes: row?.successes || 0,
    failures: row?.failures || 0,
    maintenance: row?.maintenance || 0,
    scheduled: row?.scheduled || 0,
    availability: row?.evaluated ? (100 * row.successes) / row.evaluated : null,
    avgLatency:
      row?.avg_latency === null || row?.avg_latency === undefined ? null : Number(row.avg_latency),
    p95Latency:
      row?.p95_latency === null || row?.p95_latency === undefined ? null : Number(row.p95_latency),
    latencySamples: row?.latency_samples || 0,
  };
}

export function buildMonitoringHistory(
  period: MonitoringPeriod,
  monitors: PublishedMonitor[],
  aggregates: MonitoringAggregate[],
  incidents: PublishedIncident[],
  maintenancePolicy: string,
  failures: PublishedFailure[] = [],
) {
  const asOf = new Date(period.asOf).getTime();
  const sites = monitors.map((monitor) => {
    const rows = aggregates.filter((row) => row.monitor_id === monitor.id);
    const find = (kind: string, at: string) =>
      rows.find((row) => row.kind === kind && row.bucket && iso(row.bucket) === iso(at));
    const checkedAt = monitor.last_checked_at ? iso(monitor.last_checked_at) : null;
    const stale =
      !checkedAt ||
      asOf - new Date(checkedAt).getTime() > Math.max(180, monitor.interval_seconds * 3) * 1000;
    const coverage = (from: string, to: string, scheduled: number) => {
      const start = Math.max(new Date(from).getTime(), new Date(monitor.created_at).getTime());
      const end = Math.min(new Date(to).getTime(), asOf);
      const expected = Math.max(0, Math.floor((end - start) / (monitor.interval_seconds * 1000)));
      return { expected, coverage: expected ? Math.min(100, (100 * scheduled) / expected) : null };
    };
    return {
      id: monitor.id,
      name: monitor.name,
      url: (() => {
        try {
          const url = new URL(monitor.url);
          return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
            ? url.origin + url.pathname
            : "";
        } catch {
          return "";
        }
      })(),
      status: stale ? "NO_DATA" : monitor.status,
      stale,
      checkedAt,
      latency: monitor.last_latency_ms,
      statusCode: monitor.last_status_code,
      intervalSeconds: monitor.interval_seconds,
      ssl: monitor.ssl_status,
      sslExpires: monitor.ssl_expires_at ? iso(monitor.ssl_expires_at) : null,
      weeks: period.weeks.map((week) => {
        const metrics = monitoringMetrics(find("week", week.start));
        return { ...week, ...metrics, ...coverage(week.start, week.end, metrics.scheduled) };
      }),
      days: period.days.map((day) => {
        const metrics = monitoringMetrics(find("day", day.start));
        return {
          date: day.date,
          future: day.future,
          ...metrics,
          ...coverage(day.start, day.end, metrics.scheduled),
          hours: day.hours.map((at) => ({
            at,
            future: new Date(at).getTime() > asOf,
            ...monitoringMetrics(find("hour", at)),
          })),
        };
      }),
      incidents: incidents
        .filter((incident) => incident.monitor_id === monitor.id)
        .map((incident) => ({
          id: incident.id,
          number: incident.incident_number,
          summary: incident.client_summary,
          severity: incident.severity,
          status: incident.status,
          detectedAt: iso(incident.detected_at),
          resolvedAt: incident.resolved_at ? iso(incident.resolved_at) : null,
        })),
      recentFailures: failures
        .filter((failure) => failure.monitor_id === monitor.id)
        .map((failure) => ({
          at: iso(failure.checked_at),
          statusCode: failure.status_code,
          latency: failure.latency_ms,
        })),
    };
  });
  const current = sites.map((site) => site.weeks[1]!);
  const evaluated = current.reduce((sum, row) => sum + row.evaluated, 0);
  const latencySamples = current.reduce((sum, row) => sum + row.latencySamples, 0);
  return {
    period,
    maintenancePolicy,
    sites,
    summary: {
      total: sites.length,
      online: sites.filter((site) => site.status === "ONLINE").length,
      availability: evaluated
        ? (100 * current.reduce((sum, row) => sum + row.successes, 0)) / evaluated
        : null,
      avgLatency: latencySamples
        ? current.reduce((sum, row) => sum + (row.avgLatency || 0) * row.latencySamples, 0) /
          latencySamples
        : null,
      sslRisks: sites.filter((site) => ["EXPIRING_SOON", "EXPIRED", "INVALID"].includes(site.ssl))
        .length,
      checks: current.reduce((sum, row) => sum + row.checks, 0),
    },
  };
}
export type ClientMonitoringHistory = ReturnType<typeof buildMonitoringHistory>;
