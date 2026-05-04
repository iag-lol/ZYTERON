import { BadgeDollarSign, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { getExpenses } from "@/lib/admin/repository";
import { ExpensesManager } from "@/components/admin/expenses-manager";

type PageProps = {
  searchParams?:
    | {
        status?: string;
        category?: string;
        saved?: string;
        error?: string;
        warning?: string;
      }
    | Promise<{
        status?: string;
        category?: string;
        saved?: string;
        error?: string;
        warning?: string;
      }>;
};

function normalizeStatus(value?: string | null) {
  const candidate = String(value || "").trim().toUpperCase();
  if (candidate === "PURCHASED" || candidate === "PLANNED" || candidate === "CANCELLED") return candidate;
  return "ALL";
}

function normalizeCategory(value?: string | null) {
  const candidate = String(value || "").trim().toUpperCase();
  if (!candidate) return "ALL";
  return candidate;
}

function safeDecodeQueryParam(value?: string | null) {
  const message = String(value || "").trim();
  if (!message) return "";
  try {
    return decodeURIComponent(message);
  } catch {
    return message;
  }
}

export default async function GastosPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams);
  const activeStatus = normalizeStatus(query?.status);
  const activeCategory = normalizeCategory(query?.category);
  const rows = await getExpenses();

  const filteredExpenses = rows.filter((item) => {
    const status = String(item.status || "").toUpperCase();
    const category = String(item.category || "OTROS").toUpperCase();
    if (activeStatus !== "ALL" && status !== activeStatus) return false;
    if (activeCategory !== "ALL" && category !== activeCategory) return false;
    return true;
  });

  const categories = Array.from(
    new Set(rows.map((item) => String(item.category || "OTROS").toUpperCase()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      {query?.saved === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Gasto guardado correctamente.
        </div>
      ) : null}
      {query?.warning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {safeDecodeQueryParam(query.warning)}
        </div>
      ) : null}
      {query?.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {safeDecodeQueryParam(query.error)}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Control financiero</p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Gastos de la empresa</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registro centralizado de compras, pagos recurrentes y gastos operativos.
          </p>
        </div>
        <Link
          href="/admin/gastos"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo gasto
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "ALL", label: "Todos", count: rows.length, icon: Receipt },
            {
              key: "PLANNED",
              label: "Próxima compra",
              count: rows.filter((item) => String(item.status || "").toUpperCase() === "PLANNED").length,
              icon: BadgeDollarSign,
            },
            {
              key: "PURCHASED",
              label: "Comprado",
              count: rows.filter((item) => String(item.status || "").toUpperCase() === "PURCHASED").length,
              icon: BadgeDollarSign,
            },
          ].map((statusFilter) => {
            const href =
              statusFilter.key === "ALL"
                ? `/admin/gastos?category=${activeCategory}`
                : `/admin/gastos?status=${statusFilter.key}&category=${activeCategory}`;
            const active = activeStatus === statusFilter.key;
            return (
              <Link
                key={statusFilter.key}
                href={href}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <statusFilter.icon className="h-3.5 w-3.5" />
                {statusFilter.label}
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200">
                  {statusFilter.count}
                </span>
              </Link>
            );
          })}

          <span className="mx-1 h-5 w-px bg-slate-200" />

          <Link
            href={`/admin/gastos?status=${activeStatus}`}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeCategory === "ALL" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Todas las categorías
          </Link>
          {categories.map((category) => {
            const href = `/admin/gastos?status=${activeStatus}&category=${category}`;
            const active = activeCategory === category;
            return (
              <Link
                key={category}
                href={href}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {category}
              </Link>
            );
          })}
        </div>
      </div>

      <ExpensesManager expenses={filteredExpenses} activeCategory={activeCategory} activeStatus={activeStatus} />
    </div>
  );
}
