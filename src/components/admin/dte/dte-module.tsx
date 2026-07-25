"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CircleAlert,
  CircleCheck,
  FileText,
  Hash,
  Landmark,
  Loader2,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DTE_TYPE_LABELS } from "@/lib/dte/constants";

// -- Tipos -------------------------------------------------------------------
type Summary = {
  environment: string;
  totals: { net: number; iva: number; exempt: number; grand: number; count: number };
  byInternal: Record<string, number>;
  bySii: Record<string, number>;
  byCommercial: Record<string, number>;
  foliosDisponibles: number;
  cafActivos: number;
  certificate: { status: string; daysToExpire: number | null; holder: string | null };
};
type DteDoc = {
  id: string;
  document_type: number;
  folio: number | null;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  internal_status: string;
  sii_status: string;
  commercial_status: string;
  quote_id: string | null;
  work_order_id: string | null;
  created_at: string;
  observations: string | null;
};
type Caf = {
  id: string;
  document_type: number;
  range_start: number;
  range_end: number;
  current_folio: number;
  status: string;
  total: number;
  used: number;
  available: number;
  pct: number;
};
type CertInfo = {
  holder_name: string | null;
  holder_rut: string | null;
  valid_to: string | null;
  status: string;
} | null;

type Tab = "resumen" | "documentos" | "folios" | "certificado" | "certificacion";

const clp = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(n) || 0);

const INTERNAL_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending_approval: "Por aprobar",
  validated: "Validado",
  signing: "Firmando",
  sending: "Enviando",
  emitted: "Emitido",
  error: "Error",
  voided: "Anulado",
};
const SII_LABELS: Record<string, string> = {
  not_sent: "No enviado",
  sent: "Enviado",
  in_process: "En proceso",
  accepted: "Aceptado",
  accepted_with_remarks: "Aceptado c/reparos",
  rejected: "Rechazado",
};

function statusColor(s: string) {
  if (["emitted", "accepted", "validated", "paid"].includes(s)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (["error", "rejected", "voided"].includes(s)) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (["draft", "not_sent", "pending_payment"].includes(s)) return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

// -- Componente principal ----------------------------------------------------
export function DteModule() {
  const [tab, setTab] = useState<Tab>("resumen");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [documents, setDocuments] = useState<DteDoc[]>([]);
  const [caf, setCaf] = useState<Caf[]>([]);
  const [certificate, setCertificate] = useState<CertInfo>(null);
  const [tablesMissing, setTablesMissing] = useState(false);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dte/summary", { cache: "no-store" });
      const data = await res.json();
      if (data.tablesMissing) {
        setTablesMissing(true);
      } else {
        setTablesMissing(false);
        setSummary(data.summary);
        setDocuments(data.documents ?? []);
        setCaf(data.caf ?? []);
        setCertificate(data.certificate ?? null);
      }
    } catch {
      setTablesMissing(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const env = summary?.environment ?? "certification";
  const isProd = env === "production";

  const tabs: [Tab, string, typeof FileText][] = [
    ["resumen", "Resumen", Wallet],
    ["documentos", "Documentos", FileText],
    ["folios", "Folios y CAF", Hash],
    ["certificado", "Certificado", ShieldCheck],
    ["certificacion", "Certificación", BadgeCheck],
  ];

  return (
    <div className="space-y-4">
      {/* Encabezado + ambiente */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <Landmark className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-bold">Facturación Electrónica · SII</h1>
              <p className="text-[12px] text-slate-300">Contador / Auditor · Documentos tributarios</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ring-1",
                isProd ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" : "bg-amber-500/15 text-amber-300 ring-amber-400/30",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", isProd ? "bg-emerald-400" : "bg-amber-400")} />
              {isProd ? "Producción" : "Certificación"}
            </span>
            <button
              onClick={() => void load()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
              title="Actualizar"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
        {!isProd && (
          <div className="flex items-start gap-2 border-t border-amber-100 bg-amber-50 px-5 py-2.5 text-[12px] text-amber-800">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Ambiente de certificación: los documentos generados aquí no corresponden a operaciones tributarias reales.
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-t border-slate-200 px-2 py-2 [scrollbar-width:none]">
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                tab === key ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tablesMissing ? (
        <MissingTables />
      ) : loading && !summary ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando módulo…
        </div>
      ) : (
        <>
          {tab === "resumen" && <ResumenTab summary={summary} />}
          {tab === "documentos" && <DocumentosTab documents={documents} onOpen={setActiveDoc} />}
          {tab === "folios" && <FoliosTab caf={caf} onChanged={load} />}
          {tab === "certificado" && <CertificadoTab cert={certificate} onChanged={load} />}
          {tab === "certificacion" && <CertificacionTab summary={summary} caf={caf} cert={certificate} />}
        </>
      )}

      {activeDoc && <DocDetail id={activeDoc} onClose={() => setActiveDoc(null)} onChanged={load} />}
    </div>
  );
}

// -- Resumen -----------------------------------------------------------------
function Kpi({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof FileText; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accent)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function ResumenTab({ summary }: { summary: Summary | null }) {
  if (!summary) return null;
  const t = summary.totals;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total facturado" value={clp(t.grand)} icon={Receipt} accent="bg-blue-50 text-blue-600" />
        <Kpi label="IVA débito" value={clp(t.iva)} icon={Landmark} accent="bg-violet-50 text-violet-600" />
        <Kpi label="Ventas exentas" value={clp(t.exempt)} icon={FileText} accent="bg-slate-100 text-slate-600" />
        <Kpi label="Folios disponibles" value={String(summary.foliosDisponibles)} icon={Hash} accent="bg-emerald-50 text-emerald-600" />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Breakdown title="Estado interno" data={summary.byInternal} labels={INTERNAL_LABELS} />
        <Breakdown title="Estado SII" data={summary.bySii} labels={SII_LABELS} />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-[13px] font-bold text-slate-800">Estado tributario</p>
          <Row label="Documentos" value={String(t.count)} />
          <Row label="CAF activos" value={String(summary.cafActivos)} />
          <Row
            label="Certificado"
            value={summary.certificate.status === "no_cargado" ? "No cargado" : summary.certificate.status}
            warn={summary.certificate.status === "no_cargado"}
          />
          {summary.certificate.daysToExpire != null && (
            <Row label="Vence en" value={`${summary.certificate.daysToExpire} días`} warn={summary.certificate.daysToExpire < 30} />
          )}
        </div>
      </div>
    </div>
  );
}

function Breakdown({ title, data, labels }: { title: string; data: Record<string, number>; labels: Record<string, string> }) {
  const entries = Object.entries(data);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-[13px] font-bold text-slate-800">{title}</p>
      {entries.length === 0 ? (
        <p className="text-[12px] text-slate-400">Sin documentos.</p>
      ) : (
        entries.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-1">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", statusColor(k))}>{labels[k] ?? k}</span>
            <span className="text-[13px] font-bold text-slate-700">{v}</span>
          </div>
        ))
      )}
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-1.5 last:border-0">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className={cn("text-[13px] font-bold", warn ? "text-amber-600" : "text-slate-700")}>{value}</span>
    </div>
  );
}

// -- Documentos --------------------------------------------------------------
function DocumentosTab({ documents, onOpen }: { documents: DteDoc[]; onOpen: (id: string) => void }) {
  if (documents.length === 0) {
    return <Empty icon={<FileText className="h-6 w-6" />} text="Aún no hay documentos. Se generan automáticamente al pasar una cotización a orden de trabajo." />;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="divide-y divide-slate-100">
        {documents.map((d) => (
          <button
            key={d.id}
            onClick={() => onOpen(d.id)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Receipt className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-slate-800">
                {DTE_TYPE_LABELS[d.document_type] ?? `Tipo ${d.document_type}`}
                {d.folio ? ` · Folio ${d.folio}` : " · Sin folio"}
              </p>
              <p className="text-[11px] text-slate-400">{new Date(d.created_at).toLocaleString("es-CL")}</p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-bold text-slate-800">{clp(d.total_amount)}</p>
              <p className="text-[11px] text-slate-400">Neto {clp(d.net_amount)}</p>
            </div>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1", statusColor(d.internal_status))}>
              {INTERNAL_LABELS[d.internal_status] ?? d.internal_status}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DocDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<{ document: DteDoc; items: Record<string, unknown>[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/admin/dte/documents/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [id]);

  async function confirm() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/dte/documents/${id}/confirm`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) setMsg(d.error || "No se pudo confirmar.");
      else {
        setMsg(`Folio ${d.folio} asignado. ${d.note}`);
        onChanged();
      }
    } catch {
      setMsg("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("¿Eliminar este documento tributario (borrador)?")) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/dte/documents/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(d?.error || "No se pudo eliminar.");
        setBusy(false);
        return;
      }
      onChanged();
      onClose();
    } catch {
      setMsg("Error de conexión.");
      setBusy(false);
    }
  }

  const doc = data?.document;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-[14px] font-bold text-slate-900">
            {doc ? DTE_TYPE_LABELS[doc.document_type] ?? `Tipo ${doc.document_type}` : "Documento"}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        {!doc ? (
          <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              <Info label="Estado" value={INTERNAL_LABELS[doc.internal_status] ?? doc.internal_status} />
              <Info label="Folio" value={doc.folio ? String(doc.folio) : "Sin asignar"} />
              <Info label="Neto" value={clp(doc.net_amount)} />
              <Info label="IVA" value={clp(doc.tax_amount)} />
              <Info label="Total" value={clp(doc.total_amount)} strong />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-bold text-slate-700">Detalle</p>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {(data?.items ?? []).map((it, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-[12.5px]">
                    <span className="truncate text-slate-700">
                      {String(it.description)} <span className="text-slate-400">×{String(it.quantity)}</span>
                    </span>
                    <span className="font-semibold text-slate-800">{clp(Number(it.line_total))}</span>
                  </div>
                ))}
              </div>
            </div>
            {msg && <p className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600">{msg}</p>}
            {(doc.internal_status === "draft" || doc.internal_status === "pending_approval") && (
              <button
                onClick={confirm}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
                Confirmar y asignar folio
              </button>
            )}
            {doc.internal_status !== "emitted" && doc.sii_status !== "accepted" && doc.sii_status !== "sent" && (
              <button
                onClick={remove}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-[13px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar documento
              </button>
            )}
            <p className="text-center text-[10.5px] text-slate-400">
              La firma y el envío al SII se activan al completar el certificado y la integración (fase de firma).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10.5px] font-semibold uppercase text-slate-400">{label}</p>
      <p className={cn("mt-0.5 text-slate-800", strong ? "text-[15px] font-extrabold" : "text-[13px] font-semibold")}>{value}</p>
    </div>
  );
}

// -- Folios y CAF ------------------------------------------------------------
function FoliosTab({ caf, onChanged }: { caf: Caf[]; onChanged: () => void }) {
  const [xml, setXml] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function upload() {
    if (!xml.trim() || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/dte/caf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml }),
      });
      const d = await res.json();
      if (!res.ok) setMsg(d.error || "No se pudo cargar el CAF.");
      else {
        setMsg("CAF cargado correctamente.");
        setXml("");
        onChanged();
      }
    } catch {
      setMsg("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setXml(String(reader.result || ""));
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[13px] font-bold text-slate-800">Cargar CAF (autorización de folios del SII)</p>
        <p className="mt-0.5 text-[12px] text-slate-500">Sube el archivo XML del CAF obtenido en el SII. Se valida su estructura y rango.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input type="file" accept=".xml,text/xml" onChange={onFile} className="text-[12px] text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold" />
          <button
            onClick={upload}
            disabled={busy || !xml.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Cargar CAF
          </button>
        </div>
        {msg && <p className="mt-2 text-[12px] text-slate-600">{msg}</p>}
      </div>

      {caf.length === 0 ? (
        <Empty icon={<Hash className="h-6 w-6" />} text="Sin CAF cargados. Sin folios no se pueden emitir documentos." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {caf.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-slate-800">{DTE_TYPE_LABELS[c.document_type] ?? `Tipo ${c.document_type}`}</p>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold ring-1", statusColor(c.status === "active" ? "validated" : c.status))}>
                  {c.status === "active" ? "Activo" : c.status === "exhausted" ? "Agotado" : c.status}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-slate-500">Rango {c.range_start} – {c.range_end}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={cn("h-full rounded-full", c.pct < 15 ? "bg-rose-500" : c.pct < 40 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.max(3, c.pct)}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                <span>{c.available} disponibles</span>
                <span>{c.used} usados</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -- Certificado -------------------------------------------------------------
function CertificadoTab({ cert, onChanged }: { cert: CertInfo; onChanged: () => void }) {
  const [password, setPassword] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    if (!password || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/dte/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, fileName }),
      });
      const d = await res.json();
      if (!res.ok) setMsg(d.error || "No se pudo guardar.");
      else {
        setMsg("Certificado registrado. La contraseña quedó cifrada.");
        setPassword("");
        onChanged();
      }
    } catch {
      setMsg("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className={cn("h-5 w-5", cert ? "text-emerald-600" : "text-slate-300")} />
          <p className="text-[13px] font-bold text-slate-800">Certificado digital</p>
        </div>
        {cert ? (
          <div className="mt-2 space-y-1 text-[12.5px] text-slate-600">
            <Row label="Titular" value={cert.holder_name || "Registrado"} />
            <Row label="RUT" value={cert.holder_rut || "—"} />
            <Row label="Vence" value={cert.valid_to ? new Date(cert.valid_to).toLocaleDateString("es-CL") : "—"} />
            <Row label="Estado" value={cert.status} />
          </div>
        ) : (
          <p className="mt-1 text-[12px] text-slate-500">No hay certificado registrado.</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[13px] font-bold text-slate-800">Registrar certificado (PFX / P12)</p>
        <div className="mt-3 space-y-2">
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Nombre del archivo del certificado (referencia)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-400 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña del certificado"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-400 focus:outline-none"
          />
          <button
            onClick={save}
            disabled={busy || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Guardar de forma cifrada
          </button>
          {msg && <p className="text-[12px] text-slate-600">{msg}</p>}
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-400">
          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
          La contraseña se cifra en reposo (AES-256-GCM) y nunca se expone. La lectura de metadatos y la firma se
          habilitan en la etapa de firma. Requiere SII_ENCRYPTION_KEY configurada.
        </p>
      </div>
    </div>
  );
}

// -- Certificación -----------------------------------------------------------
function CertificacionTab({ summary, caf, cert }: { summary: Summary | null; caf: Caf[]; cert: CertInfo }) {
  const checks = useMemo(() => {
    return [
      { label: "Tablas tributarias creadas", ok: !!summary, hint: "Corre supabase/tax_dte_schema.sql" },
      { label: "Certificado registrado", ok: !!cert, hint: "Registra tu certificado en la pestaña Certificado" },
      { label: "CAF cargado con folios", ok: caf.some((c) => c.available > 0), hint: "Carga un CAF válido con folios disponibles" },
      { label: "Documentos de prueba", ok: (summary?.totals.count ?? 0) > 0, hint: "Genera documentos (cotización → orden de trabajo)" },
      { label: "Firma XML (XML-DSIG + TED)", ok: false, hint: "Etapa criptográfica pendiente" },
      { label: "Integración de envío al SII", ok: false, hint: "Autenticación y envío pendientes" },
    ];
  }, [summary, caf, cert]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[13px] font-bold text-slate-800">Diagnóstico de certificación</p>
        <p className="mt-0.5 text-[12px] text-slate-500">Estado de los requisitos para certificar el software ante el SII.</p>
        <div className="mt-3 space-y-1.5">
          {checks.map((c) => (
            <div key={c.label} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              {c.ok ? (
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-700">{c.label}</p>
                {!c.ok && <p className="text-[11px] text-slate-400">{c.hint}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        El sistema no está certificado hasta completar el proceso formal ante el SII con evidencia oficial. Los pasos de
        firma y envío están preparados y se activan con el certificado y la integración correspondiente.
      </div>
    </div>
  );
}

// -- Auxiliares --------------------------------------------------------------
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-400">
      <span className="text-slate-300">{icon}</span>
      <p className="max-w-sm text-[13px]">{text}</p>
    </div>
  );
}

function MissingTables() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
      <TriangleAlert className="mx-auto h-7 w-7 text-amber-500" />
      <p className="mt-2 text-[14px] font-bold text-amber-800">Falta crear las tablas tributarias</p>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] text-amber-700">
        Corre en Supabase el archivo <span className="font-mono font-semibold">supabase/tax_dte_schema.sql</span> para
        activar el módulo de facturación electrónica.
      </p>
    </div>
  );
}
