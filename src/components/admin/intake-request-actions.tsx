"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
export function IntakeRequestActions({ id, status }: { id: string; status: string }) {
  const requestId = useRef<string | null>(null);
  const router = useRouter(),
    [value, setValue] = useState(status),
    [reply, setReply] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/portal/admin/requests/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: value,
          reply,
          requestId: (requestId.current ||= crypto.randomUUID()),
        }),
      });
      if (!r.ok) throw new Error();
      setReply("");
      requestId.current = null;
      router.refresh();
    } catch {
      setError("No se pudo actualizar esta solicitud.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 space-y-2">
      <label className="block text-xs font-semibold">
        Estado
        <select
          className="ml-2 rounded-lg border border-slate-200 p-2"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            requestId.current = null;
          }}
        >
          {["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold">
        Respuesta al cliente
        <textarea
          maxLength={3000}
          className="mt-1 block w-full rounded-lg border border-slate-200 p-3 text-sm"
          rows={2}
          value={reply}
          onChange={(e) => {
            setReply(e.target.value);
            requestId.current = null;
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        onClick={() => void save()}
        disabled={busy}
        className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
      >
        {busy ? "Guardando…" : "Guardar y compartir actualización"}
      </button>
    </div>
  );
}
