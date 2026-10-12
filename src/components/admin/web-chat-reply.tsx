"use client";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
export function WebChatReply({ threadId }: { threadId: string }) {
  const requestId = useRef<string | null>(null);
  const router = useRouter(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/admin/chat/${threadId}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, requestId: (requestId.current ||= crypto.randomUUID()) }),
      });
      if (!r.ok) throw new Error();
      setMessage("");
      requestId.current = null;
      router.refresh();
    } catch {
      setError("No pudimos guardar la respuesta. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={send} className="space-y-3">
      <label className="block text-sm font-semibold">
        Respuesta del equipo
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            requestId.current = null;
          }}
          required
          minLength={2}
          maxLength={5000}
          className="mt-2 w-full rounded-xl border border-slate-200 p-3"
          rows={3}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button
        disabled={busy}
        className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white"
      >
        {busy ? "Guardando…" : "Publicar respuesta en la conversación"}
      </button>
    </form>
  );
}
