"use client";
import { useState } from "react";
import {
  Feedback,
  Loading,
  ReasonDialog,
  useAction,
  useLoad,
} from "@control/components/finance/fx-ui";
import { formatDate, formatDateTime } from "@control/lib/date-time";
type Control = {
  managed: boolean;
  canCancel: boolean;
  state?: string;
  paidThrough?: string | null;
  verifiedAt?: string | null;
};
export function SubscriptionControls({
  quoteId,
  clientId,
  onChanged,
}: {
  quoteId: string;
  clientId: string;
  onChanged: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const detail = useLoad(async () => {
    const r = await fetch(
      `/api/portal/admin/quotes/${quoteId}/subscription?clientId=${encodeURIComponent(clientId)}`,
      { cache: "no-store" },
    );
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    return d as Control;
  }, [quoteId, clientId]);
  const action = useAction(async () => {
    await detail.reload();
    await onChanged();
  });
  const states: Record<string, string> = {
    ACTIVE: "Suscripción vinculada",
    PENDING_AUTHORIZATION: "Autorización del cliente pendiente",
    CANCEL_REQUESTED: "Cancelación solicitada; pendiente de confirmación de Flow",
    CANCEL_SCHEDULED: "Cancelación confirmada para el final del período",
    CANCELLED: "Suscripción cancelada",
  };
  if (detail.loading && !detail.data) return <Loading text="Consultando renovación…" />;
  if (detail.error) return <Feedback error={detail.error} />;
  if (!detail.data?.managed) return null;
  const d = detail.data;
  return (
    <section className="quotePortalLink collectionCalendar">
      <h4>Renovación en Flow</h4>
      <p>{states[d.state || ""] || "Estado pendiente de revisión"}</p>
      {d.paidThrough ? <p>Período pagado hasta el {formatDate(d.paidThrough)}.</p> : null}
      {d.verifiedAt ? <small>Verificado con Flow: {formatDateTime(d.verifiedAt)}</small> : null}
      <Feedback error={action.error} notice={action.notice} />
      {d.canCancel ? (
        <>
          <p>
            Puedes detener la renovación al final del período. Los pagos y la cobertura ya
            confirmados se conservan. Para volver a contratar, prepara una nueva cotización mensual
            y solicita la autorización del cliente en su portal.
          </p>
          <button className="fx-btn danger" disabled={action.busy} onClick={() => setConfirm(true)}>
            Cancelar renovación en Flow
          </button>
        </>
      ) : d.state === "PENDING_AUTHORIZATION" ? (
        <p>
          No hay una suscripción activa vinculada para cancelar. La autorización pendiente no
          confirma un cobro.
        </p>
      ) : null}
      <ReasonDialog
        open={confirm}
        title="Cancelar renovación en Flow"
        description="Se solicitará la cancelación al final del período pagado y se verificará la respuesta de Flow. No se devolverán pagos ni se eliminará su historial."
        onCancel={() => setConfirm(false)}
        onConfirm={(reason) => {
          setConfirm(false);
          void action.run(async () => {
            const r = await fetch(`/api/portal/admin/quotes/${quoteId}/subscription`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ clientId, reason }),
            });
            const data = await r.json();
            if (!r.ok) throw Error(data.error);
            return data as Control;
          });
        }}
      />
    </section>
  );
}
