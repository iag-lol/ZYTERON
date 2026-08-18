"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Send, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

type Candidate = {
  id: string;
  name: string;
  email: string | null;
  potential: string;
};

type BulkResult = {
  attempted: number;
  sent: number;
  skipped: Array<{ name: string; reason: string }>;
  errors: Array<{ name: string; error: string }>;
};

/**
 * Contacto masivo de prospectos nuevos.
 *
 * Cada mensaje se redacta por separado con los datos de su empresa: no se envía
 * el mismo texto a todos. La tanda se limita a 8 y va espaciada, para no quemar la
 * reputación del dominio.
 */
export function BulkOutreach({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contactable = candidates.filter((item) => item.email);

  const toggle = useCallback((id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sales-ai/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk", companyIds: selected }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "No se pudo ejecutar el contacto.");
      setResult(payload.result as BulkResult);
      setSelected([]);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [selected, router]);

  if (contactable.length === 0) return null;

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Users className="h-4 w-4" /> Contactar prospectos nuevos
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            {contactable.length} sin contactar y con correo. Entran a la cola y Zara los redacta y
            despacha de a uno, con horarios repartidos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelected(contactable.slice(0, 50).map((item) => item.id))}
            disabled={busy}
          >
            Seleccionar 50
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelected([])}
            disabled={busy || selected.length === 0}
          >
            Limpiar
          </Button>
          <Button
            onClick={() => void run()}
            disabled={busy || selected.length === 0}
            className="gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Encolar {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="font-bold text-slate-900">
            Encolados: {result.sent} de {result.attempted}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Zara los redacta y los envía de a uno, repartidos durante el día. No salen ahora.
          </p>
          {result.skipped.length > 0 ? (
            <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
              {result.skipped.slice(0, 8).map((item, index) => (
                <li key={`${item.name}-${index}`}>
                  <span className="font-semibold">{item.name}:</span> {item.reason}
                </li>
              ))}
            </ul>
          ) : null}
          {result.errors.length > 0 ? (
            <ul className="mt-2 space-y-0.5 text-xs text-rose-700">
              {result.errors.slice(0, 8).map((item, index) => (
                <li key={`${item.name}-${index}`}>
                  <span className="font-semibold">{item.name}:</span> {item.error}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {busy ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          Encolando prospectos. El envío ocurre después, de a uno.
        </p>
      ) : null}

      <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white">
        {contactable.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center gap-3 border-b border-slate-100 p-2.5 text-sm last:border-b-0 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
              disabled={busy}
              className="h-4 w-4 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{item.name}</span>
            <span className="hidden truncate text-xs text-slate-500 sm:block">{item.email}</span>
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {item.potential}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
