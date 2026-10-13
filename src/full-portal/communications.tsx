"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PortalData } from "@/lib/client-experience/snapshot";
export function PortalCommunications({ messages }: { messages: PortalData["communications"] }) {
  const router = useRouter();
  const [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const sending = useRef(false);
  return (
    <section className="panel portal-communications">
      <header>
        <p className="eyebrow">CONVERSACIÓN CON ZYTERON</p>
        <h2>Mensajes de tu cuenta</h2>
      </header>
      <div className="communication-history">
        {messages.length ? (
          messages.map((m) => (
            <article key={m.id}>
              <small>
                {m.direction === "INBOUND" ? "Tú" : "Equipo Zyteron"} ·{" "}
                {new Date(m.date).toLocaleString("es-CL")}
              </small>
              <h3>{m.subject}</h3>
              <p>{m.message}</p>
            </article>
          ))
        ) : (
          <p>Aún no hay mensajes de tu cuenta.</p>
        )}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (sending.current) return;
          sending.current = true;
          setBusy(true);
          setError("");
          setNotice("");
          try {
            const r = await fetch("/api/portal/communications", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ subject, message }),
            });
            const b = await r.json();
            if (!r.ok) throw new Error(b.error || "No se pudo enviar el mensaje.");
            setSubject("");
            setMessage("");
            setNotice("Mensaje enviado al equipo de Zyteron.");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo enviar.");
          } finally {
            sending.current = false;
            setBusy(false);
          }
        }}
      >
        <label>
          Asunto
          <input
            required
            minLength={3}
            maxLength={140}
            value={subject}
            disabled={busy}
            onChange={(e) => setSubject(e.target.value)}
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
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        {notice ? <p role="status">{notice}</p> : null}
        <button className="button primary" disabled={busy}>
          {busy ? "Enviando…" : "Enviar mensaje"}
        </button>
      </form>
    </section>
  );
}
