"use client";
import { useState } from "react";
import { ArrowRight, Globe2, Info, Monitor } from "lucide-react";
import type { PortalData } from "@/lib/client-experience/snapshot";
const labels: Record<string, string> = {
  ONLINE: "En línea",
  OFFLINE: "Fuera de línea",
  DEGRADED: "Con incidencias",
  MAINTENANCE: "En mantención",
  DISABLED: "Deshabilitado",
  NO_DATA: "Sin medición",
};
export default function MonitoringPanel({ initial }: { initial: PortalData["monitors"] }) {
  const [sites, setSites] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/portal/monitoring/status", { cache: "no-store" });
      if (!r.ok) throw Error("No se pudo actualizar el monitoreo. Inténtalo nuevamente.");
      const data = await r.json();
      setSites(data.monitors);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="monitor-summary">
        <div className="monitor-status">
          <Monitor size={26} />
          <div>
            <h2>Monitoreo de tus sitios</h2>
            <p>
              {sites.length
                ? `${sites.length} sitios compartidos con tu cuenta`
                : "No hay sitios compartidos con tu cuenta"}
            </p>
          </div>
          <span className="badge neutral">
            {sites.length ? "Datos publicados" : "Sin sitios compartidos"}
          </span>
        </div>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>Estado de tus sitios</h2>
          <button className="button secondary" disabled={busy} onClick={() => void refresh()}>
            {busy ? "Actualizando…" : "Actualizar"}
            <ArrowRight size={16} />
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
        {sites.length ? (
          sites.map((site) => (
            <article className="service-card" key={site.id}>
              <div className="service-top">
                <Globe2 size={24} />
                <span className="badge neutral">{labels[site.status] || site.status}</span>
              </div>
              <h3>{site.name}</h3>
              <p>{site.url}</p>
              <dl className="detail-list">
                <div>
                  <dt>Última medición</dt>
                  <dd>
                    {site.checkedAt
                      ? new Intl.DateTimeFormat("es-CL", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "America/Santiago",
                        }).format(new Date(site.checkedAt))
                      : "Sin medición"}
                  </dd>
                </div>
                <div>
                  <dt>Latencia</dt>
                  <dd>{site.latency === null ? "Sin muestra" : `${site.latency} ms`}</dd>
                </div>
                <div>
                  <dt>Certificado TLS</dt>
                  <dd>{site.ssl || "Sin comprobación"}</dd>
                </div>
              </dl>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <Globe2 size={28} />
            <h3>Tu información técnica, en un solo lugar</h3>
            <p>
              Los sitios e indicadores aparecerán cuando el equipo publique el monitoreo para tu
              empresa.
            </p>
          </div>
        )}
      </section>
      <div className="info-note">
        <Info size={17} />
        El estado técnico es independiente del estado comercial y financiero.
      </div>
    </>
  );
}
