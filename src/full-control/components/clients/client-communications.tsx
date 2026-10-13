"use client";
import { useCallback, useEffect, useRef, useState } from "react";
type Context = {
  accounts: Array<{
    id: string;
    name: string | null;
    email: string;
    accountStatus: string;
    emailVerifiedAt: string | null;
  }>;
  messages: Array<{
    id: string;
    userId: string;
    subject: string;
    message: string;
    direction: string;
    createdAt: string;
  }>;
};
export function ClientCommunications({ clientId }: { clientId: string }) {
  const [data, setData] = useState<Context | null>(null),
    [recipient, setRecipient] = useState(""),
    [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const key = useRef("");
  const load = useCallback(async () => {
    const r = await fetch(`/api/portal/admin/client-context/${clientId}`, { cache: "no-store" });
    const b = await r.json();
    if (!r.ok) throw new Error(b.error || "No se pudo cargar la comunicación.");
    setData(b);
    setRecipient((current) =>
      b.accounts.some((a: { id: string }) => a.id === current) ? current : b.accounts[0]?.id || "",
    );
  }, [clientId]);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  return (
    <section className="clientSection">
      <div className="clientSectionHeader">
        <div>
          <h2>Comunicación con el cliente</h2>
          <p>El mensaje y su aviso se publican juntos en el portal de la cuenta seleccionada.</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load().catch((e) => setError(e.message))}
        >
          Actualizar mensajes
        </button>
      </div>
      {error ? (
        <p role="alert" className="domainError">
          {error}
        </p>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      {data && !data.accounts.length ? (
        <p>No hay una cuenta de portal vinculada a este cliente.</p>
      ) : data ? (
        <form
          className="inlineClientForm"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            setNotice("");
            key.current ||= crypto.randomUUID();
            try {
              const r = await fetch("/api/portal/admin/communications", {
                method: "POST",
                headers: { "content-type": "application/json", "idempotency-key": key.current },
                body: JSON.stringify({ userId: recipient, subject, message, channel: "PORTAL" }),
              });
              const b = await r.json();
              if (!r.ok) throw new Error(b.error || "No se pudo publicar.");
              key.current = "";
              setSubject("");
              setMessage("");
              setNotice("Mensaje y notificación publicados en el portal cliente.");
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo publicar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Destinatario
            <select
              required
              value={recipient}
              disabled={busy}
              onChange={(e) => {
                setRecipient(e.target.value);
                key.current = "";
              }}
            >
              {data.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.email} · {a.email} · {a.accountStatus}
                </option>
              ))}
            </select>
          </label>
          <label>
            Asunto
            <input
              required
              minLength={3}
              maxLength={140}
              value={subject}
              disabled={busy}
              onChange={(e) => {
                setSubject(e.target.value);
                key.current = "";
              }}
            />
          </label>
          <label>
            Mensaje
            <textarea
              required
              minLength={5}
              maxLength={5000}
              value={message}
              disabled={busy}
              onChange={(e) => {
                setMessage(e.target.value);
                key.current = "";
              }}
            />
          </label>
          <button disabled={busy || !recipient}>
            {busy ? "Publicando…" : "Publicar en el portal"}
          </button>
        </form>
      ) : (
        <p>Cargando cuentas vinculadas…</p>
      )}
      <div className="clientTimeline">
        {data?.messages.map((m) => (
          <article key={m.id}>
            <time>{new Date(m.createdAt).toLocaleString("es-CL")}</time>
            <span />
            <div>
              <strong>{m.subject}</strong>
              <p style={{ whiteSpace: "pre-wrap" }}>{m.message}</p>
              <small>
                {m.direction === "INBOUND" ? "Mensaje del cliente" : "Respuesta de Zyteron"} ·{" "}
                {data.accounts.find((a) => a.id === m.userId)?.email}
              </small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
