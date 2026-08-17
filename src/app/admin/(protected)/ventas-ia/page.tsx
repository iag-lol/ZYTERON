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
import { getSalesSettings } from "@/lib/sales-ai/settings";
import { listCompanies } from "@/lib/sales-ai/repository";
import { SALES_STATUSES, SALES_STATUS_LABELS } from "@/lib/sales-ai/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ventas IA" };

export default async function VentasIaResumenPage() {
  const settings = await getSalesSettings();
  const budget = await getBudgetStatus();

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
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Ventas IA · Zara</h1>
          <p className="mt-1 text-sm text-slate-600">
            Ejecutivo comercial IA. Estado actual del pipeline y del gasto.
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
            <AlertTriangle className="h-3.5 w-3.5" /> Presupuesto IA
          </p>
          <p className="mt-1 text-lg font-extrabold">{budget.percent.toFixed(0)}% consumido</p>
          <p className="mt-1 text-xs">
            ${budget.monthlySpentUsd.toFixed(4)} de ${budget.monthlyLimitUsd} este mes ·{" "}
            {budget.callCount} llamadas
          </p>
        </div>
      </div>

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
          { href: "/admin/ventas-ia/bandeja", label: "Bandeja IA", icon: Inbox },
          { href: "/admin/ventas-ia/actividad", label: "Actividad IA", icon: BarChart3 },
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
