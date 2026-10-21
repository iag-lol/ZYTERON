"use client";

import { Pill, Register } from "./fx-ui";

export interface DteCatalogRow {
  code: number;
  name: string;
  enabledForIssue: boolean;
  certified: boolean;
  catalogConfigured?: boolean;
  canEnable?: boolean;
  implementationStatus?: string;
}

const implementationLabels: Record<string, string> = {
  IMPLEMENTED: "Implementado · requiere certificación y configuración",
  PENDING_IMPLEMENTATION: "Pendiente de implementación",
  PROVIDER_DEPENDENT: "Compatibilidad por validar con el proveedor",
  PROVIDER_NOT_CONFIGURED: "Proveedor no configurado",
};

export function DteDocumentTypes({ rows, manage, busy, onToggle, onCertify }: {
  rows: DteCatalogRow[];
  manage: boolean;
  busy: boolean;
  onToggle: (row: DteCatalogRow) => void;
  onCertify: (row: DteCatalogRow) => void;
}) {
  return <>
    <p className="fx-hint">Todos los documentos permanecen en el catálogo. Implementación, evidencia de certificación SII y habilitación son estados independientes. La postulación no autoriza a emitir en producción.</p>
    <Register rows={rows} rowKey={row => String(row.code)} columns={[
      { key: "code", label: "Código", render: row => <code>{row.code}</code> },
      { key: "name", label: "Documento", render: row => <>{row.name}{row.catalogConfigured === false ? <small className="block">Pendiente de configuración persistente</small> : null}</> },
      { key: "implementation", label: "Implementación", render: row => <small>{implementationLabels[row.implementationStatus ?? ""] ?? "Estado técnico no informado"}</small> },
      { key: "enabled", label: "Habilitado", render: row => manage && row.catalogConfigured === true ? <button
        className={`fx-toggle${row.enabledForIssue ? " on" : ""}`}
        disabled={busy || (!row.enabledForIssue && row.canEnable !== true)}
        aria-label={`${row.enabledForIssue ? "Deshabilitar" : "Habilitar"} ${row.name}`}
        onClick={() => onToggle(row)}>{row.enabledForIssue ? "Sí" : "No"}</button> : <Pill value={row.enabledForIssue ? "ACTIVE" : "INACTIVE"}/> },
      { key: "certified", label: "Evidencia SII", render: row => row.certified ? <Pill value="OK" text="Certificación registrada"/> : manage && row.catalogConfigured === true ? <button
        className="fx-btn small ghost" disabled={busy} onClick={() => onCertify(row)}>Registrar evidencia SII</button> : <Pill value="PENDING" text="Pendiente de evidencia"/> },
    ]}/>
  </>;
}
