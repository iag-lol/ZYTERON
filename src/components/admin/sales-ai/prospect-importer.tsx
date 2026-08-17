"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleAlert,
  FileSpreadsheet,
  Loader2,
  Upload,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FieldKey = string;

type ParseResponse = {
  fileName: string;
  headers: string[];
  suggestedMapping: Record<string, FieldKey>;
  rows: Record<string, string>[];
  totalRows: number;
};

type RowValidation = {
  rowIndex: number;
  data: Record<string, string>;
  status: "VALIDO" | "DUPLICADO" | "SIN_EMAIL" | "INVALIDO" | "OPT_OUT";
  detail?: string;
  duplicateOf?: { id: string; name: string; matchedBy: string; status: string };
};

type ImportPreview = {
  total: number;
  valid: number;
  duplicates: number;
  alreadyContacted: number;
  existingClients: number;
  withoutEmail: number;
  invalid: number;
  optedOut: number;
  byPotential: { ALTO: number; POTENCIAL: number; MEDIO: number; BAJO: number };
  rows: RowValidation[];
};

const IMPORT_FIELDS: Array<{ key: string; label: string; required?: boolean }> = [
  { key: "name", label: "Nombre empresa", required: true },
  { key: "legal_name", label: "Razón social" },
  { key: "tax_id", label: "RUT" },
  { key: "industry", label: "Rubro" },
  { key: "commune", label: "Comuna" },
  { key: "region", label: "Región" },
  { key: "website", label: "Sitio web" },
  { key: "primary_email", label: "Email principal" },
  { key: "phone", label: "Teléfono" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "contact_name", label: "Nombre contacto" },
  { key: "contact_role", label: "Cargo contacto" },
  { key: "linkedin_url", label: "LinkedIn" },
  { key: "instagram_url", label: "Instagram" },
  { key: "detected_problem", label: "Problema detectado" },
  { key: "recommended_service", label: "Servicio recomendado" },
  { key: "potential", label: "Potencial" },
  { key: "notes", label: "Notas" },
];

const STATUS_STYLES: Record<RowValidation["status"], { label: string; className: string }> = {
  VALIDO: { label: "Válido", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DUPLICADO: { label: "Duplicado", className: "bg-amber-50 text-amber-700 border-amber-200" },
  SIN_EMAIL: { label: "Sin email", className: "bg-sky-50 text-sky-700 border-sky-200" },
  INVALIDO: { label: "Inválido", className: "bg-rose-50 text-rose-700 border-rose-200" },
  OPT_OUT: { label: "No contactar", className: "bg-slate-100 text-slate-600 border-slate-300" },
};

export function ProspectImporter() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, FieldKey>>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [includeWithoutEmail, setIncludeWithoutEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/sales-ai/import?step=parse", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo leer el archivo.");

      setParsed(data as ParseResponse);
      setMapping((data as ParseResponse).suggestedMapping);
      setStep(2);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const runPreview = useCallback(async () => {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sales-ai/import?step=preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed.rows, mapping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo validar el archivo.");
      setPreview(data.preview as ImportPreview);
      setStep(3);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [parsed, mapping]);

  const runImport = useCallback(async () => {
    if (!parsed || !preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sales-ai/import?step=import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: parsed.fileName,
          mapping,
          preview,
          includeWithoutEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo importar.");
      setResult(data.result);
      setStep(4);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [parsed, preview, mapping, includeWithoutEmail]);

  const hasNameMapped = Object.values(mapping).includes("name");
  const importableCount = (preview?.valid ?? 0) + (includeWithoutEmail ? (preview?.withoutEmail ?? 0) : 0);

  function reset() {
    setStep(1);
    setParsed(null);
    setMapping({});
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {/* Pasos */}
      <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        {["Subir archivo", "Mapear columnas", "Revisar", "Importar"].map((label, index) => {
          const value = (index + 1) as 1 | 2 | 3 | 4;
          const active = step === value;
          const done = step > value;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[11px]",
                  done && "border-emerald-500 bg-emerald-500 text-white",
                  active && "border-blue-600 bg-blue-600 text-white",
                  !active && !done && "border-slate-300 bg-white text-slate-500",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : value}
              </span>
              <span className={cn(active ? "text-slate-900" : "text-slate-500")}>{label}</span>
              {index < 3 ? <ArrowRight className="h-3 w-3 text-slate-300" /> : null}
            </li>
          );
        })}
      </ol>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {/* Paso 1 */}
      {step === 1 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">Sube tu archivo de prospectos</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Acepta XLSX y CSV. La primera fila debe contener los nombres de las columnas. Nada se
            importa hasta que revises el resultado.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button
            className="mt-5 gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Leyendo archivo…" : "Seleccionar archivo"}
          </Button>
        </div>
      ) : null}

      {/* Paso 2 */}
      {step === 2 && parsed ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-bold text-slate-900">
              {parsed.fileName} · {parsed.totalRows} filas
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Revisa el mapeo automático. Las columnas sin asignar se ignoran.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="p-3 font-bold text-slate-900">Columna del archivo</th>
                  <th className="p-3 font-bold text-slate-900">Ejemplo</th>
                  <th className="p-3 font-bold text-slate-900">Campo del CRM</th>
                </tr>
              </thead>
              <tbody>
                {parsed.headers.map((header) => (
                  <tr key={header} className="border-b border-slate-100">
                    <td className="p-3 font-semibold text-slate-800">{header}</td>
                    <td className="max-w-[220px] truncate p-3 text-xs text-slate-500">
                      {parsed.rows[0]?.[header] || "—"}
                    </td>
                    <td className="p-3">
                      <select
                        value={mapping[header] ?? ""}
                        onChange={(event) =>
                          setMapping((current) => ({ ...current, [header]: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      >
                        <option value="">— Ignorar —</option>
                        {IMPORT_FIELDS.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label}
                            {field.required ? " *" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!hasNameMapped ? (
            <p className="flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Debes mapear una columna al campo &quot;Nombre empresa&quot; para continuar.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => void runPreview()}
              disabled={busy || !hasNameMapped}
              className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Validar y detectar duplicados
            </Button>
            <Button variant="outline" onClick={reset} disabled={busy}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {/* Paso 3 */}
      {step === 3 && preview ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total en archivo", value: preview.total, tone: "slate" },
              { label: "Listos para importar", value: preview.valid, tone: "emerald" },
              { label: "Duplicados", value: preview.duplicates, tone: "amber" },
              { label: "Sin email", value: preview.withoutEmail, tone: "sky" },
              { label: "Ya contactados", value: preview.alreadyContacted, tone: "violet" },
              { label: "Clientes existentes", value: preview.existingClients, tone: "blue" },
              { label: "No contactar", value: preview.optedOut, tone: "slate" },
              { label: "Con errores", value: preview.invalid, tone: "rose" },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Distribución por potencial
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <span className="font-semibold text-emerald-700">Alto: {preview.byPotential.ALTO}</span>
              <span className="font-semibold text-blue-700">Potencial: {preview.byPotential.POTENCIAL}</span>
              <span className="font-semibold text-slate-700">Medio: {preview.byPotential.MEDIO}</span>
              <span className="font-semibold text-slate-500">Bajo: {preview.byPotential.BAJO}</span>
            </div>
          </div>

          {preview.withoutEmail > 0 ? (
            <label className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm">
              <input
                type="checkbox"
                checked={includeWithoutEmail}
                onChange={(event) => setIncludeWithoutEmail(event.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span className="text-slate-700">
                Importar también las {preview.withoutEmail} empresas sin email. Quedarán en el CRM
                para gestión manual, pero Zara no podrá enviarles correo.
              </span>
            </label>
          ) : null}

          <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="p-3 font-bold text-slate-900">#</th>
                  <th className="p-3 font-bold text-slate-900">Empresa</th>
                  <th className="p-3 font-bold text-slate-900">Email</th>
                  <th className="p-3 font-bold text-slate-900">Estado</th>
                  <th className="p-3 font-bold text-slate-900">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 200).map((row) => {
                  const style = STATUS_STYLES[row.status];
                  return (
                    <tr key={row.rowIndex} className="border-b border-slate-100">
                      <td className="p-3 text-xs text-slate-400">{row.rowIndex + 1}</td>
                      <td className="p-3 font-semibold text-slate-800">{row.data.name || "—"}</td>
                      <td className="p-3 text-xs text-slate-600">{row.data.primary_email || "—"}</td>
                      <td className="p-3">
                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", style.className)}>
                          {style.label}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-500">{row.detail || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {preview.rows.length > 200 ? (
              <p className="border-t border-slate-100 p-3 text-xs text-slate-500">
                Mostrando las primeras 200 filas de {preview.rows.length}. Se importarán todas las que
                correspondan.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => void runImport()}
              disabled={busy || importableCount === 0}
              className="gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Importar {importableCount} {importableCount === 1 ? "empresa" : "empresas"}
            </Button>
            <Button variant="outline" onClick={() => setStep(2)} disabled={busy}>
              Volver al mapeo
            </Button>
          </div>
        </div>
      ) : null}

      {/* Paso 4 */}
      {step === 4 && result ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <Check className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">Importación completada</h2>
          <p className="mt-2 text-sm text-slate-700">
            Se importaron <strong>{result.imported}</strong> empresas. Se omitieron{" "}
            <strong>{result.skipped}</strong> (duplicados, sin datos o con opt-out)
            {result.errors > 0 ? ` y ${result.errors} fallaron.` : "."}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Ningún prospecto fue contactado automáticamente. Revísalos en Prospectos antes de iniciar
            una campaña.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/admin/ventas-ia/prospectos">Ver prospectos</Link>
            </Button>
            <Button variant="outline" onClick={reset}>
              Importar otro archivo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
