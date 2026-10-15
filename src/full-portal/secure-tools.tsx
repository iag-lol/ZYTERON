"use client";
import { CredentialAccessForm } from "@/components/portal/panel/credential-access-form";
import { useState } from "react";
import type { PortalData } from "@/lib/client-experience/snapshot";
import { ShieldCheck } from "lucide-react";
async function request(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "No se pudo completar la operación.");
  return value;
}
export function AccountTools({
  data,
  mode,
  onDone,
}: {
  data: PortalData;
  mode: "profile" | "password";
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      className="support-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const form = e.currentTarget;
        setBusy(true);
        setMessage("");
        try {
          await request(
            mode === "profile"
              ? "/api/portal/account/profile"
              : "/api/portal/account/change-password",
            Object.fromEntries(new FormData(form)),
            mode === "profile" ? "PATCH" : "POST",
          );
          setMessage("Actualización confirmada.");
          if (mode === "password") form.reset();
          onDone();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "No se pudo conectar.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {mode === "profile" ? (
        <>
          <label>
            Nombre
            <input
              name="firstName"
              defaultValue={data.user.firstName || data.user.name.split(" ")[0]}
              minLength={2}
              maxLength={80}
              required
            />
          </label>
          <label>
            Apellido
            <input
              name="lastName"
              defaultValue={data.user.lastName || data.user.name.split(" ").slice(1).join(" ")}
              minLength={2}
              maxLength={80}
              required
            />
          </label>
          <label>
            Empresa
            <input name="company" defaultValue={data.user.company} maxLength={160} />
          </label>
          <label>
            Teléfono
            <input name="phone" defaultValue={data.user.phone} maxLength={40} />
          </label>
        </>
      ) : (
        <>
          <label>
            Contraseña actual
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
            />
          </label>
          <label>
            Nueva contraseña
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={256}
            />
          </label>
          <label>
            Confirma la nueva contraseña
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={256}
            />
          </label>
        </>
      )}
      {message && (
        <p role="status" className="info-note">
          {message}
        </p>
      )}
      <button disabled={busy} className="button primary">
        {busy ? "Guardando…" : "Guardar cambios"} <ShieldCheck size={16} />
      </button>
    </form>
  );
}
export function CredentialAccess({
  credential,
}: {
  credential?: PortalData["credentials"][number];
}) {
  return credential ? (
    <CredentialAccessForm
      credentialId={credential.id}
      name={credential.name}
      project={credential.project}
      access={credential.access}
    />
  ) : (
    <p>No existe un acceso publicado para esta cuenta.</p>
  );
}
