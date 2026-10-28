import { test } from "node:test";
import assert from "node:assert/strict";
import {
  monitoringPeriod,
  monitoringMetrics,
  buildMonitoringHistory,
  type MonitoringAggregate,
  type PublishedMonitor,
} from "./monitoring-history";

test("el período contiene la semana pasada y la actual, de lunes a domingo en Chile", () => {
  const period = monitoringPeriod(new Date("2026-10-28T06:00:00Z"));
  assert.equal(period.from, "2026-10-19T03:00:00Z");
  assert.equal(period.to, "2026-11-02T03:00:00Z");
  assert.equal(period.days.length, 14);
  assert.equal(period.weeks[0]!.to, "2026-10-25");
  assert.equal(period.weeks[1]!.from, "2026-10-26");
  assert.equal(period.days.filter((day) => day.future).length, 4);
  const sunday = monitoringPeriod(new Date("2026-10-26T02:59:59Z"));
  assert.equal(sunday.weeks[1]!.from, "2026-10-19");
  const monday = monitoringPeriod(new Date("2026-10-26T03:00:00Z"));
  assert.equal(monday.weeks[1]!.from, "2026-10-26");
});

test("los días con cambio de hora conservan sus 23 o 25 horas reales", () => {
  const spring = monitoringPeriod(new Date("2026-09-09T12:00:00Z"));
  assert.equal(spring.days.find((day) => day.date === "2026-09-06")!.hours.length, 23);
  const autumn = monitoringPeriod(new Date("2026-04-08T12:00:00Z"));
  assert.equal(autumn.days.find((day) => day.date === "2026-04-04")!.hours.length, 25);
});

const monitor: PublishedMonitor = {
  id: "own-monitor",
  name: "Sitio del cliente",
  url: "https://cliente.example.cl/?token=hidden",
  status: "ONLINE",
  interval_seconds: 300,
  created_at: "2026-10-01T00:00:00Z",
  last_checked_at: "2026-10-28T05:59:00Z",
  last_latency_ms: 120,
  last_status_code: 200,
  ssl_status: "HEALTHY",
  ssl_expires_at: null,
};
const aggregate: MonitoringAggregate = {
  monitor_id: monitor.id,
  kind: "week",
  bucket: "2026-10-26T03:00:00Z",
  checks: 100,
  successes: 72,
  failures: 8,
  maintenance: 20,
  scheduled: 99,
  evaluated: 80,
  latency_samples: 72,
  avg_latency: 120,
  p95_latency: 200,
};

test("la disponibilidad usa muestras evaluadas y conserva huecos, mantenciones y futuro", () => {
  const period = monitoringPeriod(new Date("2026-10-28T06:00:00Z"));
  const data = buildMonitoringHistory(period, [monitor], [aggregate], [], "EXCLUDE");
  assert.equal(data.sites[0]!.weeks[1]!.availability, 90);
  assert.equal(data.sites[0]!.weeks[0]!.availability, null);
  assert.equal(data.sites[0]!.days.length, 14);
  assert.ok(
    data.sites[0]!.days.filter((day) => day.future).every((day) => day.availability === null),
  );
  assert.equal(data.sites[0]!.url, "https://cliente.example.cl/");
  assert.equal(data.summary.checks, 100);
  assert.equal(monitoringMetrics().availability, null);
  assert.equal(
    monitoringMetrics({ ...aggregate, evaluated: 0, successes: 0, maintenance: 100 }).availability,
    null,
  );
});

test("el resumen pondera muestras de cada sitio y no promedia porcentajes", () => {
  const data = buildMonitoringHistory(
    monitoringPeriod(new Date("2026-10-28T06:00:00Z")),
    [monitor, { ...monitor, id: "second" }],
    [
      aggregate,
      {
        ...aggregate,
        monitor_id: "second",
        checks: 20,
        evaluated: 20,
        successes: 20,
        failures: 0,
        latency_samples: 20,
        avg_latency: 500,
      },
    ],
    [],
    "EXCLUDE",
  );
  assert.equal(data.summary.availability, 92);
  assert.ok(Math.abs(data.summary.avgLatency! - (120 * 72 + 500 * 20) / 92) < 0.001);
});

test("un último resultado vencido no se presenta como un sitio actualmente en línea", () => {
  const period = monitoringPeriod(new Date("2026-10-28T06:00:00Z"));
  const data = buildMonitoringHistory(
    period,
    [{ ...monitor, last_checked_at: "2026-10-28T05:44:00Z" }],
    [],
    [],
    "EXCLUDE",
  );
  assert.equal(data.sites[0]!.status, "NO_DATA");
  assert.equal(data.summary.online, 0);
  assert.equal(data.summary.availability, null);
});

test("la cobertura no se infla con comprobaciones manuales ni con un intervalo futuro", () => {
  const period = monitoringPeriod(new Date("2026-10-28T06:00:00Z"));
  const data = buildMonitoringHistory(
    period,
    [monitor],
    [{ ...aggregate, kind: "day", bucket: "2026-10-28T03:00:00Z", checks: 200, scheduled: 18 }],
    [],
    "EXCLUDE",
  );
  const today = data.sites[0]!.days.find((day) => day.date === period.today)!;
  assert.equal(today.expected, 36);
  assert.equal(today.coverage, 50);
  assert.ok(data.sites[0]!.days.filter((day) => day.future).every((day) => day.coverage === null));
});

test("la presentación vincula incidencias al sitio correcto y elimina URLs con credenciales", () => {
  const data = buildMonitoringHistory(
    monitoringPeriod(new Date("2026-10-28T06:00:00Z")),
    [{ ...monitor, url: "https://user:password@example.cl" }],
    [],
    [
      {
        id: "incident",
        monitor_id: "another-monitor",
        incident_number: "INC-1",
        client_summary: "Otra cuenta",
        severity: "HIGH",
        status: "CONFIRMED",
        detected_at: "2026-10-28T05:00:00Z",
        resolved_at: null,
      },
    ],
    "EXCLUDE",
  );
  assert.equal(data.sites[0]!.incidents.length, 0);
  assert.equal(data.sites[0]!.url, "");
});

test("los fallos recientes conservan la respuesta medida y quedan asociados al sitio correspondiente", () => {
  const data = buildMonitoringHistory(
    monitoringPeriod(new Date("2026-10-28T06:00:00Z")),
    [monitor],
    [],
    [],
    "EXCLUDE",
    [
      {
        monitor_id: monitor.id,
        checked_at: "2026-10-28T05:00:00Z",
        status_code: 503,
        latency_ms: 900,
      },
      {
        monitor_id: "other-site",
        checked_at: "2026-10-28T05:01:00Z",
        status_code: null,
        latency_ms: null,
      },
    ],
  );
  assert.deepEqual(data.sites[0]!.recentFailures, [
    { at: "2026-10-28T05:00:00.000Z", statusCode: 503, latency: 900 },
  ]);
});
