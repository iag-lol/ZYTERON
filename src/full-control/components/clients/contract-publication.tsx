"use client";
import { useCallback, useEffect, useState } from "react";
export function ContractPublication({ id }: { id: string }) {
  const [value, setValue] = useState<{
      portal_visible: boolean;
      portal_review_visible: boolean;
      status: string;
      approval_status: string;
      frozen_at: string | null;
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch(`/api/portal/admin/contracts/${id}/publication`, { cache: "no-store" });
    const b = await r.json();
    if (!r.ok) throw new Error(b.error || "No se pudo cargar la publicación.");
    return b;
  }, [id]);
  useEffect(() => {
    let cancelled = false;
    void load()
      .then((result) => {
        if (!cancelled) setValue(result);
      })
      .catch((error) => {
        if (!cancelled) setError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);
  return (
    <article className="contractReview">
      <h2>Contrato en el portal cliente</h2>
      <p>
        Comparte el borrador para revisión o publica la versión aprobada. El cliente podrá consultar
        y descargar el PDF desde Contratos y Documentos. Publicarlo no registra firma ni pago.
      </p>
      {error ? (
        <p role="alert" className="domainError">
          {error}
        </p>
      ) : null}
      {[
        {
          key: "portal_review_visible" as const,
          field: "reviewPublished",
          label: "Compartir borrador para revisión",
          allowed: Boolean(
            value && !value.frozen_at && ["DRAFT", "IN_REVIEW"].includes(value.status),
          ),
        },
        {
          key: "portal_visible" as const,
          field: "published",
          label: "Publicar contrato aprobado",
          allowed: Boolean(value?.approval_status === "APPROVED" && value.frozen_at),
        },
      ].map((option) => (
        <label key={option.key} style={{ display: "block", marginTop: 12 }}>
          <input
            type="checkbox"
            checked={Boolean(value?.[option.key])}
            disabled={busy || !value || (!value[option.key] && !option.allowed)}
            onChange={async (e) => {
              setBusy(true);
              setError("");
              try {
                const response = await fetch(`/api/portal/admin/contracts/${id}/publication`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ [option.field]: e.target.checked }),
                });
                const body = await response.json();
                if (!response.ok) throw new Error(body.error || "No se pudo actualizar.");
                setValue(await load());
              } catch (e) {
                setError(e instanceof Error ? e.message : "No se pudo actualizar.");
              } finally {
                setBusy(false);
              }
            }}
          />{" "}
          {option.label}
        </label>
      ))}
      {value && value.approval_status !== "APPROVED" ? (
        <small>
          El borrador se muestra como documento para revisión. La versión aprobada requiere
          aprobación y congelamiento.
        </small>
      ) : null}
    </article>
  );
}
