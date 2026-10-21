"use client";
import { useEffect, useState } from "react";
import { DateInput, Feedback } from "@control/components/finance/fx-ui";
import { parseDay } from "@control/lib/finance-format";
import { formatDate } from "@control/lib/date-time";
import type { MonthlyPlan } from "@/lib/payments/monthly-billing";
import type { CollectionSettings } from "@/lib/payments/collection-settings";
import { billingToday, monthlyNextDate } from "@/lib/payments/monthly-calendar";
import { calendarDate, collectionAnchor, suspensionDate } from "@/lib/payments/collection-calendar";

type CalendarData = {
  plan: MonthlyPlan | null;
  settings: CollectionSettings | null;
  eligibility: {
    canActivate: boolean;
    managedBy: string;
    closed: boolean;
    accepted: boolean;
    linked: boolean;
    siteOrigin: string | null;
  };
  continuity: { mode: string; suspensionDate: string | null; balance: number };
};
export function MonthlyPlanControls({
  quoteId,
  onChanged,
}: {
  quoteId: string;
  onChanged: () => Promise<void>;
}) {
  const [data, setData] = useState<CalendarData | null>(null),
    [date, setDate] = useState(billingToday()),
    [dateValid, setDateValid] = useState(true),
    [chargeDay, setChargeDay] = useState(Number(billingToday().slice(-2))),
    [reminders, setReminders] = useState(true),
    [suspend, setSuspend] = useState(false),
    [grace, setGrace] = useState(7),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const apply = (d: CalendarData) => {
    setData(d);
    setDateValid(true);
    setDate(d.plan?.next_due || d.settings?.first_date || billingToday());
    setChargeDay(
      d.settings?.charge_day || Number((d.plan?.anchor_date || billingToday()).slice(-2)),
    );
    setReminders(d.settings?.reminders_enabled ?? d.plan?.reminders_enabled ?? true);
    setSuspend(d.settings?.suspension_enabled ?? false);
    setGrace(d.settings?.grace_days ?? 7);
  };
  useEffect(() => {
    let active = true;
    fetch(`/api/portal/admin/quotes/${quoteId}/monthly`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (active) apply(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [quoteId]);
  const save = async (status: "DRAFT" | "ACTIVE" | "PAUSED") => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(`/api/portal/admin/quotes/${quoteId}/monthly`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstDate: date,
          chargeDay,
          status,
          reminders,
          suspensionEnabled: suspend,
          graceDays: grace,
          revision: data?.settings?.revision || 0,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      apply(d);
      setNotice(
        status === "DRAFT"
          ? "Configuración guardada en borrador. No genera cobros ni suspensiones."
          : status === "PAUSED"
            ? "Renovaciones y suspensión por este calendario pausadas. Los saldos emitidos se conservan."
            : "Calendario guardado y activo. Los cobros emitidos conservan sus fechas y montos.",
      );
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };
  const dates: string[] = [];
  if (date) {
    dates.push(date);
    for (let n = 0; n < 2; n++)
      dates.push(monthlyNextDate(collectionAnchor(chargeDay), dates.at(-1)!));
  }
  const disabled =
    busy ||
    !date ||
    !dateValid ||
    !Number.isInteger(grace) ||
    grace < 0 ||
    grace > 90 ||
    data?.eligibility.closed;
  return (
    <section className="quotePortalLink collectionCalendar" aria-label="Calendario mensual">
      <h4>Calendario de cobro y suspensión</h4>
      <Feedback error={error} notice={notice} />
      {!data ? (
        <p aria-busy="true">Cargando calendario…</p>
      ) : (
        <>
          <p>
            {data.plan
              ? `Estado: ${data.plan.status === "ACTIVE" ? "Activo" : "Pausado"} · Próximo período sin emitir: ${formatDate(data.plan.next_due)}`
              : "Configuración en borrador. La activación requiere propuesta aceptada y cliente vinculado."}
          </p>
          {data.eligibility.managedBy !== "MANUAL" ? (
            <p role="status">
              {data.eligibility.managedBy === "FLOW"
                ? "Flow gestiona los cargos autorizados. Este calendario no reemplaza las fechas del proveedor ni activa una segunda suscripción."
                : "Esta propuesta tiene un calendario de Finanzas. Sus cuotas se administran desde Calendario y pagos."}
            </p>
          ) : null}
          <div className="collectionFields">
            <label
              onInputCapture={(e) =>
                setDateValid(!!parseDay((e.target as HTMLInputElement).value))
              }
            >
              {data.plan ? "Próximo vencimiento sin emitir" : "Primer vencimiento"}
              <DateInput
                required
                value={date}
                onChange={(v) => {
                  setDate(v);
                  if (v && calendarDate(v, chargeDay) !== v) setChargeDay(Number(v.slice(-2)));
                }}
              />
            </label>
            <label>
              Día de cobro mensual
              <select
                value={chargeDay}
                disabled={busy}
                onChange={(e) => {
                  const day = Number(e.target.value);
                  setChargeDay(day);
                  setDateValid(true);
                  if (date) setDate(calendarDate(date, day));
                }}
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <small>
            Los días 29, 30 y 31 se ajustan al último día disponible del mes. Los cambios afectan
            períodos aún sin emitir.
          </small>
          <label className="collectionCheck">
            <input
              type="checkbox"
              checked={reminders}
              disabled={busy}
              onChange={(e) => setReminders(e.target.checked)}
            />
            Avisar por correo y en el portal: tres días antes, al vencer y a los 7 y 30 días de
            atraso.
          </label>
          <label className="collectionCheck">
            <input
              type="checkbox"
              checked={suspend}
              disabled={busy}
              onChange={(e) => setSuspend(e.target.checked)}
            />
            Suspender la web vinculada por saldo mensual pendiente
          </label>
          <label>
            Días de gracia después del vencimiento
            <input
              type="number"
              min="0"
              max="90"
              step="1"
              value={Number.isNaN(grace) ? "" : grace}
              disabled={busy || !suspend}
              onChange={(e) => setGrace(e.target.value === "" ? NaN : Number(e.target.value))}
            />
          </label>
          <p>
            {data.eligibility.siteOrigin
              ? `Sitio vinculado: ${data.eligibility.siteOrigin}. La aplicación de la suspensión requiere que el sitio consulte el control de acceso.`
              : "Sin sitio conectado a esta cotización. La regla se puede guardar; la suspensión automática requiere vincular la web y su control de acceso."}
          </p>
          {dates.length ? (
            <div className="collectionPreview">
              <strong>Vista previa de próximos períodos</strong>
              <table>
                <thead>
                  <tr>
                    <th>Vencimiento</th>
                    <th>Suspensión desde las 00:00</th>
                  </tr>
                </thead>
                <tbody>
                  {dates.map((d) => (
                    <tr key={d}>
                      <td>{formatDate(d)}</td>
                      <td>
                        {suspend && Number.isInteger(grace)
                          ? formatDate(suspensionDate(d, grace))
                          : "Desactivada"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <small>
                Hora de Santiago. La suspensión sólo aplica a deuda confirmada pendiente de este
                calendario activo. Un pago confirmado que cubra el saldo habilita nuevamente el
                acceso.
              </small>
            </div>
          ) : null}
          {data.continuity.suspensionDate ? (
            <p>
              Saldo mensual pendiente:{" "}
              {new Intl.NumberFormat("es-CL", {
                style: "currency",
                currency: "CLP",
                maximumFractionDigits: 0,
              }).format(data.continuity.balance)}{" "}
              · Suspensión prevista: {formatDate(data.continuity.suspensionDate)}.
            </p>
          ) : null}
          <div className="fx-actions">
            <button
              type="button"
              className="fx-btn primary"
              disabled={disabled}
              onClick={() => void save(data.plan?.status || "DRAFT")}
            >
              {busy
                ? "Guardando…"
                : data.plan
                  ? "Guardar cambios del calendario"
                  : "Guardar configuración en borrador"}
            </button>
            {data.eligibility.canActivate && data.plan?.status !== "ACTIVE" ? (
              <button
                type="button"
                className="fx-btn"
                disabled={disabled}
                onClick={() => void save("ACTIVE")}
              >
                {data.plan ? "Reactivar calendario" : "Activar calendario mensual"}
              </button>
            ) : null}
            {data.plan?.status === "ACTIVE" ? (
              <button
                type="button"
                className="fx-btn"
                disabled={busy}
                onClick={() => void save("PAUSED")}
              >
                Pausar renovaciones
              </button>
            ) : null}
          </div>
          <small>
            La activación genera cuentas por cobrar siete días antes de vencer. No realiza cargos a
            tarjetas. Guardar un borrador no activa la renovación automáticamente.
          </small>
        </>
      )}
    </section>
  );
}
