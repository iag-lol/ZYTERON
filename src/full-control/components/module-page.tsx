"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import Link from "@control/components/routed-link";
import { DataTable } from "@control/components/enterprise/data-table";
import { PageHeader } from "@control/components/enterprise/page-header";
import { RoleGuard } from "@control/components/enterprise/access";
import { getModuleDescriptor } from "@control/lib/module-content";
import { ControlDashboard } from "./control-dashboard";
import { useAccess } from "./access-context";
import { apiHeaders } from "@control/lib/api-auth";
import { clientsApi } from "@control/lib/clients-api";

type Row = Record<string, unknown>;
type ReportRow = { name: string; status: string; value: string; date: string; href?: string };
const sources: Record<string, { path: string; rows?: string; summary?: string; href: string }> = {
  commercial: { path: "/commercial/summary", href: "/commercial" },
  clients: { path: "/clients?pageSize=100", rows: "items", href: "/clients" },
  projects: { path: "/projects?pageSize=100", rows: "items", href: "/projects" },
  development: { path: "/development/summary", href: "/development" },
  uptime: { path: "/monitoring/monitors?pageSize=100", rows: "items", href: "/monitoring" },
  audits: { path: "/audits/workspace", rows: "audits", href: "/audits" },
  hr: { path: "/hr/workspace", summary: "summary", href: "/hr" },
  finance: { path: "/finance/dashboard", summary: "kpis", href: "/finance" },
  security: { path: "/security/workspace", summary: "summary", href: "/security" },
};
const text = (value: unknown) =>
  value == null ? "—" : typeof value === "object" ? "—" : String(value);
export function ModulePage({ pathname }: { pathname: string }) {
  if (pathname === "/command-center") return <ControlDashboard />;
  return <ConnectedModule pathname={pathname} />;
}
function ConnectedModule({ pathname }: { pathname: string }) {
  const descriptor = getModuleDescriptor(pathname),
    { role } = useAccess();
  const [rows, setRows] = useState<ReportRow[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false);
  const domain = pathname.split("/")[2] || "commercial";
  const source = pathname.startsWith("/reports") ? sources[domain] : undefined;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const read = async (path: string) => {
        const r = await fetch("/api/control-core/api" + path, {
          headers: await apiHeaders(role),
          cache: "no-store",
        });
        const b = await r.json();
        if (!r.ok) throw new Error(b.message || "No se pudo cargar el informe.");
        return b;
      };
      let values: ReportRow[];
      if (pathname === "/activity") {
        const responses = await Promise.allSettled([
          read("/commercial/activity"),
          read("/operations/activity"),
        ]);
        if (responses.every((r) => r.status === "rejected"))
          throw new Error("No se pudo cargar la actividad. Vuelve a intentarlo.");
        values = responses
          .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
          .map((r: Row) => ({
            name: text(r.eventType),
            status: text(r.aggregateType),
            value: text(r.aggregateId),
            date: text(r.occurredAt),
          }))
          .sort((a, b) => b.date.localeCompare(a.date));
        if (responses.some((r) => r.status === "rejected"))
          setError("Una fuente de actividad no respondió. Se muestran las fuentes disponibles.");
      } else if (pathname === "/notifications") {
        const responses = await Promise.allSettled([
          read("/monitoring/alerts"),
          read("/finance/notifications"),
        ]);
        if (responses.every((r) => r.status === "rejected"))
          throw new Error("No se pudieron cargar las notificaciones.");
        values = responses
          .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
          .map((r: Row) => ({
            name: text(r.title),
            status: r.readAt ? "Leída" : "Pendiente",
            value: text(r.body || r.message),
            date: text(r.createdAt),
            href:
              typeof r.href === "string" && /^\/(monitoring|finance)(\/|$)/.test(r.href)
                ? r.href
                : undefined,
          }))
          .sort((a, b) => b.date.localeCompare(a.date));
        if (responses.some((r) => r.status === "rejected"))
          setError("Una fuente de notificaciones no respondió.");
      } else {
        if (!source) throw new Error("Esta vista no tiene un informe configurado.");
        const data = await read(source.path);
        if (source.rows)
          values = (data[source.rows] || []).map((r: Row) => ({
            name: text(r.name || r.legalName || r.auditNumber || r.projectNumber),
            status: text(r.status),
            value: text(r.clientName || r.tradeName || r.url || r.scope),
            date: text(r.updatedAt || r.createdAt || r.scheduledAt),
            href:
              typeof r.id === "string" && domain === "projects"
                ? `/projects/${r.id}`
                : typeof r.id === "string" && domain === "clients"
                  ? `/clients/${r.id}`
                  : source.href,
          }));
        else if (source.summary && Array.isArray(data[source.summary]))
          values = data[source.summary].map((r: Row) => ({
            name: text(r.label),
            status: text(r.currency || r.tone),
            value: text(r.value),
            date: data.generatedAt || new Date().toISOString(),
            href: source.href,
          }));
        else
          values = Object.entries(source.summary ? data[source.summary] || {} : data)
            .filter(([, v]) => typeof v === "number" || typeof v === "string" || v === null)
            .map(([name, value]) => ({
              name: name.replace(/([A-Z])/g, " $1"),
              status: "Dato registrado",
              value: text(value),
              date:
                typeof data.generatedAt === "string" ? data.generatedAt : new Date().toISOString(),
              href: source.href,
            }));
      }
      setRows(values);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "No se pudo cargar esta vista.");
    } finally {
      setLoading(false);
    }
  }, [pathname, role, source, domain]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        [r.name, r.status, r.value].some((v) => v.toLowerCase().includes(query.toLowerCase())),
      ),
    [query, rows],
  );
  async function download() {
    setBusy(true);
    try {
      await clientsApi.auditExport(role, pathname);
      const cell = (v: string) =>
        '"' + (/^[=+\-@\t\r]/.test(v) ? "'" + v : v).replaceAll('"', '""') + '"';
      const content = [
        ["Nombre", "Estado", "Información", "Fecha"],
        ...filtered.map((r) => [r.name, r.status, r.value, r.date]),
      ]
        .map((r) => r.map(cell).join(";"))
        .join("\r\n");
      const url = URL.createObjectURL(
        new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `zyteron-${pathname.split("/").filter(Boolean).join("-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo exportar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <RoleGuard group={descriptor.group}>
      <main className="modulePage">
        <PageHeader
          eyebrow={descriptor.group}
          title={descriptor.title}
          description="Información conectada a los registros de administración. La publicación al cliente se controla en cada expediente."
          actions={
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button className="pagePrimaryAction" type="button" onClick={() => void load()} disabled={loading}>
                <RefreshCw size={15} /> Actualizar
              </button>
              <button
                className="pagePrimaryAction"
                type="button"
                onClick={() => void download()}
                disabled={busy || loading || !filtered.length}
              >
                <Download size={15} /> Exportar CSV
              </button>
            </div>
          }
        />
        {error ? (
          <p role="alert" className="domainError">
            {error}
          </p>
        ) : null}
        <section className="modulePanel">
          <div className="filterBar">
            <label>
              <Search size={15} />
              <input
                aria-label="Buscar en los registros"
                placeholder="Buscar en esta vista"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <span>
              {filtered.length} registros{rows.length === 100 ? " · Últimos 100" : ""}
            </span>
          </div>
          {loading ? (
            <p role="status">Cargando registros…</p>
          ) : (
            <DataTable
              columns={["Nombre", "Estado", "Información", "Fecha"]}
              rows={filtered.map((r) => [
                r.href ? <Link href={r.href}>{r.name}</Link> : r.name,
                r.status,
                r.value,
                r.date === "—" ? r.date : new Date(r.date).toLocaleString("es-CL"),
              ])}
              emptyMessage={
                query
                  ? "No hay coincidencias con esta búsqueda."
                  : "No hay registros disponibles en esta vista."
              }
            />
          )}
        </section>
      </main>
    </RoleGuard>
  );
}
