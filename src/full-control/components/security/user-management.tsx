"use client";

import { useEffect, useState } from "react";
import { Plus, UsersRound } from "lucide-react";
import type { Role, SecurityIdentity } from "@zyteron/contracts";
import Link from "@control/components/routed-link";
import { normalizeUserRut } from "@control/lib/user-rut";
import { securityApi, type UserOptions } from "@control/lib/security-api";

const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());

export function UserManagement({
  identities,
  role,
  reload,
}: {
  identities: SecurityIdentity[];
  role: Role;
  reload: () => Promise<void>;
}) {
  const [options, setOptions] = useState<UserOptions | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SecurityIdentity | "new" | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    securityApi
      .userOptions(role)
      .then((value) => {
        if (current) setOptions(value);
      })
      .catch(() => {
        if (current)
          setError(
            "No fue posible cargar los roles y cargos. Actualiza la página para reintentar.",
          );
      });
    return () => {
      current = false;
    };
  }, [role]);
  async function save(value: {
    name: string;
    rut: string;
    email: string;
    role: Role;
    jobPositionId: string | null;
    mode?: "password" | "invitation";
    password?: string;
  }) {
    if (!editing) return;
    const rut = normalizeUserRut(value.rut);
    if (!rut) {
      setError("Ingresa un RUT válido, incluido su dígito verificador.");
      return;
    }
    value = { ...value, rut };
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (editing === "new") await securityApi.createUser(role, value);
      else
        await securityApi.updateUserProfile(role, editing.id, {
          name: value.name,
          rut: value.rut,
          jobPositionId: value.jobPositionId,
        });
      setNotice(
        editing === "new"
          ? value.mode === "password"
            ? "Usuario creado. Puede ingresar con su RUT y contraseña en zyteron.cl/equipo."
            : "Invitación enviada. La persona podrá definir su contraseña e ingresar en zyteron.cl/equipo."
          : "Nombre y cargo actualizados.",
      );
      setEditing(null);
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible guardar el usuario.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="controlPanel userManagement">
      <header>
        <div>
          <small>ACCESO DEL EQUIPO</small>
          <h2>Usuarios y cargos</h2>
          <p>Registra el RUT de la persona y selecciona su rol de acceso.</p>
        </div>
        <button
          className="securityPrimary"
          disabled={!options || busy}
          onClick={() => {
            setError("");
            setEditing("new");
          }}
        >
          <Plus />
          Crear usuario
        </button>
      </header>
      <p>
        <Link href="/hr/positions">Administrar cargos en RR.HH.</Link> ·{" "}
        <a href="/equipo" target="_blank" rel="noreferrer">
          Acceso del equipo
        </a>
      </p>
      {error ? (
        <div className="securityAlert" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="securityNotice" role="status">
          {notice}
        </div>
      ) : null}
      <label className="userManagementSearch">
        Buscar usuario
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre, RUT, correo, rol o cargo"
        />
      </label>
      <div className="identityGrid">
        {identities
          .filter((item) =>
            [item.name, item.rut, item.email, item.role, item.jobPositionName].some((value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(query.toLowerCase()),
            ),
          )
          .map((item) => (
            <article key={item.id}>
              <div className="identityAvatar">{item.name.slice(0, 2).toUpperCase()}</div>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.rut || "RUT pendiente"} · {item.email}
                </span>
                <small>
                  {item.role ? label(item.role) : "Sin rol"} ·{" "}
                  {item.jobPositionName || "Cargo no asignado"}
                </small>
                <small>
                  {!item.active
                    ? "Bloqueado"
                    : item.invitationPending
                      ? "Invitación pendiente"
                      : "Activo"}
                </small>
                {item.identityType === "INTERNAL_USER" ? (
                  <button
                    disabled={!options || busy}
                    onClick={() => {
                      setError("");
                      setEditing(item);
                    }}
                  >
                    Editar usuario
                  </button>
                ) : null}
              </div>
            </article>
          ))}
      </div>
      {!identities.length ? (
        <p>
          <UsersRound /> Aún no hay cuentas en el directorio. Puedes crear la primera con el botón
          Crear usuario.
        </p>
      ) : null}
      {editing && options ? (
        <UserDialog
          key={editing === "new" ? "new" : editing.id}
          identity={editing === "new" ? null : editing}
          options={options}
          busy={busy}
          close={() => {
            if (!busy) setEditing(null);
          }}
          save={save}
          error={error}
        />
      ) : null}
    </section>
  );
}

function UserDialog({
  identity,
  options,
  busy,
  close,
  save,
  error,
}: {
  identity: SecurityIdentity | null;
  options: UserOptions;
  busy: boolean;
  close: () => void;
  save: (value: {
    name: string;
    rut: string;
    email: string;
    role: Role;
    jobPositionId: string | null;
    mode?: "password" | "invitation";
    password?: string;
  }) => Promise<void>;
  error: string;
}) {
  const [name, setName] = useState(identity?.name ?? ""),
    [rut, setRut] = useState(identity?.rut ?? ""),
    [email, setEmail] = useState(identity?.email ?? ""),
    [role, setRole] = useState<Role>(
      identity?.role ??
        (options.roles.includes("EJECUTIVA_VENTAS")
          ? "EJECUTIVA_VENTAS"
          : (options.roles[0] ?? "EJECUTIVA_VENTAS")),
    ),
    [position, setPosition] = useState(identity?.jobPositionId ?? ""),
    [mode, setMode] = useState<"password" | "invitation">("password"),
    [password, setPassword] = useState("");
  return (
    <div
      className="securityModalBackdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-dialog-title"
    >
      <form
        className="securityModal"
        onSubmit={(event) => {
          event.preventDefault();
          void save({
            name,
            rut,
            email,
            role,
            jobPositionId: position || null,
            ...(!identity ? { mode, ...(mode === "password" ? { password } : {}) } : {}),
          });
        }}
      >
        <header>
          <h2 id="user-dialog-title">{identity ? "Editar usuario" : "Crear usuario"}</h2>
          <button type="button" disabled={busy} aria-label="Cerrar" onClick={close}>
            ×
          </button>
        </header>
        <div className="securityForm">
          <label>
            Nombre completo
            <input
              autoFocus
              required
              maxLength={150}
              value={name}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            RUT
            <input
              required
              autoComplete="off"
              maxLength={20}
              placeholder="12.345.678-5"
              value={rut}
              disabled={busy || Boolean(identity?.rut)}
              onChange={(event) => setRut(event.target.value)}
              onBlur={() => {
                const normalized = normalizeUserRut(rut);
                if (normalized) setRut(normalized);
              }}
            />
          </label>
          <label>
            Correo de contacto
            <input
              type="email"
              required
              maxLength={254}
              value={email}
              disabled={busy || Boolean(identity)}
              autoComplete="off"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Rol de acceso
            <select
              value={role}
              disabled={busy || Boolean(identity)}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              {identity?.role && !options.roles.includes(identity.role) ? (
                <option value={identity.role}>{label(identity.role)}</option>
              ) : null}
              {options.roles.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cargo laboral (opcional)
            <select
              value={position}
              disabled={busy}
              onChange={(event) => setPosition(event.target.value)}
            >
              <option value="">Sin cargo asignado</option>
              {identity?.jobPositionId &&
              !options.positions.some((item) => item.id === identity.jobPositionId) ? (
                <option value={identity.jobPositionId}>
                  {identity.jobPositionName || "Cargo anterior"}
                </option>
              ) : null}
              {options.positions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          {!identity ? (
            <>
              <label>
                Modalidad de acceso
                <select
                  value={mode}
                  disabled={busy}
                  onChange={(event) => {
                    setMode(event.target.value as "password" | "invitation");
                    setPassword("");
                  }}
                >
                  <option value="password">Crear con contraseña inicial</option>
                  <option value="invitation">Enviar invitación por correo</option>
                </select>
              </label>
              {mode === "password" ? (
                <label>
                  Contraseña inicial
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,128}"
                    title="Entre 12 y 128 caracteres, con mayúsculas, minúsculas y números"
                    value={password}
                    disabled={busy}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
              ) : null}
            </>
          ) : null}
          <p>
            El rol define los permisos. El cargo identifica la función y no modifica los permisos ni
            crea un expediente laboral.
          </p>
          {identity ? (
            <p>
              Los cambios de rol requieren verificación multifactor mediante el procedimiento de
              Seguridad.
            </p>
          ) : (
            <p>
              {mode === "password"
                ? "La cuenta quedará habilitada por administración. Entrega la contraseña por un canal privado."
                : "Se enviará una invitación al correo indicado para que la persona defina su contraseña."}
              Los roles administrativos requieren aprobación separada.
            </p>
          )}
          {error ? (
            <div className="securityAlert" role="alert">
              {error}
            </div>
          ) : null}
        </div>
        <footer>
          <button type="button" disabled={busy} onClick={close}>
            Cancelar
          </button>
          <button className="securityPrimary" disabled={busy}>
            {busy
              ? "Guardando…"
              : identity
                ? "Guardar cambios"
                : mode === "password"
                  ? "Crear usuario"
                  : "Crear y enviar invitación"}
          </button>
        </footer>
      </form>
    </div>
  );
}
