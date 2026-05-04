"use client";

import { useMemo, useState } from "react";
import { CalendarClock, FilePenLine, PackageCheck, ReceiptText, Save, Trash2, WalletCards } from "lucide-react";
import type { Expense } from "@/lib/admin/repository";

type Props = {
  expenses: Expense[];
  activeCategory: string;
  activeStatus: string;
};

type CategoryOption = {
  key: string;
  label: string;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: "COMPRA", label: "Compras" },
  { key: "WIFI", label: "Wifi / Internet" },
  { key: "ARRIENDO", label: "Arriendos" },
  { key: "SUELDOS", label: "Sueldos / Honorarios" },
  { key: "MARKETING", label: "Marketing" },
  { key: "SERVICIOS", label: "Servicios terceros" },
  { key: "SOFTWARE", label: "Software / SaaS" },
  { key: "LOGISTICA", label: "Logística / Envíos" },
  { key: "OTROS", label: "Otros" },
];

const STATUS_OPTIONS = [
  { key: "PLANNED", label: "Próxima compra" },
  { key: "PURCHASED", label: "Comprado" },
  { key: "CANCELLED", label: "Cancelado" },
];

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function statusPill(status?: string | null) {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "PURCHASED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (normalized === "CANCELLED") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function categoryLabel(category?: string | null) {
  const key = String(category || "OTROS").trim().toUpperCase();
  const match = CATEGORY_OPTIONS.find((item) => item.key === key);
  return match?.label || key;
}

export function ExpensesManager({ expenses, activeCategory, activeStatus }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const purchased = expenses.filter((item) => String(item.status || "").toUpperCase() === "PURCHASED");
    const planned = expenses.filter((item) => String(item.status || "").toUpperCase() === "PLANNED");
    const totalPurchased = purchased.reduce((acc, item) => acc + (typeof item.amount === "number" ? item.amount : 0), 0);
    const totalPlanned = planned.reduce((acc, item) => acc + (typeof item.amount === "number" ? item.amount : 0), 0);
    return {
      purchasedCount: purchased.length,
      plannedCount: planned.length,
      totalPurchased,
      totalPlanned,
    };
  }, [expenses]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Total gastos comprados</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{currency(totals.totalPurchased)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Total próximas compras</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700">{currency(totals.totalPlanned)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Comprados</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">{totals.purchasedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Planificados</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700">{totals.plannedCount}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <WalletCards className="h-5 w-5 text-blue-700" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Nuevo gasto</h2>
            <p className="text-xs text-slate-500">Registra compras realizadas o planifica próximas compras.</p>
          </div>
        </div>

        <form action="/admin/gastos/submit" method="post" encType="multipart/form-data" className="space-y-4">
          <input type="hidden" name="redirectTo" value={`/admin/gastos?status=${activeStatus}&category=${activeCategory}`} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Nombre</label>
              <input name="name" required placeholder="Ej: Router oficina central" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Categoría</label>
              <select name="category" defaultValue="OTROS" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estado</label>
              <select name="status" defaultValue="PLANNED" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Valor (CLP)</label>
              <input name="amount" type="text" inputMode="numeric" placeholder="Ej: 30.000" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Tienda</label>
              <input name="store" placeholder="Ej: PC Factory" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">N° Factura (opcional)</label>
              <input name="invoiceNumber" placeholder="Ej: F-001245" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fecha compra</label>
              <input name="purchaseDate" type="date" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fecha llegada</label>
              <input name="arrivalDate" type="date" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Adjuntar factura / respaldo</label>
              <input name="invoiceFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-slate-700" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Observación</label>
            <textarea name="description" rows={3} placeholder="Detalle del gasto, contexto y prioridad..." className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>

          <button className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800">
            <Save className="h-4 w-4" />
            Guardar gasto
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Historial de gastos</h2>
            <p className="text-xs text-slate-400">Planificados y comprados, con seguimiento de factura y respaldo.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
            {expenses.length} registros
          </span>
        </div>

        {expenses.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">No hay gastos registrados.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {expenses.map((expense) => {
              const isEditing = editingId === expense.id;
              const normalizedStatus = String(expense.status || "").toUpperCase();
              return (
                <div key={expense.id} className="px-6 py-4">
                  <div className="grid gap-3 md:grid-cols-[1.8fr_1fr_1fr_1fr_auto] md:items-center">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{expense.name}</p>
                      <p className="text-xs text-slate-500">{categoryLabel(expense.category)} · {expense.store || "Sin tienda"}</p>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{currency(expense.amount || 0)}</div>
                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusPill(expense.status)}`}>
                        {normalizedStatus === "PURCHASED" ? "Comprado" : normalizedStatus === "CANCELLED" ? "Cancelado" : "Próxima compra"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Compra: {formatDate(expense.purchaseDate)}<br />
                      Llegada: {formatDate(expense.arrivalDate)}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId((prev) => (prev === expense.id ? null : expense.id))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                        title="Editar gasto"
                      >
                        <FilePenLine className="h-4 w-4" />
                      </button>
                      <form action={`/admin/gastos/${expense.id}/delete`} method="post">
                        <input type="hidden" name="redirectTo" value={`/admin/gastos?status=${activeStatus}&category=${activeCategory}`} />
                        <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50" title="Eliminar gasto">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </div>

                  {expense.description ? (
                    <p className="mt-2 text-sm text-slate-600">{expense.description}</p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><ReceiptText className="h-3.5 w-3.5" />Factura: {expense.invoiceNumber || "No registrada"}</span>
                    {expense.invoiceFileUrl ? (
                      <a href={expense.invoiceFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900">
                        Ver archivo adjunto
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1"><PackageCheck className="h-3.5 w-3.5" />Sin archivo adjunto</span>
                    )}
                    <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Actualizado: {formatDate(expense.updatedAt || expense.createdAt)}</span>
                  </div>

                  {isEditing ? (
                    <form action="/admin/gastos/submit" method="post" encType="multipart/form-data" className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <input type="hidden" name="id" value={expense.id} />
                      <input type="hidden" name="redirectTo" value={`/admin/gastos?status=${activeStatus}&category=${activeCategory}`} />

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Nombre</label>
                          <input name="name" required defaultValue={expense.name} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900" />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Categoría</label>
                          <select name="category" defaultValue={String(expense.category || "OTROS").toUpperCase()} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">
                            {CATEGORY_OPTIONS.map((option) => (
                              <option key={option.key} value={option.key}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estado</label>
                          <select name="status" defaultValue={String(expense.status || "PLANNED").toUpperCase()} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.key} value={option.key}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Valor</label>
                          <input name="amount" type="text" inputMode="numeric" defaultValue={typeof expense.amount === "number" ? String(expense.amount) : ""} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900" />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Tienda</label>
                          <input name="store" defaultValue={expense.store || ""} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900" />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">N° Factura</label>
                          <input name="invoiceNumber" defaultValue={expense.invoiceNumber || ""} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900" />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fecha compra</label>
                          <input name="purchaseDate" type="date" defaultValue={expense.purchaseDate?.slice(0, 10) || ""} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900" />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fecha llegada</label>
                          <input name="arrivalDate" type="date" defaultValue={expense.arrivalDate?.slice(0, 10) || ""} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900" />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Adjunto factura/respaldo</label>
                          <input name="invoiceFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-slate-700" />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Observación</label>
                        <textarea name="description" rows={3} defaultValue={expense.description || ""} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900" />
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <button className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
                          <Save className="h-4 w-4" />
                          Guardar cambios
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
