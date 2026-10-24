"use client";

import { ArrowUpRight, Landmark } from "lucide-react";
import { useAccess } from "@control/components/access-context";
import Link from "@control/components/routed-link";
import type { ProjectFinanceSummary } from "@zyteron/contracts";
import { financeApi } from "@control/lib/finance-api";
import { canFinance, day, label, money } from "@control/lib/finance-format";
import { Amount, Loading, Pill, Register, Section, Stamp, useLoad } from "./fx-ui";
export { ClientFinancePanel } from "./client-finance-workspace";

/** Project 360 · Finanzas: margen y costos sólo para Finanzas/Contabilidad/Gerencia. */
export function ProjectFinancePanel({ projectId }: { projectId: string }) {
  const { role } = useAccess();
  const allowed = canFinance(role, "invoice.view");
  const { data, error, loading } = useLoad(
    () =>
      allowed
        ? financeApi.get<ProjectFinanceSummary>(role, `/projects/${projectId}/summary`)
        : Promise.resolve(null),
    [role, projectId, allowed],
  );
  if (!allowed) return null;
  if (loading && !data)
    return (
      <section className="fx-entity">
        <Loading text="Cargando finanzas del proyecto…" />
      </section>
    );
  if (error || !data) return null;
  const d = data;
  return (
    <section className="fx-entity project" aria-label="Finanzas del proyecto">
      <header>
        <span className="fx-seal small">
          <Landmark size={15} />
        </span>
        <div>
          <small>PROJECT 360 · FINANZAS</small>
          <h2>Rentabilidad del proyecto</h2>
        </div>
      </header>
      <section className="fx-ticker small">
        <div>
          <small>Valor vendido</small>
          <strong>{d.soldValue === null ? "—" : money(d.soldValue)}</strong>
        </div>
        <div>
          <small>Facturado</small>
          <strong>{money(d.invoiced)}</strong>
        </div>
        <div>
          <small>Cobrado</small>
          <strong>{money(d.collected)}</strong>
        </div>
        <div>
          <small>Horas registradas</small>
          <strong>{d.laborHours.toLocaleString("es-CL")}</strong>
        </div>
        {canFinance(role, "accounting.view") ? (
          <>
            <div>
              <small>Costo laboral</small>
              <strong>{d.laborCost === null ? "Sin tarifa" : money(d.laborCost)}</strong>
            </div>
            <div>
              <small>Costos directos + gastos</small>
              <strong>{money(d.directCosts + d.expenses)}</strong>
            </div>
            <div className={d.margin !== null && d.margin < 0 ? "tone-critical" : "tone-good"}>
              <small>Margen operacional</small>
              <strong>{d.margin === null ? "—" : money(d.margin)}</strong>
              <span>{d.marginPercent === null ? "" : `Margen bruto ${d.marginPercent}%`}</span>
            </div>
          </>
        ) : null}
      </section>
      {d.notes.length ? (
        <ul className="fx-assumptions">
          {d.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
      <small className="fx-hint">
        Ingresos y costos desde el libro mayor con dimensión proyecto; costo laboral = horas ×
        tarifa de costo vigente ({label("CONFIRMED").toLowerCase()} sólo con tarifa configurada).
      </small>
    </section>
  );
}
