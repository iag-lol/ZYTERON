"use client";
import { useEffect, useState } from "react";
import { DateInput, Feedback } from "@control/components/finance/fx-ui";
import { formatDate } from "@control/lib/date-time";
import type { MonthlyPlan } from "@/lib/payments/monthly-billing";
import { billingToday } from "@/lib/payments/monthly-calendar";
export function MonthlyPlanControls({
  quoteId,
  onChanged,
}: {
  quoteId: string;
  onChanged: () => Promise<void>;
}) {
  const [plan, setPlan] = useState<MonthlyPlan | null>(null),
    [loaded, setLoaded] = useState(false),
    [date, setDate] = useState(billingToday()),
    [reminders, setReminders] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`/api/portal/admin/quotes/${quoteId}/monthly`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (active) {
          setPlan(d.plan);
          setReminders(d.plan?.reminders_enabled ?? true);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [quoteId]);
  const save = async (status: "ACTIVE" | "PAUSED") => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(`/api/portal/admin/quotes/${quoteId}/monthly`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstDate: plan?.anchor_date || date, status, reminders }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setPlan(d.plan);
      setNotice(
        status === "ACTIVE"
          ? "Calendario activo. Los cobros se generan siete días antes de vencer."
          : "Calendario pausado. Los cobros existentes conservan su saldo.",
      );
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="quotePortalLink">
      <h4>Renovación mensual</h4>
      <p>
        Genera una cuenta por cobrar por mes según el importe aceptado. Los avisos se envían tres
        días antes, al vencer y a los 7 y 30 días de atraso.
      </p>
      <Feedback error={error} notice={notice} />
      {loaded ? (
        <>
          <p>
            {plan
              ? `Estado: ${plan.status === "ACTIVE" ? "Activo" : "Pausado"} · Próximo vencimiento: ${formatDate(plan.next_due)}`
              : "Requiere propuesta mensual aceptada y cliente vinculado."}
          </p>
          {!plan ? (
            <label>
              Primer vencimiento
              <DateInput required value={date} onChange={setDate} />
            </label>
          ) : null}
          <label>
            <input
              type="checkbox"
              checked={reminders}
              disabled={busy}
              onChange={(e) => setReminders(e.target.checked)}
            />{" "}
            Avisar por correo y en el portal
          </label>
          <div className="fx-actions">
            <button
              type="button"
              className="fx-btn primary"
              disabled={busy || !date}
              onClick={() => void save("ACTIVE")}
            >
              {busy
                ? "Guardando…"
                : plan
                  ? "Guardar / activar calendario"
                  : "Activar calendario mensual"}
            </button>
            {plan?.status === "ACTIVE" ? (
              <button className="fx-btn" disabled={busy} onClick={() => void save("PAUSED")}>
                Pausar renovaciones
              </button>
            ) : null}
          </div>
          <small>
            Las suscripciones autorizadas en Flow usan su propio calendario. Este control no realiza
            cargos a tarjetas.
          </small>
        </>
      ) : null}
    </section>
  );
}
