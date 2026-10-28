"use client";
import { useCallback, useEffect, useState } from "react";
type Project = { id: string; title: string; enabled: boolean; reason: string | null };
export function CredentialDeliveryControl({
  userId,
  updated,
}: {
  userId: string;
  updated: () => Promise<void>;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selection, setSelection] = useState<Project | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const endpoint = `/api/portal/admin/users/${userId}/credential-delivery`;
  const load = useCallback(async () => {
    const r = await fetch(endpoint, { cache: "no-store" });
    const b = await r.json();
    if (!r.ok) throw Error(b.error || "No se pudo consultar el control de entrega.");
    setProjects(b.projects);
  }, [endpoint]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error || "No se pudo consultar el control de entrega.");
        if (!controller.signal.aborted) setProjects(b.projects);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [endpoint]);
  return (
    <div className="credentialAdminForm">
      <h3>Bloqueo de credenciales por pago</h3>
      <p>
        Por defecto se exige pago completo y cuenta sin saldos pendientes. Puedes autorizar una
        excepción por proyecto. El cliente mantiene la verificación con contraseña y códigos; la
        autorización no registra pagos ni habilita cuentas externas.
      </p>
      {projects.map((p) => (
        <article className="credentialAdminRow" key={p.id}>
          <div>
            <strong>{p.title}</strong>
            <small>
              {p.enabled
                ? "Excepción activa: consulta antes del pago autorizada"
                : "Bloqueo por pago activo"}
            </small>
            {p.enabled && <small>Motivo: {p.reason}</small>}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSelection(p);
              setReason("");
              setError("");
              setNotice("");
            }}
          >
            {p.enabled ? "Restablecer bloqueo" : "Autorizar consulta antes del pago"}
          </button>
        </article>
      ))}
      {selection && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              const r = await fetch(endpoint, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  projectId: selection.id,
                  enabled: !selection.enabled,
                  expectedEnabled: selection.enabled,
                  reason,
                }),
              });
              const b = await r.json();
              if (!r.ok) throw Error(b.error);
              setNotice(
                selection.enabled
                  ? "Bloqueo por pago restablecido."
                  : "Entrega autorizada para este proyecto. Se mantienen las verificaciones de identidad.",
              );
              setSelection(null);
              await load();
              await updated();
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo guardar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h4>
            {selection.enabled ? "Restablecer bloqueo" : "Autorizar entrega anticipada"}:{" "}
            {selection.title}
          </h4>
          <label>
            Motivo registrado en auditoría
            <textarea
              required
              minLength={20}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <footer>
            <button type="button" disabled={busy} onClick={() => setSelection(null)}>
              Cancelar
            </button>
            <button type="submit" disabled={busy || reason.trim().length < 20}>
              {busy ? "Guardando…" : "Confirmar cambio"}
            </button>
          </footer>
        </form>
      )}
      {error && (
        <p role="alert" className="domainError">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
