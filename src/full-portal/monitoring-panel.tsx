"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Globe2,
  Info,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { PortalData } from "@/lib/client-experience/snapshot";
import type { ClientMonitoringHistory } from "@/lib/client-experience/monitoring-history";

type Site = ClientMonitoringHistory["sites"][number];
const statuses: Record<string, string> = {
  ONLINE: "En línea",
  OFFLINE: "Fuera de línea",
  DEGRADED: "Con incidencias",
  MAINTENANCE: "En mantención",
  UNKNOWN: "Sin medición",
  NO_DATA: "Sin datos recientes",
};
const sslLabels: Record<string, string> = {
  HEALTHY: "TLS válido",
  EXPIRING_SOON: "TLS por vencer",
  EXPIRED: "TLS vencido",
  INVALID: "TLS no válido",
  UNKNOWN: "TLS sin comprobar",
  NOT_APPLICABLE: "Sin TLS",
};
const incidentLabels: Record<string, string> = {
  DETECTED: "Detectada",
  CONFIRMED: "Confirmada",
  ACKNOWLEDGED: "En revisión",
  INVESTIGATING: "En investigación",
  MITIGATING: "En atención",
  MONITORING: "En observación",
  RESOLVED: "Resuelta",
  POSTMORTEM_REQUIRED: "Servicio recuperado",
  CLOSED: "Cerrada",
};
const percent = (n: number | null) =>
  n === null
    ? "Sin datos"
    : `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n)} %`;
const ms = (n: number | null) =>
  n === null ? "Sin datos" : `${Math.round(n).toLocaleString("es-CL")} ms`;
const civil = (date: string) => date.slice(0, 10).split("-").reverse().join("-");
const clock = (date: string) =>
  new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(date));
const timestamp = (date: string) =>
  `${new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date)).replaceAll("/", "-")} ${clock(date)}`;
const band = (day: {
  future: boolean;
  availability: number | null;
  maintenance: number;
  checks: number;
  failures: number;
}) =>
  day.future
    ? "future"
    : day.availability === null
      ? day.maintenance
        ? "maintenance"
        : "empty"
      : day.failures > 0
        ? "warning"
        : "healthy";

function LatencyTimeline({
  site,
  selected,
  onSelect,
}: {
  site: Site;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const width = 700,
    height = 154,
    left = 48,
    right = 16,
    top = 17,
    bottom = 32;
  const values = site.days.flatMap((day) =>
    [day.avgLatency, day.p95Latency].filter((v): v is number => v !== null),
  );
  if (!values.length)
    return <p className="cm-no-series">Todavía no hay respuestas medidas para graficar.</p>;
  const max = Math.max(100, ...values) * 1.15;
  const x = (i: number) => left + (i * (width - left - right)) / 13;
  const y = (value: number) => height - bottom - (value / max) * (height - top - bottom);
  const segments = (key: "avgLatency" | "p95Latency") => {
    const result: string[] = [];
    let current: string[] = [];
    site.days.forEach((day, index) => {
      const value = day[key];
      if (value === null) {
        if (current.length) result.push(current.join(" "));
        current = [];
      } else current.push(`${x(index)},${y(value)}`);
    });
    if (current.length) result.push(current.join(" "));
    return result;
  };
  const selectedIndex = site.days.findIndex((day) => day.date === selected);
  return (
    <div className="cm-latency-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Tiempo de respuesta diario de ${site.name}. Media y percentil 95. Los espacios sin datos no se unen.`}
      >
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={left}
              x2={width - right}
              y1={y(max * ratio)}
              y2={y(max * ratio)}
              className="cm-chart-grid"
            />
            <text x={left - 8} y={y(max * ratio) + 4} textAnchor="end">
              {Math.round(max * ratio)}
            </text>
          </g>
        ))}
        {selectedIndex >= 0 && (
          <line
            x1={x(selectedIndex)}
            x2={x(selectedIndex)}
            y1={top}
            y2={height - bottom}
            className="cm-chart-selection"
          />
        )}
        {segments("p95Latency").map((points, index) => (
          <polyline key={`p${index}`} points={points} className="cm-series-p95" />
        ))}
        {segments("avgLatency").map((points, index) => (
          <polyline key={`a${index}`} points={points} className="cm-series-avg" />
        ))}
        {site.days.map((day, index) =>
          day.avgLatency !== null ? (
            <g key={day.date}>
              <circle
                cx={x(index)}
                cy={y(day.avgLatency)}
                r={selected === day.date ? 5 : 3.5}
                className="cm-chart-dot"
              />
              <circle
                cx={x(index)}
                cy={y(day.avgLatency)}
                r={13}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={`${civil(day.date)}: media ${ms(day.avgLatency)}, p95 ${ms(day.p95Latency)}`}
                onClick={() => onSelect(day.date)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(day.date);
                  }
                }}
              >
                <title>{`${civil(day.date)} · Media ${ms(day.avgLatency)} · p95 ${ms(day.p95Latency)}`}</title>
              </circle>
            </g>
          ) : null,
        )}
        {[0, 6, 7, 13].map((index) => (
          <text
            key={index}
            x={x(index)}
            y={height - 7}
            textAnchor={index === 0 ? "start" : index === 13 ? "end" : "middle"}
          >
            {site.days[index]!.date.slice(8)}-{site.days[index]!.date.slice(5, 7)}
          </text>
        ))}
        <text x={left} y={12}>
          ms
        </text>
      </svg>
      <div className="cm-chart-legend">
        <span>
          <i className="cm-line-average" />
          Media diaria
        </span>
        <span>
          <i className="cm-line-p95" />
          P95 · 20 muestras mínimas
        </span>
      </div>
    </div>
  );
}

function SiteHistory({ site, period }: { site: Site; period: ClientMonitoringHistory["period"] }) {
  const [selected, setSelected] = useState(period.today);
  const selectedDate = site.days.some((item) => item.date === selected) ? selected : period.today;
  const day = site.days.find((item) => item.date === selectedDate)!;
  const current = site.weeks[1]!;
  return (
    <article className="cm-site panel" aria-label={`Monitoreo de ${site.name}`}>
      <header className="cm-site-header">
        <span className="cm-site-symbol">
          <Globe2 size={23} />
        </span>
        <div>
          <h2>{site.name}</h2>
          {site.url && (
            <a href={site.url} target="_blank" rel="noopener noreferrer">
              {site.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              <ArrowUpRight size={13} />
            </a>
          )}
        </div>
        <span className={`cm-status cm-status-${site.status.toLowerCase()}`}>
          <i />
          {statuses[site.status] || "Sin medición"}
        </span>
      </header>
      <div className="cm-site-facts">
        <span>
          <Clock3 size={13} />
          {site.checkedAt
            ? `Última medición ${timestamp(site.checkedAt)}`
            : "Esperando la primera medición"}
        </span>
        <span>Intervalo: {site.intervalSeconds / 60} min</span>
        <span>HTTP {site.statusCode ?? "sin muestra"}</span>
        <span>
          <ShieldCheck size={13} />
          {sslLabels[site.ssl] || "TLS sin comprobar"}
          {site.sslExpires ? ` · vence ${timestamp(site.sslExpires).slice(0, 10)}` : ""}
        </span>
      </div>
      {site.stale && (
        <p className="cm-stale">
          <Info size={15} />
          No hay una comprobación reciente. El último resultado no confirma el estado actual del
          sitio.
        </p>
      )}
      <div className="cm-site-metrics">
        {site.weeks.map((week) => (
          <div key={week.key}>
            <span>
              {week.label}
              {week.key === "current" ? " · en curso" : ""}
            </span>
            <strong>{percent(week.availability)}</strong>
            <small>{week.evaluated.toLocaleString("es-CL")} comprobaciones evaluadas</small>
          </div>
        ))}
        <div>
          <span>Respuesta media · esta semana</span>
          <strong>{ms(current.avgLatency)}</strong>
          <small>{current.latencySamples.toLocaleString("es-CL")} respuestas medidas</small>
        </div>
        <div>
          <span>Respuesta P95 · esta semana</span>
          <strong>{ms(current.p95Latency)}</strong>
          <small>El 95 % de las respuestas queda por debajo</small>
        </div>
      </div>
      <div className="cm-section-heading">
        <div>
          <h3>Disponibilidad día a día</h3>
          <p>Selecciona un día para revisar su detalle por hora.</p>
        </div>
        <div className="cm-calendar-legend">
          <span>
            <i className="cm-dot-healthy" />
            Sin fallos medidos
          </span>
          <span>
            <i className="cm-dot-warning" />
            Con fallos
          </span>
          <span>
            <i className="cm-dot-empty" />
            Sin datos
          </span>
        </div>
      </div>
      <div className="cm-weeks">
        {site.weeks.map((week, index) => (
          <section className="cm-week" key={week.key} aria-label={week.label}>
            <header>
              <strong>{week.label}</strong>
              <span>
                {civil(week.from)} — {civil(week.to)}
              </span>
            </header>
            <div className="cm-day-grid">
              {site.days.slice(index * 7, index * 7 + 7).map((entry, dayIndex) => (
                <button
                  type="button"
                  key={entry.date}
                  className={`cm-day cm-day-${band(entry)} ${selectedDate === entry.date ? "cm-day-selected" : ""}`}
                  onClick={() => setSelected(entry.date)}
                  aria-pressed={selectedDate === entry.date}
                  aria-label={`${civil(entry.date)}: ${entry.future ? "Por transcurrir" : entry.checks ? `${percent(entry.availability)}, ${entry.failures} comprobaciones fallidas` : "Sin mediciones"}`}
                >
                  <span>{["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"][dayIndex]}</span>
                  <b>{entry.date.slice(8)}</b>
                  <strong>
                    {entry.future ? "—" : entry.checks ? percent(entry.availability) : "Sin datos"}
                  </strong>
                  <small>{entry.future ? "Por transcurrir" : `${entry.checks} muestras`}</small>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="cm-day-detail" aria-live="polite">
        <div className="cm-day-detail-title">
          <CalendarDays size={19} />
          <h3>{civil(day.date)}</h3>
          <span>
            {day.future
              ? "Por transcurrir"
              : day.date === period.today
                ? "Hoy · día en curso"
                : "Detalle del día"}
          </span>
        </div>
        <div className="cm-detail-values">
          <span>
            <b>{day.checks}</b> comprobaciones
          </span>
          <span>
            <b>{day.failures}</b> fallidas
          </span>
          <span>
            <b>{day.maintenance}</b> en mantención
          </span>
          <span>
            <b>{ms(day.avgLatency)}</b> respuesta media
          </span>
          <span>
            <b>{day.coverage === null ? "Sin datos" : percent(day.coverage)}</b> cobertura de
            medición
          </span>
        </div>
        <div className="cm-hours" aria-label={`Comprobaciones por hora del ${civil(day.date)}`}>
          {day.hours.map((hour) => (
            <div
              key={hour.at}
              className={`cm-hour cm-day-${band(hour)}`}
              tabIndex={0}
              aria-label={`${clock(hour.at)}: ${hour.future ? "Por transcurrir" : `${hour.checks} comprobaciones, ${hour.failures} fallidas, disponibilidad ${percent(hour.availability)}, media ${ms(hour.avgLatency)}`}`}
            >
              <i />
              <span>{clock(hour.at).slice(0, 2)}</span>
              <div className="cm-hour-tooltip">
                {clock(hour.at)} ·{" "}
                {hour.future
                  ? "Por transcurrir"
                  : `${hour.checks} muestras · ${percent(hour.availability)} · ${ms(hour.avgLatency)}`}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="cm-section-heading">
        <div>
          <h3>Tiempo de respuesta</h3>
          <p>Las dos semanas completas; los espacios sin mediciones permanecen vacíos.</p>
        </div>
        <span className="cm-unit">MILISEGUNDOS</span>
      </div>
      <LatencyTimeline site={site} selected={selectedDate} onSelect={setSelected} />
      {site.recentFailures.length > 0 && (
        <details className="cm-incidents cm-failures">
          <summary>
            Últimas comprobaciones fallidas <span>{site.recentFailures.length}</span>
          </summary>
          <p>
            Hasta 20 fallos recientes de este período. Una comprobación fallida no equivale por sí
            sola a una caída confirmada.
          </p>
          <div className="cm-failures-table">
            <table>
              <thead>
                <tr>
                  <th>Fecha y hora · Chile</th>
                  <th>Respuesta</th>
                  <th>Tiempo observado</th>
                </tr>
              </thead>
              <tbody>
                {site.recentFailures.map((failure, index) => (
                  <tr key={`${failure.at}-${index}`}>
                    <td>{timestamp(failure.at)}</td>
                    <td>
                      {failure.statusCode === null
                        ? "Sin respuesta HTTP"
                        : `HTTP ${failure.statusCode}`}
                    </td>
                    <td>{ms(failure.latency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <details className="cm-incidents">
        <summary>
          Incidencias compartidas <span>{site.incidents.length}</span>
        </summary>
        {site.incidents.length ? (
          <div className="cm-incident-list">
            {site.incidents.map((incident) => (
              <article key={incident.id}>
                <span className="cm-incident-number">{incident.number}</span>
                <div>
                  <p>{incident.summary}</p>
                  <small>
                    {timestamp(incident.detectedAt)}
                    {incident.resolvedAt ? ` · resuelta ${timestamp(incident.resolvedAt)}` : ""}
                  </small>
                </div>
                <span>{incidentLabels[incident.status] || "En revisión"}</span>
              </article>
            ))}
          </div>
        ) : (
          <p>
            No hay incidencias compartidas para este sitio en el período. Las comprobaciones
            fallidas se muestran en el calendario.
          </p>
        )}
      </details>
    </article>
  );
}

export default function MonitoringPanel({
  initial,
  initialHistory,
}: {
  initial: PortalData["monitors"];
  initialHistory?: ClientMonitoringHistory;
}) {
  const [history, setHistory] = useState<ClientMonitoringHistory | null>(initialHistory || null);
  const [busy, setBusy] = useState(!initialHistory);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [selectedSite, setSelectedSite] = useState("all");
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const load = async () => {
      if (running) return;
      running = true;
      try {
        const response = await fetch("/api/portal/monitoring/status", {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
        });
        if (!response.ok) {
          if ([401, 403].includes(response.status)) setHistory(null);
          const body = await response.json().catch(() => null);
          throw Error(body?.error || "No se pudo actualizar el monitoreo.");
        }
        const next = (await response.json()) as ClientMonitoringHistory;
        if (!Array.isArray(next.sites) || !next.period?.days || !next.period?.weeks)
          throw Error("No se pudo completar la consulta de monitoreo. Inténtalo nuevamente.");
        if (!controller.signal.aborted) {
          setHistory(next);
          setError("");
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error &&
              !["AbortError", "TimeoutError", "TypeError"].includes(cause.name)
              ? cause.message
              : "No se pudo actualizar el monitoreo. Comprueba tu conexión e inténtalo nuevamente.",
          );
      } finally {
        running = false;
        if (!controller.signal.aborted) setBusy(false);
      }
    };
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [reload]);
  const refresh = () => {
    setBusy(true);
    setReload((value) => value + 1);
  };
  const activeSelection = history?.sites.some((site) => site.id === selectedSite)
    ? selectedSite
    : "all";
  const sites =
    history?.sites.filter((site) => activeSelection === "all" || site.id === activeSelection) || [];
  return (
    <div className="client-monitoring">
      <section className="cm-hero">
        <div className="cm-hero-heading">
          <span className="cm-radar">
            <Activity size={26} />
          </span>
          <div>
            <p className="cm-eyebrow">CONTINUIDAD DE TUS SITIOS</p>
            <h2>Una mirada completa a tus webs.</h2>
            <p>Disponibilidad, respuesta y seguridad de los sitios vigentes de tu empresa.</p>
          </div>
          <button className="cm-refresh" onClick={refresh} disabled={busy}>
            <RefreshCw size={15} className={busy ? "cm-spinning" : ""} />
            {busy ? "Actualizando…" : "Actualizar datos"}
          </button>
        </div>
        <div className="cm-hero-footer">
          <span>
            <i />
            {history
              ? `${history.summary.total} sitios asignados`
              : `${initial.length} sitios · consultando historial`}
          </span>
          <span>
            <CalendarDays size={14} />
            {history
              ? `${civil(history.period.weeks[0]!.from)} — ${civil(history.period.weeks[1]!.to)}`
              : "Semana pasada + semana actual"}
          </span>
          <span>Hora de Chile · actualización cada minuto</span>
        </div>
      </section>
      {error && (
        <div className="cm-error" role="alert">
          <Info size={17} />
          <span>
            {error}
            {history ? ` Se conservan los datos del ${timestamp(history.period.asOf)}.` : ""}
          </span>
          <button onClick={refresh} disabled={busy}>
            Reintentar
          </button>
        </div>
      )}
      {!history && !error && (
        <div className="cm-loading" role="status">
          <RefreshCw size={22} className="cm-spinning" />
          <strong>Consultando las mediciones de tus sitios…</strong>
          <span>Semana pasada y semana actual</span>
        </div>
      )}
      {history && (
        <>
          <div className="cm-overview">
            <div>
              <Globe2 size={19} />
              <span>Sitios en línea</span>
              <strong>
                {history.summary.online}
                <small> / {history.summary.total}</small>
              </strong>
              <p>Estado de la última comprobación</p>
            </div>
            <div>
              <Check size={19} />
              <span>Disponibilidad medida</span>
              <strong>{percent(history.summary.availability)}</strong>
              <p>Esta semana · {history.summary.checks.toLocaleString("es-CL")} muestras</p>
            </div>
            <div>
              <Activity size={19} />
              <span>Respuesta media</span>
              <strong>{ms(history.summary.avgLatency)}</strong>
              <p>Respuestas exitosas de esta semana</p>
            </div>
            <div>
              <ShieldCheck size={19} />
              <span>Certificados con alertas</span>
              <strong>{history.summary.sslRisks}</strong>
              <p>Por vencer, vencidos o no válidos</p>
            </div>
          </div>
          {history.sites.length > 0 ? (
            <>
              <div className="cm-sites-toolbar">
                <div>
                  <h2>El historial de tus webs</h2>
                  <p>Semana pasada y semana actual, de lunes a domingo.</p>
                </div>
                {history.sites.length > 1 && (
                  <label>
                    Sitio
                    <select
                      value={activeSelection}
                      onChange={(e) => setSelectedSite(e.target.value)}
                    >
                      <option value="all">Todos los sitios</option>
                      {history.sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {sites.map((site) => (
                <SiteHistory key={site.id} site={site} period={history.period} />
              ))}
            </>
          ) : (
            <div className="cm-empty panel">
              <Globe2 size={30} />
              <h2>No hay sitios vigentes compartidos</h2>
              <p>
                Los sitios asignados y habilitados para tu empresa aparecerán aquí con sus
                mediciones.
              </p>
            </div>
          )}
          <footer className="cm-method">
            <Info size={18} />
            <div>
              <strong>Cómo leer el monitoreo</strong>
              <p>
                La disponibilidad se calcula sobre las comprobaciones registradas. Un período sin
                muestras no confirma que el sitio estuviera en línea. La cobertura indica cuánto se
                logró medir frente al intervalo programado.
                {history.maintenancePolicy === "EXCLUDE"
                  ? " Las comprobaciones durante mantenciones se excluyen de la disponibilidad."
                  : " Las comprobaciones durante mantenciones se incluyen en la disponibilidad."}
              </p>
              <span>
                Datos consultados el {timestamp(history.period.asOf)} · Estado técnico independiente
                del estado comercial.
              </span>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
