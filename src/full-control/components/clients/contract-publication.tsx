"use client";
import { useCallback, useEffect, useState } from "react";
export function ContractPublication({ id }: { id: string }) {
  const [value, setValue] = useState<{
      portal_visible: boolean;
      approval_status: string;
      frozen_at: string | null;
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch(`/api/portal/admin/contracts/${id}/publication`, { cache: "no-store" });
    const b = await r.json();
    if (!r.ok) throw new Error(b.error || "No se pudo cargar la publicación.");
    setValue(b);
  }, [id]);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  return (
    <article className="contractReview">
      <h2>Resumen en el portal cliente</h2>
      <p>
        El cliente podrá ver el estado, vigencia y valor del contrato aprobado. Publicarlo no
        registra firma ni pago.
      </p>
      {error ? (
        <p role="alert" className="domainError">
          {error}
        </p>
      ) : null}
      <label>
        <input
          type="checkbox"
          checked={Boolean(value?.portal_visible)}
          disabled={
            busy ||
            !value ||
            (!value.portal_visible && (value.approval_status !== "APPROVED" || !value.frozen_at))
          }
          onChange={async (e) => {
            setBusy(true);
            setError("");
            try {
              const r = await fetch(`/api/portal/admin/contracts/${id}/publication`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ published: e.target.checked }),
              });
              const b = await r.json();
              if (!r.ok) throw new Error(b.error || "No se pudo actualizar.");
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo actualizar.");
            } finally {
              setBusy(false);
            }
          }}
        />{" "}
        Mostrar al cliente vinculado
      </label>
      {value && value.approval_status !== "APPROVED" ? (
        <small>Completa la aprobación y congela la versión para habilitar la publicación.</small>
      ) : null}
    </article>
  );
}
