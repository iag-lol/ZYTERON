import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  FileSpreadsheet,
  Inbox,
  PauseCircle,
  TrendingUp,
  Users,
} from "lucide-react";

import { getBudgetStatus } from "@/lib/sales-ai/budget";
import { getMailAccount, isGraphConfigured } from "@/lib/sales-ai/graph-client";
import { detectDormantOpportunities } from "@/lib/sales-ai/followups";
import { getEffectiveDailyLimit, getQueueStats, getUpcomingSends } from "@/lib/sales-ai/queue";
import { QueuePanel } from "@/components/admin/sales-ai/queue-panel";
import { getSalesSettings } from "@/lib/sales-ai/settings";
import { listCompanies } from "@/lib/sales-ai/repository";
import { SALES_STATUSES, SALES_STATUS_LABELS } from "@/lib/sales-ai/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Zara" };

/** Se evalúa fuera del componente para no leer el reloj durante el render. */
function resolveWebhookStatus(subscriptionId: string | null, expiresAt: string | null) {
  if (!subscriptionId) return "SIN SUSCRIPCIÓN";
  if (!expiresAt) return "VENCIDO";
  return new Date(expiresAt).getTime() > new Date().getTime() ? "OPERATIVO" : "VENCIDO";
}

export default async function VentasIaResumenPage() {
  const settings = await getSalesSettings();
  const budget = await getBudgetStatus();
  const mailAccount = await getMailAccount().catch(() => null);
  const graphReady = isGraphConfigured();
  const dormant = await detectDormantOpportunities().catch(() => []);
  const queueStats = await getQueueStats().catch(() => null);
  const upcoming = await getUpcomingSends(12).catch(() => []);
  const dailyLimit = await getEffectiveDailyLimit().catch(() => ({ limit: 0, stage: "sin datos" }));

  const mailStatus = !graphReady
    ? "NO CONFIGURADO"
    : mailAccount?.last_error
      ? "ERROR"
      : mailAccount?.connected_at
        ? "CONECTADO"
        : "DESCONECTADO";

  const webhookStatus = resolveWebhookStatus(
    mailAccount?.subscription_id ?? null,
    mailAccount?.subscription_expires_at ?? null,
  );

  let byStatus: Record<string, number> = {};
  let total = 0;
  let ready = true;

  try {
    const { companies, total: count } = await listCompanies({ limit: 500 });
    total = count;
    byStatus = companies.reduce<Record<string, number>>((acc, company) => {
      acc[company.status] = (acc[company.status] ?? 0) + 1;
      return acc;
    }, {});
  } catch {
    ready = false;
  }

  const won = byStatus.GANADO ?? 0;
  const contacted = (byStatus.CONTACTADO ?? 0) + (byStatus.RESPONDIO ?? 0) + (byStatus.INTERESADO ?? 0);
  const replied = byStatus.RESPONDIO ?? 0;
  const replyRate = contacted > 0 ? (replied / contacted) * 100 : 0;

  const budgetTone =
    budget.level === "BLOCKED"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : budget.level === "REDUCED"
        ? "border-orange-200 bg-orange-50 text-orange-800"
        : budget.level === "WARNING"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Zara · Ejecutiva Comercial</h1>
          <p className="mt-1 text-sm text-slate-600">
            Estado actual del pipeline comercial, la operación y el gasto.
          </p>
        </div>
      </header>

      {!ready ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-bold">Falta ejecutar la migración de base de datos.</p>
          <p className="mt-1">
            Corre <code>supabase/sales_ai_zara.sql</code> en el editor SQL de Supabase para crear las
            tablas del módulo. Es idempotente y no toca tus tablas existentes.
          </p>
        </div>
      ) : null}

      {/* Estado operativo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className={`rounded-xl border p-4 ${
            settings.zara_paused
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <PauseCircle className="h-3.5 w-3.5" /> Estado de Zara
          </p>
          <p className="mt-1 text-lg font-extrabold">
            {settings.zara_paused ? "PAUSADA" : "Activa"}
          </p>
          <p className="mt-1 text-xs">
            {settings.zara_paused
              ? "No se envían correos ni respuestas automáticas."
              : settings.auto_reply_enabled
                ? "Respuesta automática habilitada."
                : "Todo requiere aprobación humana."}
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            settings.test_mode
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-widest">Modo</p>
          <p className="mt-1 text-lg font-extrabold">
            {settings.test_mode ? "PRUEBA" : "Producción"}
          </p>
          <p className="mt-1 text-xs">
            {settings.test_mode
              ? "Los correos no llegan a prospectos reales."
              : "Los envíos llegan a destinatarios reales."}
          </p>
        </div>

        <div className={`rounded-xl border p-4 ${budgetTone}`}>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <AlertTriangle className="h-3.5 w-3.5" /> Presupuesto
          </p>
          <p className="mt-1 text-lg font-extrabold">{budget.percent.toFixed(0)}% consumido</p>
          <p className="mt-1 text-xs">
            ${budget.monthlySpentUsd.toFixed(4)} de ${budget.monthlyLimitUsd} este mes ·{" "}
            {budget.callCount} llamadas
          </p>
        </div>
      </div>

      {queueStats ? (
        <QueuePanel
          stats={queueStats}
          upcoming={upcoming as never}
          paused={settings.zara_paused}
          pauseReason={(settings as unknown as { pause_reason?: string }).pause_reason ?? null}
          dailyLimit={dailyLimit.limit}
          warmupStage={dailyLimit.stage}
        />
      ) : null}

      {/* Estado general */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-extrabold text-slate-900">Estado general</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Correo", value: mailStatus, ok: mailStatus === "CONECTADO" },
            {
              label: "Motor de redacción",
              value: process.env.OPENAI_API_KEY ? "OPERATIVO" : "SIN CLAVE",
              ok: Boolean(process.env.OPENAI_API_KEY),
            },
            { label: "Webhook", value: webhookStatus, ok: webhookStatus === "OPERATIVO" },
            {
              label: "Seguimientos",
              value: settings.zara_paused ? "PAUSADOS" : "OPERATIVOS",
              ok: !settings.zara_paused,
            },
            {
              label: "Automatización",
              value: settings.auto_reply_enabled ? "AUTOMÁTICA" : "MANUAL",
              ok: true,
            },
            {
              label: "Presupuesto",
              value: `${budget.percent.toFixed(0)}%`,
              ok: budget.level === "OK",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <span className="text-slate-600">{item.label}</span>
              <span className="flex items-center gap-1.5 font-bold text-slate-900">
                <span
                  className={`h-2 w-2 rounded-full ${item.ok ? "bg-emerald-500" : "bg-amber-500"}`}
                />
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Oportunidades dormidas */}
      {dormant.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-extrabold text-amber-900">
            {dormant.length} oportunidad(es) requieren atención
          </h2>
          <div className="mt-3 space-y-2">
            {dormant.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/admin/ventas-ia/prospectos/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white p-3 text-sm transition-colors hover:border-amber-300"
              >
                <span className="font-bold text-slate-900">{item.name}</span>
                <span className="text-xs text-slate-600">
                  {item.status} · potencial {item.potential} · {item.daysWithoutReply} días sin respuesta
                  {item.potentialValue ? ` · $${item.potentialValue.toLocaleString("es-CL")}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Pipeline */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <TrendingUp className="h-4 w-4" /> Pipeline comercial
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SALES_STATUSES.map((status) => (
            <Link
              key={status}
              href={`/admin/ventas-ia/prospectos?estado=${status}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-blue-200 hover:bg-white"
            >
              <p className="text-xs font-semibold text-slate-500">{SALES_STATUS_LABELS[status]}</p>
              <p className="mt-0.5 text-xl font-extrabold text-slate-900">{byStatus[status] ?? 0}</p>
            </Link>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-6 border-t border-slate-100 pt-4 text-sm">
          <span>
            <span className="text-slate-500">Total prospectos:</span>{" "}
            <strong className="text-slate-900">{total}</strong>
          </span>
          <span>
            <span className="text-slate-500">Tasa de respuesta:</span>{" "}
            <strong className="text-slate-900">{replyRate.toFixed(0)}%</strong>
          </span>
          <span>
            <span className="text-slate-500">Ganados:</span>{" "}
            <strong className="text-emerald-700">{won}</strong>
          </span>
        </div>
      </section>

      {/* Accesos */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/ventas-ia/importar", label: "Importar prospectos", icon: FileSpreadsheet },
          { href: "/admin/ventas-ia/prospectos", label: "Ver prospectos", icon: Users },
          { href: "/admin/ventas-ia/bandeja", label: "Bandeja", icon: Inbox },
          { href: "/admin/ventas-ia/actividad", label: "Actividad", icon: BarChart3 },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40"
          >
            <item.icon className="h-5 w-5 text-blue-700" />
            <span className="text-sm font-bold text-slate-800">{item.label}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
