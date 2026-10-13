"use client";
import { useState } from "react";
import { useAccess } from "@control/components/access-context";
import { apiHeaders } from "@control/lib/api-auth";
export function ProjectPublication({
  id,
  clientId,
  visibility,
  updated,
}: {
  id: string;
  clientId: string | null;
  visibility: string;
  updated: () => Promise<void>;
}) {
  const { role } = useAccess();
  const value = visibility;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const manage = ["GERENTE_GENERAL", "JEFE_DESARROLLO", "OPERACIONES"].includes(role);
  return (
    <section className="manualBanner">
      <label>
        Visibilidad del proyecto{" "}
        <select
          aria-label="Visibilidad del proyecto"
          value={value}
          disabled={!manage || busy || !clientId}
          onChange={async (e) => {
            const next = e.target.value;
            setBusy(true);
            setError("");
            try {
              const r = await fetch(`/api/control-core/api/projects/${id}`, {
                method: "PATCH",
                headers: await apiHeaders(role),
                body: JSON.stringify({ clientVisibility: next }),
              });
              const b = await r.json();
              if (!r.ok) throw new Error(b.message || "No se pudo guardar la visibilidad.");
              await updated();
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo actualizar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <option value="INTERNAL">Sólo equipo Zyteron</option>
          <option value="CLIENT_VISIBLE">Cliente vinculado</option>
        </select>
      </label>
      <span>
        {!clientId
          ? "Vincula el cliente antes de publicar."
          : value === "CLIENT_VISIBLE"
            ? "El cliente puede ver el resumen y el avance. Tareas y notas internas conservan su privacidad."
            : "El proyecto permanece visible sólo para administración."}
      </span>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
