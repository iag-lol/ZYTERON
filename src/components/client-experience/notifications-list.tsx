"use client";
import { useState } from "react";
import { Bell, Check } from "lucide-react";
export function NotificationsList({
  items,
}: {
  items: Array<{ id: string; title: string; body: string; date: string; isRead: boolean }>;
}) {
  const [rows, setRows] = useState(items),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  async function mark(id: string) {
    setBusy(id);
    setError("");
    try {
      const r = await fetch("/api/portal/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!r.ok) throw new Error();
      setRows((v) => v.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      setError("No pudimos actualizar la notificación. Intenta nuevamente.");
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <div className="resource-list">
        {rows.map((n) => (
          <article className="resource-row" key={n.id}>
            <small>{n.date}</small>
            <h2>{n.title}</h2>
            <p>{n.body}</p>
            <button
              disabled={!!busy || n.isRead}
              className="text-button"
              onClick={() => void mark(n.id)}
            >
              <Check size={15} />
              {n.isRead ? "Leída" : busy === n.id ? "Guardando…" : "Marcar como leída"}
            </button>
          </article>
        ))}
        {!rows.length && (
          <div className="empty-state">
            <Bell size={28} />
            <h2>Estás al día.</h2>
            <p>Las novedades de tu espacio aparecerán aquí.</p>
          </div>
        )}
      </div>
    </>
  );
}
