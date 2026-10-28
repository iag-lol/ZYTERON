"use client";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, LockKeyhole, Plus, ShieldCheck } from "lucide-react";
import { CredentialDeliveryControl } from "./credential-delivery-control";
type Access = { allowed: boolean; reason: string };
type Row = {
  id: string;
  serviceName: string;
  username: string | null;
  url: string | null;
  notes: string | null;
  projectId: string | null;
  hasSecret: boolean;
  access: Access;
};
type Data = {
  client: { id: string; email: string };
  credentials: Row[];
  projects: Array<{ id: string; title: string; totalCharge: number | null; access: Access }>;
};
const empty = {
  credentialId: "",
  serviceName: "",
  username: "",
  secret: "",
  url: "",
  notes: "",
  projectId: "",
};
export function ClientCredentials({ clientId }: { clientId: string }) {
  const [accounts, setAccounts] = useState<Array<{ id: string; email: string }>>([]),
    [recipient, setRecipient] = useState("");
  const [data, setData] = useState<Data | null>(null),
    [form, setForm] = useState<typeof empty | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`/api/portal/admin/client-context/${clientId}`, { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        if (active) {
          setAccounts(b.accounts);
          setRecipient(b.accounts[0]?.id || "");
        }
      })
      .catch(() => {
        if (active) setError("No fue posible cargar las cuentas del cliente.");
      });
    return () => {
      active = false;
    };
  }, [clientId]);
  const load = useCallback(async () => {
    if (!recipient) return;
    const r = await fetch(`/api/portal/admin/users/${recipient}/credentials`, {
      cache: "no-store",
    });
    const b = await r.json();
    if (!r.ok) throw Error(b.error);
    setData(b);
  }, [recipient]);
  useEffect(() => {
    if (!recipient) return;
    const controller = new AbortController();
    fetch(`/api/portal/admin/users/${recipient}/credentials`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        if (!controller.signal.aborted) setData(b);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [recipient]);
  return (
    <section className="clientSection credentialAdmin">
      <div className="clientSectionHeader">
        <div>
          <h2>
            <KeyRound size={20} /> Credenciales del cliente
          </h2>
          <p>
            Accesos cifrados, vinculados a un proyecto y protegidos con contraseña y código por
            correo.
          </p>
        </div>
        <button
          type="button"
          disabled={!data || busy}
          onClick={() => {
            setForm({ ...empty });
            setError("");
            setNotice("");
          }}
        >
          <Plus size={15} />
          Nueva credencial
        </button>
      </div>
      <label>
        Cuenta destinataria
        <select
          value={recipient}
          onChange={(e) => {
            setData(null);
            setForm(null);
            setError("");
            setNotice("");
            setRecipient(e.target.value);
          }}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.email}
            </option>
          ))}
        </select>
      </label>
      <p className="credentialAdminNote">
        <ShieldCheck size={17} />
        La consulta requiere pago completo y cuenta sin saldos pendientes, salvo autorización de
        entrega registrada por administración. La contraseña y los códigos siguen siendo
        obligatorios. La clave nunca se devuelve al administrador.
      </p>
      {recipient && <CredentialDeliveryControl key={recipient} userId={recipient} updated={load} />}
      {data?.credentials.map((c) => (
        <article className="credentialAdminRow" key={c.id}>
          <div>
            <strong>{c.serviceName}</strong>
            <small>
              {data.projects.find((p) => p.id === c.projectId)?.title || "Sin proyecto vinculado"} ·{" "}
              {c.hasSecret ? "Secreto cifrado" : "Enlace protegido"}
            </small>
            <small>{c.access.allowed ? "Disponible con verificación" : c.access.reason}</small>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm({
                credentialId: c.id,
                serviceName: c.serviceName,
                username: c.username || "",
                secret: "",
                url: c.url || "",
                notes: c.notes || "",
                projectId: c.projectId || "",
              });
              setNotice("");
            }}
          >
            Editar
          </button>
        </article>
      ))}
      {data && !data.credentials.length && <p>No hay credenciales registradas.</p>}
      {form && (
        <form
          className="credentialAdminForm"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            setNotice("");
            try {
              const payload = { ...form, credentialId: form.credentialId || undefined };
              const r = await fetch(`/api/portal/admin/users/${recipient}/credentials`, {
                method: form.credentialId ? "PATCH" : "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              });
              const b = await r.json();
              if (!r.ok) throw Error(b.error);
              setForm(null);
              setNotice(
                "Credencial guardada. Su consulta queda sujeta al pago y a la verificación de seguridad.",
              );
              await load();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "No fue posible guardar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>{form.credentialId ? "Editar credencial" : "Nueva credencial"}</h3>
          <label>
            Proyecto obligatorio
            <select
              required
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            >
              <option value="">Seleccionar proyecto</option>
              {data?.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.totalCharge
                    ? ` · ${new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(p.totalCharge)}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Servicio
            <input
              required
              minLength={2}
              maxLength={140}
              value={form.serviceName}
              onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
              placeholder="GitHub · repositorio del proyecto"
            />
          </label>
          <label>
            Usuario o correo
            <input
              maxLength={140}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </label>
          <label>
            URL de acceso
            <input
              type="url"
              maxLength={2000}
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://…"
            />
          </label>
          <label>
            {form.credentialId ? "Nuevo secreto (vacío conserva el actual)" : "Secreto"}
            <input
              type="password"
              autoComplete="new-password"
              maxLength={4000}
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
            />
          </label>
          <label>
            Instrucciones para el cliente
            <textarea
              maxLength={1000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <p>
            No incluyas contraseñas ni tokens en la URL o en las instrucciones. Render se gestiona
            por Zyteron; publica sólo el acceso autorizado del cliente.
          </p>
          <footer>
            <button type="button" disabled={busy} onClick={() => setForm(null)}>
              Cancelar
            </button>
            <button type="submit" disabled={busy}>
              <LockKeyhole size={15} />
              {busy ? "Guardando…" : "Guardar credencial cifrada"}
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
    </section>
  );
}
