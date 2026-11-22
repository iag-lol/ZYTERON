"use client";
import { useState } from "react";
import type { HrWorkspace } from "@zyteron/contracts";

export function OrganizationForm({
  kind,
  data,
  busy,
  error,
  close,
  save,
}: {
  kind: "positions" | "departments" | "teams";
  data: HrWorkspace;
  busy: boolean;
  error: string;
  close: () => void;
  save: (value: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [departmentId, setDepartmentId] = useState(""),
    [description, setDescription] = useState("");
  const title =
    kind === "positions"
      ? "Nuevo cargo"
      : kind === "departments"
        ? "Nuevo departamento"
        : "Nuevo equipo";
  return (
    <div
      className="hrModalBackdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="organization-title"
    >
      <form
        className="hrModal"
        onSubmit={(event) => {
          event.preventDefault();
          void save({ name, code, departmentId: departmentId || null, description });
        }}
      >
        <header>
          <h2 id="organization-title">{title}</h2>
          <button type="button" disabled={busy} aria-label="Cerrar" onClick={close}>
            ×
          </button>
        </header>
        <div className="hrFormGrid">
          <label>
            Nombre
            <input
              autoFocus
              required
              maxLength={150}
              value={name}
              disabled={busy}
              placeholder={kind === "positions" ? "Ejecutiva de ventas" : "Nombre"}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {kind !== "teams" ? (
            <label>
              Código
              <input
                required
                maxLength={50}
                value={code}
                disabled={busy}
                placeholder={kind === "positions" ? "EJECUTIVA_VENTAS" : "Código interno"}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
              />
            </label>
          ) : null}
          {kind !== "departments" ? (
            <label>
              Departamento {kind === "positions" ? "(opcional)" : ""}
              <select
                value={departmentId}
                required={kind === "teams"}
                disabled={busy}
                onChange={(event) => setDepartmentId(event.target.value)}
              >
                <option value="">Seleccionar departamento</option>
                {data.departments
                  .filter((item) => item.active)
                  .map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          {kind === "positions" ? (
            <>
              <label>
                Descripción (opcional)
                <textarea
                  maxLength={2000}
                  disabled={busy}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <p>
                El cargo describe la función laboral. Los permisos se asignan mediante el rol del
                usuario en Seguridad.
              </p>
            </>
          ) : null}
          {error ? (
            <div className="hrAlert" role="alert">
              {error}
            </div>
          ) : null}
        </div>
        <footer>
          <button type="button" disabled={busy} onClick={close}>
            Cancelar
          </button>
          <button className="hrPrimary" disabled={busy}>
            {busy ? "Guardando…" : "Crear"}
          </button>
        </footer>
      </form>
    </div>
  );
}
