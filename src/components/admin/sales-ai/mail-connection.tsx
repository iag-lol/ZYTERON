"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  PlugZap,
  RefreshCw,
  Unplug,
} from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Panel de conexión con Microsoft 365.
 * El navegador solo ve estado y fechas: ni tokens, ni clientState, ni secretos.
 */

type MailStatus = {
  status: "CONECTADO" | "DESCONECTADO" | "ERROR" | "NO_CONFIGURADO";
  graphConfigured: boolean;
  encryptionConfigured: boolean;
  mailbox: string | null;
  displayName: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  subscriptionId: string | null;
  subscriptionExpiresAt: string | null;
  lastError: string | null;
  authorizeUrl: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function subscriptionState(expiresAt: string | null): {
  label: string;
  tone: string;
  expiringSoon: boolean;
} {
  if (!expiresAt) return { label: "Sin suscripción", tone: "text-slate-600", expiringSoon: false };

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return { label: "Vencida", tone: "text-rose-700", expiringSoon: true };

  const hours = Math.round(remainingMs / (60 * 60 * 1000));
  if (hours <= 12) {
    return { label: `Vence en ${hours} h`, tone: "text-amber-700", expiringSoon: true };
  }
  return { label: `Vigente · ${hours} h restantes`, tone: "text-emerald-700", expiringSoon: false };
}

export function MailConnection({ initialFlash }: { initialFlash?: string | null }) {
  const [data, setData] = useState<MailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(
    initialFlash ? { tone: initialFlash.startsWith("OK") ? "ok" : "error", text: initialFlash.replace(/^(OK|ERR):/, "") } : null,
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sales-ai/mail");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "No se pudo leer el estado del correo.");
      setData(payload as MailStatus);
    } catch (error) {
      setMessage({ tone: "error", text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (action: "subscribe" | "renew" | "unsubscribe") => {
      setBusy(action);
      setMessage(null);
      try {
        const res = await fetch("/api/admin/sales-ai/mail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "La acción falló.");

        const texts: Record<string, string> = {
          subscribe: payload.renewed
            ? "Ya existía una suscripción vigente y se renovó."
            : "Webhook creado. Los correos entrantes empezarán a llegar.",
          renew: "Suscripción renovada correctamente.",
          unsubscribe: "Suscripción eliminada. Dejarán de llegar correos entrantes.",
        };
        setMessage({ tone: "ok", text: texts[action] });
        await load();
      } catch (error) {
        setMessage({ tone: "error", text: (error as Error).message });
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Consultando el estado del correo…
        </p>
      </section>
    );
  }

  if (!data) return null;

  const connected = data.status === "CONECTADO";
  const subscription = subscriptionState(data.subscriptionExpiresAt);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <Mail className="h-4 w-4" /> Conexión de correo
        </h2>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
            connected
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : data.status === "ERROR"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {data.status === "NO_CONFIGURADO" ? "NO CONFIGURADO" : data.status}
        </span>
      </div>

      {message ? (
        <p
          className={`mt-3 rounded-xl border p-3 text-sm ${
            message.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {!data.graphConfigured || !data.encryptionConfigured ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4" /> Faltan variables en el servidor
          </p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs">
            {!data.graphConfigured ? (
              <li>MS_GRAPH_CLIENT_ID, MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_SECRET y MS_GRAPH_REDIRECT_URI</li>
            ) : null}
            {!data.encryptionConfigured ? <li>SALES_AI_ENCRYPTION_KEY (mínimo 32 caracteres)</li> : null}
          </ul>
          <p className="mt-2 text-xs">
            Se configuran en Render → Environment. El detalle está en docs/zara-ventas-ia.md.
          </p>
        </div>
      ) : null}

      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-500">Buzón conectado</dt>
          <dd className="text-right font-semibold text-slate-800">
            {data.mailbox ?? "—"}
            {data.displayName ? (
              <span className="block text-xs font-normal text-slate-500">{data.displayName}</span>
            ) : null}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-500">Conectado el</dt>
          <dd className="text-right font-semibold text-slate-800">{formatDate(data.connectedAt)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-500">Última sincronización</dt>
          <dd className="text-right font-semibold text-slate-800">{formatDate(data.lastSyncAt)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-500">Suscripción del webhook</dt>
          <dd className={`text-right font-semibold ${subscription.tone}`}>{subscription.label}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-500">Vence el</dt>
          <dd className="text-right font-semibold text-slate-800">
            {formatDate(data.subscriptionExpiresAt)}
          </dd>
        </div>
      </dl>

      {data.lastError ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <span className="font-bold">Último error de Microsoft:</span> {data.lastError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {data.authorizeUrl ? (
          <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
            <a href={data.authorizeUrl}>
              <PlugZap className="h-4 w-4" />
              {connected ? "Reconectar buzón" : "Conectar correo"}
            </a>
          </Button>
        ) : null}

        {connected && !data.subscriptionId ? (
          <Button
            onClick={() => void runAction("subscribe")}
            disabled={busy !== null}
            className="gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
          >
            {busy === "subscribe" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Crear webhook
          </Button>
        ) : null}

        {connected && data.subscriptionId ? (
          <>
            <Button
              onClick={() => void runAction("renew")}
              disabled={busy !== null}
              variant="outline"
              className={`gap-2 font-semibold ${
                subscription.expiringSoon ? "border-amber-400 text-amber-800" : "border-slate-300 text-slate-800"
              }`}
            >
              {busy === "renew" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Renovar webhook
            </Button>
            <Button
              onClick={() => void runAction("unsubscribe")}
              disabled={busy !== null}
              variant="outline"
              className="gap-2 border-slate-300 font-semibold text-slate-600"
            >
              {busy === "unsubscribe" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4" />
              )}
              Eliminar suscripción
            </Button>
          </>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        La suscripción de Microsoft dura unas 70 horas y el cron la renueva sola antes de vencer.
        Los botones son para el primer uso o para reparar la conexión.
      </p>
    </section>
  );
}
