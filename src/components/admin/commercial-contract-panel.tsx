"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  Download,
  Eye,
  FileSignature,
  FileText,
  History,
  Loader2,
  Mail,
  Printer,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import {
  CONTRACT_PROGRESS_STEPS,
  CONTRACT_STATUS_INFO,
  CONTRACT_TYPE_INFO,
  MAX_COMMISSION_PCT,
  SIGNATURE_METHODS,
  SIGNATURE_TYPE_INFO,
  isIssued,
} from "@/config/contracts";
import { formatDate, readJson } from "@/lib/commercial/format";
import {
  DataItem,
  EmptyState,
  ErrorNote,
  GhostButton,
  InputField,
  Panel,
  Pill,
  PrimaryButton,
  SectionTitle,
  SelectField,
  TextareaField,
} from "@/components/commercial/ui";
import { cn } from "@/lib/utils";

/**
 * Sección "Contrato y documentación" de la ficha del ejecutivo o partner.
 *
 * Reutiliza los datos que ya están en la ficha: aquí solo se ajusta la
 * configuración contractual, se revisa, se emite el documento y se lleva su
 * ciclo de vida. Los botones que se muestran dependen del estado actual.
 */

type FieldState = "ok" | "missing" | "invalid" | "review";

type ValidationField = { label: string; value: string; state: FieldState; message?: string; blocking: boolean };
type ValidationSection = { id: string; title: string; fields: ValidationField[] };

type Config = {
  contractType: "executive_services" | "partner_agreement";
  city: string;
  contractDate: string;
  startDate: string;
  functionalRole: string;
  commissionPercentage: number;
  commissionBase: string;
  noticeDays: number;
  commissionTailDays: number;
  validity: string;
  signatureMethod: string;
  corporateEmail: string;
  includeBankAnnex: boolean;
  observations: string;
  representativeName: string;
  representativeRut: string;
};

type ContractRecord = {
  id: string;
  contract_number: string | null;
  contract_type: string;
  template_id: string;
  template_version: string;
  version: number;
  status: string;
  pdf_hash: string | null;
  signed_pdf_hash: string | null;
  pdf_filename: string | null;
  generated_at: string | null;
  sent_at: string | null;
  sent_to: string | null;
  signed_at: string | null;
  signature_type: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
  signature_notes: string | null;
  created_at: string;
};

type EmailLog = {
  id: string;
  recipient: string;
  cc: string | null;
  subject: string;
  provider_message_id: string | null;
  status: string;
  error_message: string | null;
  attempt: number;
  sent_at: string | null;
  created_at: string;
};

type Context = {
  user: { id: string; name: string; rut: string; email: string | null; role: string };
  contracts: ContractRecord[];
  active: ContractRecord | null;
  config: Config;
  validation: { sections: ValidationSection[]; blockers: string[]; warnings: string[]; canGenerate: boolean };
  emails: EmailLog[];
  templateLabel: string;
};

const STATE_STYLE: Record<FieldState, { label: string; cls: string }> = {
  ok: { label: "Completo", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  missing: { label: "Pendiente", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  invalid: { label: "Inválido", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  review: { label: "Requiere revisión", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
};

export function CommercialContractPanel({
  ownerId,
  onChanged,
}: {
  ownerId: string;
  onChanged: (message: string) => void;
}) {
  const [context, setContext] = useState<Context | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ url: string; filename: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [modal, setModal] = useState<null | "send" | "signed" | "version" | "cancel" | "terminate" | "reject">(null);
  const printFrame = useRef<HTMLIFrameElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = (await readJson(
        await fetch(`/api/admin/comercial/contracts?ownerId=${ownerId}`, { cache: "no-store" }),
      )) as unknown as Context;
      setContext(data);
      setConfig(data.config);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la sección de contrato.");
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Libera el object URL de la vista previa al cambiarla o desmontar.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const active = context?.active ?? null;
  const status = active?.status ?? (context?.validation.canGenerate ? "draft" : "incomplete");
  const statusInfo = CONTRACT_STATUS_INFO[status] ?? CONTRACT_STATUS_INFO.draft;
  const issued = active ? isIssued(active.status) : false;

  const run = useCallback(
    async (fn: () => Promise<unknown>, message: string) => {
      setBusy(true);
      setError("");
      try {
        await fn();
        await load();
        onChanged(message);
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo completar la acción.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load, onChanged],
  );

  async function saveDraft() {
    if (!config) return;
    await run(
      async () =>
        readJson(
          await fetch("/api/admin/comercial/contracts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ownerId, config }),
          }),
        ),
      "Borrador guardado.",
    );
  }

  async function buildPreview() {
    if (!config) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/comercial/contracts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId, config }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo generar la vista previa.");
      }
      // El backend informa el nombre del archivo; se conserva para que la
      // descarga del borrador salga con un nombre legible.
      const header = response.headers.get("Content-Disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(header)?.[1] ?? "Borrador_contrato.pdf";
      const blob = new Blob([await response.arrayBuffer()], { type: "application/pdf" });
      if (preview) URL.revokeObjectURL(preview.url);
      setPreview({ url: URL.createObjectURL(blob), filename });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo generar la vista previa.");
    } finally {
      setBusy(false);
    }
  }

  async function act(action: string, extra: Record<string, unknown> = {}, message = "Listo.") {
    // `version` devuelve el número y la versión emitidos, para informarlos.
    if (!active) return;
    // Una acción que reemite el documento invalida la vista previa anterior.
    if (action === "version" && preview) {
      URL.revokeObjectURL(preview.url);
      setPreview(null);
    }
    let detail = "";
    await run(
      async () => {
        const data = await readJson(
          await fetch(`/api/admin/comercial/contracts/${active.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, ...extra }),
          }),
        );
        if (action === "version" && data.number) {
          detail =
            data.mode === "amended"
              ? ` Documento modificatorio ${data.number} emitido y pendiente de firma.`
              : ` ${data.number} versión ${data.version} generada.`;
        }
        return data;
      },
      message,
    );
    if (detail) onChanged(`${message}${detail}`);
    setModal(null);
  }

  function fileHref(kind: "original" | "signed", disposition: "inline" | "attachment") {
    if (!active) return "#";
    // La huella del documento entra en la URL: si el contrato se actualiza,
    // la dirección cambia y el navegador no puede servir el PDF anterior.
    const stamp = (kind === "signed" ? active.signed_pdf_hash : active.pdf_hash)?.slice(0, 12) ?? active.version;
    return `/api/admin/comercial/contracts/${active.id}/pdf?kind=${kind}&disposition=${disposition}&v=${active.version}&h=${stamp}`;
  }

  function printContract() {
    if (!active) return;
    const frame = printFrame.current;
    if (!frame) return;
    frame.src = fileHref("original", "inline");
    frame.onload = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        window.open(fileHref("original", "inline"), "_blank", "noopener");
      }
    };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando contrato…
      </div>
    );
  }
  if (!context || !config) return <ErrorNote>{error || "No se pudo cargar la sección."}</ErrorNote>;

  const set = <K extends keyof Config>(key: K, value: Config[K]) =>
    setConfig((current) => (current ? { ...current, [key]: value } : current));

  return (
    <div className="space-y-5">
      <iframe ref={printFrame} title="Impresión" className="hidden" />
      {error && <ErrorNote>{error}</ErrorNote>}

      {/* Encabezado con estado y acciones según el momento del ciclo */}
      <Panel
        title="Contrato y documentación"
        description={context.templateLabel}
        icon={<FileSignature className="h-4 w-4" />}
        action={<Pill label={statusInfo.label} cls={statusInfo.cls} />}
      >
        <p className="text-[12px] leading-5 text-slate-500">{statusInfo.description}</p>

        <ol className="mt-4 flex flex-wrap items-center gap-1.5">
          {CONTRACT_PROGRESS_STEPS.map((step, index) => {
            const reached = statusInfo.step >= index + 1;
            return (
              <li key={step} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold ring-1 ring-inset",
                    reached ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-slate-50 text-slate-400 ring-slate-200",
                  )}
                >
                  {reached && <CheckCircle2 className="h-3 w-3" />} {step}
                </span>
                {index < CONTRACT_PROGRESS_STEPS.length - 1 && <span className="h-px w-3 bg-slate-200" />}
              </li>
            );
          })}
        </ol>

        {active && (
          <dl className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3 lg:grid-cols-4">
            <DataItem label="N° de contrato" value={active.contract_number ?? "Sin emitir"} mono />
            <DataItem label="Versión" value={`v${active.version}`} />
            <DataItem label="Plantilla" value={`${active.template_id} · v${active.template_version}`} />
            <DataItem label="Emitido" value={formatDate(active.generated_at, true)} />
            <DataItem label="Enviado" value={active.sent_to ? `${formatDate(active.sent_at)} · ${active.sent_to}` : "—"} />
            <DataItem label="Firmado" value={formatDate(active.signed_at)} />
            <DataItem label="Validado" value={formatDate(active.validated_at)} />
            <DataItem label="Hash SHA-256" value={active.pdf_hash ? `${active.pdf_hash.slice(0, 20)}…` : "—"} mono />
          </dl>
        )}

        {active?.rejection_reason && (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-800">
            <strong>Observación:</strong> {active.rejection_reason}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!issued && (
            <>
              <GhostButton onClick={() => void buildPreview()} disabled={busy}>
                <Eye className="h-4 w-4" /> Ver borrador
              </GhostButton>
              <GhostButton onClick={() => void saveDraft()} disabled={busy}>
                Guardar datos
              </GhostButton>
              <PrimaryButton
                onClick={() => void act("issue", {}, "Contrato generado con número único y hash de integridad.")}
                disabled={busy || !context.validation.canGenerate || !confirmed || !active}
                title={
                  !active
                    ? "Guarda primero el borrador."
                    : !context.validation.canGenerate
                      ? "Faltan datos obligatorios."
                      : !confirmed
                        ? "Debes confirmar la revisión."
                        : undefined
                }
              >
                <FileText className="h-4 w-4" /> Generar contrato definitivo
              </PrimaryButton>
            </>
          )}

          {issued && (
            <>
              <a
                href={fileHref("original", "attachment")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12.5px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" /> Descargar PDF
              </a>
              <a
                href={fileHref("original", "inline")}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12.5px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" /> Abrir en pestaña
              </a>
              <GhostButton onClick={printContract}>
                <Printer className="h-4 w-4" /> Imprimir
              </GhostButton>
              <PrimaryButton onClick={() => setModal("send")} disabled={busy}>
                <Send className="h-4 w-4" /> {active?.sent_at ? "Reenviar" : "Enviar por correo"}
              </PrimaryButton>
            </>
          )}

          {active?.sent_at && !active.signed_at && (
            <GhostButton onClick={() => void act("received", {}, "Recepción registrada.")} disabled={busy}>
              Registrar respuesta
            </GhostButton>
          )}

          {issued && active?.status !== "validated" && (
            <GhostButton onClick={() => setModal("signed")} disabled={busy}>
              <Upload className="h-4 w-4" /> Subir contrato firmado
            </GhostButton>
          )}

          {active?.status === "signed_pending" && (
            <>
              <PrimaryButton
                onClick={() => void act("validate", {}, "Firma validada. La persona queda habilitada.")}
                disabled={busy}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <BadgeCheck className="h-4 w-4" /> Validar firma
              </PrimaryButton>
              <GhostButton onClick={() => setModal("reject")} disabled={busy} className="text-rose-600">
                <XCircle className="h-4 w-4" /> Rechazar firma
              </GhostButton>
            </>
          )}

          {active?.signed_pdf_hash && (
            <a
              href={fileHref("signed", "inline")}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12.5px] font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <FileSignature className="h-4 w-4" /> Ver contrato firmado
            </a>
          )}

          {issued && (
            <GhostButton onClick={() => setModal("version")} disabled={busy}>
              <RefreshCw className="h-4 w-4" /> Actualizar contrato
            </GhostButton>
          )}
          {active && !isIssued(active.status) && (
            <GhostButton onClick={() => setModal("cancel")} disabled={busy} className="text-rose-600">
              Anular
            </GhostButton>
          )}
          {active?.status === "validated" && (
            <GhostButton onClick={() => setModal("terminate")} disabled={busy} className="text-rose-600">
              Finalizar relación
            </GhostButton>
          )}
        </div>
      </Panel>

      {/* Validación previa por secciones */}
      <Panel
        title="Revisión previa"
        description="Estado de cada dato antes de emitir el documento."
        icon={<ShieldCheck className="h-4 w-4" />}
      >
        {context.validation.blockers.length > 0 && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="flex items-center gap-2 text-[12.5px] font-extrabold text-rose-800">
              <CircleAlert className="h-4 w-4" /> No se puede emitir el documento todavía
            </p>
            <ul className="mt-2 space-y-1">
              {context.validation.blockers.map((item) => (
                <li key={item} className="text-[11.5px] leading-5 text-rose-700">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {context.validation.warnings.map((item) => (
          <p
            key={item}
            className="mb-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[11.5px] leading-5 text-amber-800"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {item}
          </p>
        ))}

        <div className="mt-2 grid gap-4 lg:grid-cols-2">
          {context.validation.sections.map((section) => (
            <section key={section.id} className="rounded-xl border border-slate-200 p-4">
              <SectionTitle>{section.title}</SectionTitle>
              <ul className="mt-3 space-y-2">
                {section.fields.map((item) => (
                  <li key={item.label} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-bold text-slate-700">{item.label}</p>
                      <p className="truncate text-[11.5px] text-slate-500">{item.value}</p>
                      {item.message && <p className="text-[10.5px] text-slate-400">{item.message}</p>}
                    </div>
                    <Pill label={STATE_STYLE[item.state].label} cls={STATE_STYLE[item.state].cls} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Panel>

      {/* Configuración del contrato */}
      {!issued && (
        <Panel
          title="Configuración del contrato"
          description="Los datos personales y bancarios se toman de la ficha; aquí se ajustan las condiciones."
          icon={<FileText className="h-4 w-4" />}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Tipo de contrato"
              value={config.contractType}
              onChange={(event) => set("contractType", event.target.value as Config["contractType"])}
              hint="Se preselecciona según el rol. Cambiarlo queda registrado en auditoría."
            >
              {Object.entries(CONTRACT_TYPE_INFO).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </SelectField>
            <InputField label="Ciudad de firma" value={config.city} onChange={(e) => set("city", e.target.value)} required />
            <InputField
              label="Fecha del contrato"
              type="date"
              value={config.contractDate}
              onChange={(e) => set("contractDate", e.target.value)}
              required
            />
            <InputField
              label="Cargo funcional"
              value={config.functionalRole}
              onChange={(e) => set("functionalRole", e.target.value)}
              required
            />
            <InputField
              label="Fecha de inicio"
              type="date"
              value={config.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
            <InputField
              label="Porcentaje de comisión"
              type="number"
              min={0}
              max={MAX_COMMISSION_PCT}
              step="0.5"
              value={String(config.commissionPercentage)}
              onChange={(e) => set("commissionPercentage", Number(e.target.value))}
              required
              hint={`Máximo autorizado: ${MAX_COMMISSION_PCT}%.`}
            />
            <InputField
              label="Base de cálculo"
              className="lg:col-span-3"
              value={config.commissionBase}
              onChange={(e) => set("commissionBase", e.target.value)}
              required
            />
            <InputField
              label="Días de aviso de término"
              type="number"
              min={0}
              value={String(config.noticeDays)}
              onChange={(e) => set("noticeDays", Number(e.target.value))}
            />
            <InputField
              label="Días de comisiones posteriores"
              type="number"
              min={0}
              value={String(config.commissionTailDays)}
              onChange={(e) => set("commissionTailDays", Number(e.target.value))}
            />
            <InputField label="Vigencia" value={config.validity} onChange={(e) => set("validity", e.target.value)} />
            <SelectField
              label="Medio de firma"
              value={config.signatureMethod}
              onChange={(e) => set("signatureMethod", e.target.value)}
            >
              {SIGNATURE_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </SelectField>
            <InputField
              label="Correo corporativo asignado"
              type="email"
              value={config.corporateEmail}
              onChange={(e) => set("corporateEmail", e.target.value)}
              hint="Si aún no existe, déjalo vacío."
            />
            <InputField
              label="Representante legal"
              value={config.representativeName}
              onChange={(e) => set("representativeName", e.target.value)}
              required
            />
            <InputField
              label="RUT del representante"
              value={config.representativeRut}
              onChange={(e) => set("representativeRut", e.target.value)}
              placeholder="12.345.678-9"
              required
            />
            <label className="flex items-center gap-2 self-end pb-2 text-[12px] font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={config.includeBankAnnex}
                onChange={(e) => set("includeBankAnnex", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Incluir anexo bancario
            </label>
            <TextareaField
              label="Observaciones especiales"
              className="sm:col-span-2 lg:col-span-3"
              rows={3}
              value={config.observations}
              onChange={(e) => set("observations", e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <label className="flex max-w-2xl items-start gap-2.5 text-[12px] leading-5 text-slate-600">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
              />
              Confirmo que revisé los datos personales, comerciales y contractuales antes de generar el documento
              definitivo.
            </label>
            <div className="flex gap-2">
              <GhostButton onClick={() => void buildPreview()} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Vista previa
              </GhostButton>
              <PrimaryButton onClick={() => void saveDraft()} disabled={busy}>
                Guardar borrador
              </PrimaryButton>
            </div>
          </div>
        </Panel>
      )}

      {/* Vista previa: PDF descargable + visor embebido */}
      {preview && (
        <Panel
          title="Vista previa del documento"
          description="Es el PDF real con marca de agua «BORRADOR». Descárgalo, ábrelo en una pestaña o revísalo aquí."
          icon={<Eye className="h-4 w-4" />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={preview.url}
                download={preview.filename}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-blue-700"
              >
                <Download className="h-3.5 w-3.5" /> Descargar borrador
              </a>
              <a
                href={preview.url}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11.5px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <Eye className="h-3.5 w-3.5" /> Abrir en pestaña
              </a>
              <GhostButton onClick={() => setPreview(null)} className="px-3 py-1.5 text-[11.5px]">
                Cerrar
              </GhostButton>
            </div>
          }
          padded={false}
        >
          <iframe
            src={preview.url}
            title="Vista previa del contrato"
            className="h-[70vh] w-full border-0 bg-slate-100"
          />
          <p className="border-t border-slate-100 px-5 py-3 text-[11px] leading-5 text-slate-500">
            Archivo: <span className="font-mono">{preview.filename}</span> · No queda almacenado ni numerado: es solo
            para revisión. Si el visor no carga en tu navegador, descarga el archivo o ábrelo en una pestaña con los
            botones de arriba.
          </p>
        </Panel>
      )}

      {/* Historial */}
      <Panel
        title="Historial contractual"
        description="Ningún documento se elimina: se anula, se reemplaza o se versiona."
        icon={<History className="h-4 w-4" />}
        padded={false}
      >
        {context.contracts.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-4 w-4" />}
            title="Todavía no hay documentos"
            text="Configura las condiciones y genera el primer contrato."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-2.5">N° / versión</th>
                  <th className="px-3 py-2.5">Tipo</th>
                  <th className="px-3 py-2.5">Generado</th>
                  <th className="px-3 py-2.5">Enviado</th>
                  <th className="px-3 py-2.5">Firmado</th>
                  <th className="px-3 py-2.5">Hash</th>
                  <th className="px-5 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {context.contracts.map((item) => {
                  const info = CONTRACT_STATUS_INFO[item.status] ?? CONTRACT_STATUS_INFO.draft;
                  return (
                    <tr key={item.id} className="text-[12px] text-slate-600">
                      <td className="px-5 py-3">
                        <p className="font-mono font-bold text-slate-800">{item.contract_number ?? "Sin emitir"}</p>
                        <p className="text-[10.5px] text-slate-400">v{item.version}</p>
                      </td>
                      <td className="px-3 py-3 text-[11.5px]">
                        {CONTRACT_TYPE_INFO[item.contract_type as keyof typeof CONTRACT_TYPE_INFO]?.label ??
                          item.contract_type}
                      </td>
                      <td className="px-3 py-3 text-[11.5px]">{formatDate(item.generated_at)}</td>
                      <td className="px-3 py-3 text-[11.5px]">{formatDate(item.sent_at)}</td>
                      <td className="px-3 py-3 text-[11.5px]">
                        {formatDate(item.signed_at)}
                        {item.signature_type && (
                          <span className="block text-[10px] text-slate-400">{item.signature_type}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-[10px] text-slate-400">
                        {item.pdf_hash ? `${item.pdf_hash.slice(0, 12)}…` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Pill label={info.label} cls={info.cls} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Registro de correos */}
      {context.emails.length > 0 && (
        <Panel
          title="Registro de envíos"
          description="Cada intento, con su identificador de proveedor o el error devuelto."
          icon={<Mail className="h-4 w-4" />}
          padded={false}
        >
          <ul className="divide-y divide-slate-100">
            {context.emails.map((log) => (
              <li key={log.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-slate-800">{log.recipient}</p>
                  <p className="truncate text-[11px] text-slate-500">{log.subject}</p>
                  {log.error_message && <p className="text-[11px] text-rose-600">{log.error_message}</p>}
                  {log.provider_message_id && (
                    <p className="font-mono text-[10px] text-slate-400">{log.provider_message_id}</p>
                  )}
                </div>
                <div className="text-right">
                  <Pill
                    label={log.status === "sent" ? "Entregado" : "Falló"}
                    cls={
                      log.status === "sent"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-rose-50 text-rose-700 ring-rose-200"
                    }
                  />
                  <p className="mt-1 text-[10.5px] text-slate-400">
                    Intento {log.attempt} · {formatDate(log.sent_at ?? log.created_at, true)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {modal === "send" && active && (
        <SendModal contractId={active.id} onClose={() => setModal(null)} onSent={async () => {
          setModal(null);
          await load();
          onChanged("Contrato enviado y registrado.");
        }} />
      )}

      {modal === "signed" && active && (
        <SignedModal contractId={active.id} onClose={() => setModal(null)} onUploaded={async () => {
          setModal(null);
          await load();
          onChanged("Copia firmada registrada. Queda pendiente de validación.");
        }} />
      )}

      {(modal === "version" || modal === "cancel" || modal === "terminate" || modal === "reject") && (
        <ReasonModal
          title={
            modal === "version"
              ? "Actualizar contrato"
              : modal === "cancel"
                ? "Anular contrato"
                : modal === "terminate"
                  ? "Finalizar relación contractual"
                  : "Rechazar la firma"
          }
          hint={
            modal === "version"
              ? active && ["signed_pending", "signed", "validated"].includes(active.status)
                ? "Este convenio ya está firmado y no puede alterarse. Se emitirá un documento modificatorio con identificador propio, que quedará pendiente de firma. El documento firmado se conserva intacto en el historial."
                : "Se generará una nueva versión del contrato utilizando los datos actuales del Partner y la última plantilla disponible. La versión anterior se conservará en el historial."
              : modal === "reject"
                ? "Indica qué debe corregirse. El prestador recibirá un aviso con este texto."
                : "Queda registrado en la bitácora de auditoría."
          }
          busy={busy}
          onClose={() => setModal(null)}
          submitLabel={modal === "version" ? "Generar nueva versión" : "Confirmar"}
          onSubmit={(reason) =>
            act(
              modal,
              { reason },
              modal === "version"
                ? "Contrato actualizado."
                : modal === "cancel"
                  ? "Contrato anulado."
                  : modal === "terminate"
                    ? "Relación finalizada."
                    : "Firma rechazada.",
            )
          }
        />
      )}
    </div>
  );
}

function ModalShell({
  title,
  hint,
  onClose,
  children,
}: {
  title: string;
  hint?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="sticky top-0 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h3 className="text-[16px] font-extrabold text-slate-900">{title}</h3>
            {hint && <p className="mt-0.5 text-[11.5px] leading-5 text-slate-500">{hint}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function SendModal({
  contractId,
  onClose,
  onSent,
}: {
  contractId: string;
  onClose: () => void;
  onSent: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<{ recipient: string; cc: string; subject: string; body: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await readJson(
          await fetch(`/api/admin/comercial/contracts/${contractId}/send`, { cache: "no-store" }),
        );
        const payload = data.draft as { recipient: string; cc: string; subject: string; body: string };
        if (active) setDraft({ ...payload, cc: payload.cc ?? "" });
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudo preparar el correo.");
      }
    })();
    return () => {
      active = false;
    };
  }, [contractId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      await readJson(
        await fetch(`/api/admin/comercial/contracts/${contractId}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        }),
      );
      await onSent();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el correo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Enviar contrato"
      hint="Se adjunta automáticamente el PDF emitido. El destinatario es el correo personal, no el corporativo."
      onClose={onClose}
    >
      {!draft ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Preparando el correo…
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 p-5">
          <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Destinatario"
              type="email"
              required
              value={draft.recipient}
              onChange={(e) => setDraft({ ...draft, recipient: e.target.value })}
            />
            <InputField
              label="Copia"
              type="email"
              value={draft.cc}
              onChange={(e) => setDraft({ ...draft, cc: e.target.value })}
            />
            <InputField
              label="Asunto"
              className="sm:col-span-2"
              required
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            />
            <TextareaField
              label="Mensaje"
              className="sm:col-span-2"
              rows={14}
              required
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </fieldset>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <GhostButton type="button" onClick={onClose}>
              Cancelar
            </GhostButton>
            <PrimaryButton loading={saving}>
              <Send className="h-4 w-4" /> Enviar contrato
            </PrimaryButton>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

function SignedModal({
  contractId,
  onClose,
  onUploaded,
}: {
  contractId: string;
  onClose: () => void;
  onUploaded: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/comercial/contracts/${contractId}/signed`, {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      await readJson(response);
      await onUploaded();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar el archivo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Subir contrato firmado"
      hint="Se guarda en almacenamiento privado, se calcula su hash y queda vinculado al documento original."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-bold text-slate-600">Archivo PDF firmado *</span>
            <input
              type="file"
              name="file"
              accept="application/pdf"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[12px] file:font-bold"
            />
          </label>
          <InputField label="Fecha de firma" name="signedAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          <SelectField label="Tipo de firma" name="signatureType" required defaultValue="simple">
            {Object.entries(SIGNATURE_TYPE_INFO).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <TextareaField label="Observaciones" name="notes" rows={3} className="sm:col-span-2" />
        </fieldset>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton loading={saving}>
            <Upload className="h-4 w-4" /> Registrar copia firmada
          </PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}

function ReasonModal({
  title,
  hint,
  busy,
  submitLabel = "Confirmar",
  onClose,
  onSubmit,
}: {
  title: string;
  hint: string;
  busy: boolean;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  return (
    <ModalShell title={title} hint={hint} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(reason);
        }}
        className="space-y-4 p-5"
      >
        <TextareaField
          label="Motivo"
          rows={4}
          required
          minLength={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Queda registrado en la bitácora de auditoría."
        />
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton loading={busy}>{submitLabel}</PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}
