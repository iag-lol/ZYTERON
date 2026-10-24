"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "@control/components/routed-link";
import type { SalesLead } from "@zyteron/contracts";
import { Drawer, Feedback, Field } from "@control/components/finance/fx-ui";

export function LeadClientActions({
  lead,
  onChanged,
}: {
  lead: SalesLead;
  onChanged: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"client" | "delete" | null>(null);
  const [form, setForm] = useState({
    rut: lead.rut || "",
    legalName: lead.companyName,
    email: lead.email || "",
    password: "",
    confirmPassword: "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ clientId: string; created: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/portal/admin/leads/${lead.id}${mode === "client" ? "/client" : ""}`,
        {
          method: mode === "client" ? "POST" : "DELETE",
          headers: { "content-type": "application/json" },
          ...(mode === "client" ? { body: JSON.stringify(form) } : {}),
        },
      );
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "No se pudo guardar.");
      if (mode === "client") setReceipt(data);
      else {
        setMode(null);
        await onChanged();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  async function close() {
    if (busy) return;
    setMode(null);
    setReceipt(null);
    setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
    await onChanged();
  }
  return (
    <>
      {lead.clientId ? (
        <Link href={`/clients/${lead.clientId}`}>Ver cliente</Link>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError("");
            setMode("client");
          }}
        >
          Convertir en cliente
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setError("");
          setMode("delete");
        }}
      >
        Eliminar lead
      </button>
      {mode
        ? createPortal(
            <div className="zy-full-control">
              <Drawer
                open
                title={mode === "client" ? "Convertir en cliente" : "Eliminar lead"}
                subtitle={lead.companyName}
                onClose={() => void close()}
              >
                <Feedback error={error} />
                {receipt ? (
                  <div className="fx-stack">
                    <h3>Cliente creado y acceso preparado</h3>
                    <p>
                      El cliente puede ingresar con su RUT o correo y la contraseña definida. En el
                      primer acceso debe verificar su correo; podrá solicitar el código desde la
                      pantalla de verificación.
                    </p>
                    <p>
                      La contraseña no se guarda en texto ni vuelve a mostrarse después de cerrar
                      este panel.
                    </p>
                    {receipt.created ? (
                      <button
                        className="fx-btn"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              `Portal de clientes: https://www.zyteron.cl/clientes/login\nRUT: ${form.rut}\nCorreo: ${form.email}\nContraseña: ${form.password}\nVerifica tu correo en el primer acceso para habilitar la cuenta.`,
                            );
                            setCopied(true);
                          } catch {
                            setError(
                              "No fue posible copiar. Puedes usar los datos ingresados antes de cerrar el panel.",
                            );
                          }
                        }}
                      >
                        {copied ? "Acceso copiado" : "Copiar acceso para enviar al cliente"}
                      </button>
                    ) : (
                      <p>
                        La conversión ya estaba registrada. La contraseña existente permanece
                        vigente.
                      </p>
                    )}
                    <Link href={`/clients/${receipt.clientId}`} onClick={() => void close()}>
                      Abrir ficha del cliente
                    </Link>
                    <button className="fx-btn primary" onClick={() => void close()}>
                      Listo
                    </button>
                  </div>
                ) : mode === "delete" ? (
                  <>
                    <p>
                      El lead se retirará del tablero. Sus cotizaciones, oportunidades, cliente y
                      pagos se conservarán.
                    </p>
                    <div className="fx-actions">
                      <button className="fx-btn ghost" disabled={busy} onClick={() => void close()}>
                        Cancelar
                      </button>
                      <button
                        className="fx-btn danger"
                        disabled={busy}
                        onClick={() => void submit()}
                      >
                        {busy ? "Eliminando…" : "Eliminar lead"}
                      </button>
                    </div>
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submit();
                    }}
                    className="fx-stack"
                  >
                    <div className="fx-form">
                      <Field label="Razón social" span={3}>
                        <input
                          required
                          minLength={2}
                          maxLength={160}
                          value={form.legalName}
                          onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                        />
                      </Field>
                      <Field label="RUT del cliente">
                        <input
                          required
                          maxLength={20}
                          value={form.rut}
                          placeholder="12345678-5"
                          onChange={(e) => setForm({ ...form, rut: e.target.value })}
                        />
                      </Field>
                      <Field label="Correo de acceso" span={2}>
                        <input
                          type="email"
                          autoComplete="off"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </Field>
                      <Field
                        label="Contraseña inicial"
                        hint="8–72 caracteres, mayúscula, minúscula y número."
                        span={3}
                      >
                        <input
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={72}
                          required
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                      </Field>
                      <Field label="Repetir contraseña" span={3}>
                        <input
                          type="password"
                          autoComplete="new-password"
                          required
                          value={form.confirmPassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        />
                      </Field>
                    </div>
                    <p className="fx-hint">
                      La cuenta accede exclusivamente a los datos de este cliente. El correo se
                      verifica en su primer ingreso. Esta acción no envía mensajes.
                    </p>
                    <button className="fx-btn primary" disabled={busy}>
                      {busy ? "Creando cliente…" : "Crear cliente y preparar acceso"}
                    </button>
                  </form>
                )}
              </Drawer>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
