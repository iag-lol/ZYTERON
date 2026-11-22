"use client";
import { useState } from "react";
import { CalendarClock, Mail, Phone, Plus, Pencil } from "lucide-react";
import { useAccess } from "../access-context";
import { Drawer, Feedback, Field, Loading, useAction, useLoad } from "../finance/fx-ui";
import {
  workApi,
  stageLabels,
  reviewLabels,
  type WorkDetail,
  type WorkRecord,
  type WorkEvent,
} from "@control/lib/sales-workspace-api";
import { todayInChile, formatTime } from "@control/lib/date-time";
import { day, moment } from "@control/lib/finance-format";
export function SalesRecordDetail({
  recordId,
  admin,
  onClose,
  onChanged,
  onEdit,
  onQuote,
  onReview,
  onEventReview,
  onNewOpportunity,
}: {
  recordId: string;
  admin: boolean;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (r: WorkRecord) => void;
  onQuote: (r: WorkRecord) => void;
  onReview: (r: WorkRecord) => void;
  onEventReview: (e: WorkEvent) => void;
  onNewOpportunity: (r: WorkRecord) => void;
}) {
  const { role } = useAccess(),
    load = useLoad(() => workApi.get<WorkDetail>(role, `/records/${recordId}`), [role, recordId]);
  const action = useAction(async () => {
      await load.reload();
      onChanged();
    }),
    [requestId, setRequestId] = useState(() => crypto.randomUUID()),
    [body, setBody] = useState(""),
    [kind, setKind] = useState("CALL"),
    [stage, setStage] = useState(""),
    [next, setNext] = useState<string | null>(null);
  const r = load.data?.record;
  const save = async () => {
    if (!r) return;
    const result = await action.run(
      () =>
        workApi.post(role, `/records/${r.id}/events`, {
          requestId,
          kind,
          body,
          stage: stage || r.stage,
          next_action_at:
            next === null ? r.next_action_at : next ? new Date(next).toISOString() : null,
        }),
      "Gestión registrada y visible para administración.",
    );
    if (result) {
      setRequestId(crypto.randomUUID());
      setBody("");
      setNext(null);
    }
  };
  return (
    <Drawer
      open
      title={r?.company_name ?? "Detalle de cliente"}
      subtitle={r ? `${r.contact_name} · ${stageLabels[r.stage]}` : "Cargando la ficha comercial"}
      onClose={onClose}
      wide
      className="sw-drawer"
    >
      {load.error ? (
        <Feedback error={load.error} />
      ) : !r ? (
        <Loading text="Cargando la ficha del cliente…" />
      ) : (
        <>
          <div className="sw-detail-head">
            <span className={`sw-status ${r.review_status.toLowerCase()}`}>
              {reviewLabels[r.review_status]}
            </span>
            <span className="sw-chip">
              {r.client_id ? "Cliente incorporado" : "Contacto comercial"}
            </span>
            <div className="sw-inline-actions">
              {!admin && !["COMPLETED", "LOST"].includes(r.stage) ? (
                <button className="fx-btn ghost" onClick={() => onEdit(r)}>
                  <Pencil size={14} />
                  Editar datos
                </button>
              ) : null}
              {!admin &&
              r.review_status !== "REJECTED" &&
              !["COMPLETED", "LOST"].includes(r.stage) ? (
                <button className="fx-btn primary" onClick={() => onQuote(r)}>
                  <Plus size={14} />
                  Preparar propuesta
                </button>
              ) : null}
              {!admin && r.stage === "COMPLETED" && r.client_id ? (
                <button className="fx-btn primary" onClick={() => onNewOpportunity(r)}>
                  Nueva oportunidad con este cliente
                </button>
              ) : null}
              {admin && r.review_status === "PENDING" ? (
                <button className="fx-btn primary" onClick={() => onReview(r)}>
                  Revisar alta
                </button>
              ) : null}
            </div>
          </div>
          {r.review_note ? (
            <div className="sw-note">
              <b>Revisión de administración</b>
              <p>{r.review_note}</p>
            </div>
          ) : null}
          <div className="sw-detail-grid">
            <section className="sw-panel">
              <h3>Necesidad y conversación</h3>
              <p className="sw-preserve">{r.interest}</p>
              {r.notes ? <p className="sw-preserve sw-muted">{r.notes}</p> : null}
              <div className="sw-contact-links">
                {r.email ? (
                  <a href={`mailto:${r.email}`}>
                    <Mail size={15} />
                    {r.email}
                  </a>
                ) : null}
                {r.phone ? (
                  <a href={`tel:${r.phone}`}>
                    <Phone size={15} />
                    {r.phone}
                  </a>
                ) : null}
              </div>
            </section>
            <section className="sw-panel">
              <h3>Datos del cliente</h3>
              <dl className="sw-data">
                <div>
                  <dt>RUT</dt>
                  <dd>{r.rut || "Por completar"}</dd>
                </div>
                <div>
                  <dt>Giro</dt>
                  <dd>{r.business_activity || "Por completar"}</dd>
                </div>
                <div>
                  <dt>Dirección</dt>
                  <dd>
                    {[r.address, r.commune, r.city].filter(Boolean).join(", ") || "Por completar"}
                  </dd>
                </div>
                <div>
                  <dt>Registro</dt>
                  <dd>{day(r.created_at)}</dd>
                </div>
              </dl>
              <p className="sw-next">
                <CalendarClock size={16} />
                {r.next_action_at
                  ? `Próximo contacto: ${moment(r.next_action_at)}`
                  : "Sin próximo contacto programado"}
              </p>
            </section>
          </div>
          {!admin && r.stage !== "COMPLETED" ? (
            <section className="sw-panel">
              <h3>Registrar avance</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
              >
                <div className="sw-form-grid three">
                  <Field label="Medio de contacto">
                    <select value={kind} onChange={(e) => setKind(e.target.value)}>
                      <option value="CALL">Llamada</option>
                      <option value="EMAIL">Correo</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="MEETING">Reunión</option>
                      <option value="NOTE">Nota</option>
                    </select>
                  </Field>
                  <Field label="Etapa después de esta gestión">
                    <select value={stage || r.stage} onChange={(e) => setStage(e.target.value)}>
                      {Object.entries(stageLabels)
                        .filter(([key]) => key !== "COMPLETED")
                        .map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Próximo contacto">
                    <input
                      type="datetime-local"
                      value={
                        next ??
                        (r.next_action_at
                          ? `${todayInChile(new Date(r.next_action_at))}T${formatTime(r.next_action_at)}`
                          : "")
                      }
                      onChange={(e) => setNext(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="¿Qué ocurrió y qué acordaron?">
                  <textarea
                    required
                    maxLength={4000}
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Respuesta del cliente, interés, objeciones y siguiente paso."
                  />
                </Field>
                <p className="sw-help">
                  Una aceptación informada queda pendiente de validación de administración. La venta
                  y la comisión requieren un pago confirmado.
                </p>
                <Feedback error={action.error} notice={action.notice} />
                <button
                  type="submit"
                  className="fx-btn primary"
                  disabled={action.busy || !body.trim()}
                >
                  {action.busy ? "Guardando…" : "Registrar avance"}
                </button>
              </form>
            </section>
          ) : null}
          <section className="sw-panel">
            <h3>Historial y revisión</h3>
            {load.data?.events.length ? (
              <ol className="sw-timeline">
                {load.data.events.map((e) => (
                  <li key={e.id}>
                    <span className="sw-timeline-dot" />
                    <div>
                      <header>
                        <b>
                          {e.kind === "CONTACT_CREATED"
                            ? "Contacto registrado"
                            : e.stage
                              ? stageLabels[e.stage]
                              : "Gestión comercial"}
                        </b>
                        <time>{moment(e.created_at)}</time>
                      </header>
                      <p className="sw-preserve">{e.body}</p>
                      <small>{reviewLabels[e.review_status]}</small>
                      {e.review_note ? <p className="sw-review-comment">{e.review_note}</p> : null}
                      {e.next_action_at ? (
                        <small>Próximo contacto: {moment(e.next_action_at)}</small>
                      ) : null}
                      {admin && e.review_status === "PENDING" ? (
                        <button className="fx-btn small ghost" onClick={() => onEventReview(e)}>
                          Revisar registro
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="sw-muted">Aún no hay gestiones registradas.</p>
            )}
          </section>
        </>
      )}
    </Drawer>
  );
}
