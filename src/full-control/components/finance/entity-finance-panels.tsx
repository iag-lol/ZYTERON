"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { commercialApi } from "@control/lib/commercial-api";
import type { SalesQuote } from "@zyteron/contracts";
import type { QuoteBilling } from "@/lib/full-control/quote-register";
import { QuotePaymentPanel } from "./quote-payments";
import { WebsiteQuoteBillingButton } from "@control/components/commercial/quote-billing";
import { QuoteEditor } from "@control/components/commercial/quote-editor";
import {
  ClientFinancePanel as PortalFinancePanel,
  type SerializableClientFinanceSummary,
} from "@/components/admin/client-finance-panel";
import { InvoiceDetail, PaymentDetail, RecordPayment } from "./views-revenue";
import Link from "@control/components/routed-link";
import type { ClientFinanceSummary, ProjectFinanceSummary } from "@zyteron/contracts";
import { ArrowUpRight, Landmark } from "lucide-react";
import { useAccess } from "@control/components/access-context";
import { financeApi } from "@control/lib/finance-api";
import { canFinance, day, label, moment, money } from "@control/lib/finance-format";
import {
  Amount,
  Drawer,
  Empty,
  Feedback,
  LoadError,
  Loading,
  Pill,
  ReasonDialog,
  Register,
  Section,
  Stamp,
  useAction,
  useLoad,
  useQueryParams,
} from "./fx-ui";

type ClientQuote = SalesQuote & {
  billing?: QuoteBilling;
  archivedAt?: string | null;
  archivePending?: boolean;
};
type PortalFinance = { userId: string | null; summary: SerializableClientFinanceSummary | null };

/** La ficha consulta los cobros del portal y el libro Finance sin copiar registros entre ambos. */
export function ClientFinancePanel({ clientId }: { clientId: string }) {
  const { role } = useAccess();
  const allowed = canFinance(role, "invoice.view"),
    canManage = canFinance(role, "quote_payment.manage");
  const [section, setSection] = useState("quotes"),
    [quoteId, setQuoteId] = useState<string | null>(null),
    [editing, setEditing] = useState<string | null>(null);
  const [record, setRecord] = useState(false),
    [payment, setPayment] = useState<string | null>(null),
    [invoice, setInvoice] = useState<string | null>(null),
    [archive, setArchive] = useState<ClientQuote | null>(null),
    [showArchived, setShowArchived] = useState(false);
  const summary = useLoad(
    () =>
      allowed
        ? financeApi.get<ClientFinanceSummary>(role, `/clients/${clientId}/summary`)
        : Promise.resolve(null),
    [role, clientId, allowed],
  );
  const quotes = useLoad(
    () =>
      allowed
        ? (commercialApi.allQuotes(
            role,
            `&clientId=${encodeURIComponent(clientId)}&includeArchived=true`,
          ) as Promise<ClientQuote[]>)
        : Promise.resolve([]),
    [role, clientId, allowed],
  );
  const portal = useLoad(async () => {
    if (!allowed) return null;
    const r = await fetch(`/api/portal/admin/clients/${clientId}/finance`, { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    return d as PortalFinance;
  }, [clientId, allowed]);
  const refresh = async () => {
    await Promise.all([summary.reload(), quotes.reload(), portal.reload()]);
  };
  const action = useAction(refresh);
  const hadPendingArchive = useRef(false);
  useEffect(() => {
    const pending = quotes.data?.some((q) => q.archivePending);
    if (!pending) {
      if (hadPendingArchive.current)
        action.setNotice("Eliminación completada. Historial conservado.");
      hadPendingArchive.current = false;
      return;
    }
    hadPendingArchive.current = true;
    const timer = setInterval(() => void quotes.reload(), 8000);
    return () => clearInterval(timer);
  }, [quotes.data, quotes.reload]);
  useQueryParams((p) => {
    if (p.get("recordPayment") === "1") setSection("payments");
  });
  if (!allowed) return <Empty title="Sin acceso a la información financiera del cliente" />;
  const d = summary.data,
    account = portal.data;
  const visible = (quotes.data ?? []).filter((q) => showArchived || !q.archivedAt);
  const openQuote = quotes.data?.find((q) => q.id === quoteId);
  const canRecord = canFinance(role, "payment.record");
  return (
    <div className="fx-entity fx-client-finance">
      <header>
        <span className="fx-seal small">
          <Landmark size={15} />
        </span>
        <div>
          <small>FINANZAS DEL CLIENTE</small>
          <h2>Cotizaciones, cobros y pagos</h2>
        </div>
        <button className="fx-btn ghost" disabled={action.busy} onClick={() => void refresh()}>
          Actualizar
        </button>
        {canRecord ? (
          <button
            className="fx-btn primary"
            onClick={() => {
              setSection("payments");
              if (!account?.userId) setRecord(true);
            }}
          >
            Registrar pago recibido
          </button>
        ) : null}
      </header>
      <Feedback error={action.error} notice={action.notice} />
      <nav className="fx-client-tabs" aria-label="Información financiera">
        {[
          ["quotes", "Cotizaciones y mensualidades"],
          ["payments", "Pagos y cuentas por cobrar"],
          ["invoices", "Documentos de Finanzas"],
        ].map(([key, title]) => (
          <button
            key={key}
            className={section === key ? "active" : ""}
            onClick={() => setSection(key)}
          >
            {title}
          </button>
        ))}
      </nav>
      {section === "quotes" ? (
        <Section
          eyebrow="COTIZACIONES ASIGNADAS"
          title={`${visible.length} cotizaciones`}
          description="Gestiona la modalidad, mensualidades, fechas y pagos desde esta ficha."
          actions={
            <label className="fx-check">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Ver eliminadas del listado
            </label>
          }
        >
          {quotes.error ? (
            <LoadError error={quotes.error} retry={() => void quotes.reload()} />
          ) : quotes.loading && !quotes.data ? (
            <Loading />
          ) : (
            <Register
              rows={visible}
              rowKey={(q) => q.id}
              columns={[
                {
                  key: "n",
                  label: "Cotización",
                  render: (q) => (
                    <>
                      <strong>{q.quoteNumber}</strong>
                      <small className="block">
                        {day(q.createdAt)} ·{" "}
                        {q.billing?.frequency === "MONTHLY" ? "Mensual" : "Pago único"}
                        {q.archivedAt
                          ? " · Eliminada del listado"
                          : q.archivePending
                            ? " · Eliminación en proceso (Flow)"
                            : ""}
                      </small>
                    </>
                  ),
                },
                { key: "s", label: "Estado", render: (q) => <Pill value={q.status} /> },
                {
                  key: "t",
                  label: "Importe",
                  align: "right",
                  render: (q) => <Amount value={q.totalAmount} currency={q.currency} />,
                },
                {
                  key: "p",
                  label: "Pagado",
                  align: "right",
                  render: (q) => <Amount value={q.billing?.paid} currency={q.currency} />,
                },
                {
                  key: "b",
                  label: "Saldo registrado",
                  align: "right",
                  render: (q) => <Amount value={q.billing?.balance} currency={q.currency} />,
                },
                {
                  key: "a",
                  label: "Acciones",
                  render: (q) => (
                    <div className="fx-row-actions">
                      {q.archivedAt || q.archivePending ? (
                        <small>
                          {q.archivePending
                            ? "Cancelación de Flow en proceso. Se retirará al confirmarse."
                            : "Historial conservado"}
                        </small>
                      ) : (
                        <>
                          {q.billing &&
                          (q.billing.source === "WEBSITE" ||
                            (q.billing.frequency === "MONTHLY" &&
                              q.billing.basis !== "CALENDAR")) ? (
                            <WebsiteQuoteBillingButton
                              quoteId={q.id}
                              quoteNumber={q.quoteNumber}
                              clientId={q.clientId}
                              currency={q.currency}
                              billing={q.billing}
                              onChanged={refresh}
                            />
                          ) : (
                            <button className="fx-btn small" onClick={() => setQuoteId(q.id)}>
                              Calendario y pagos
                            </button>
                          )}
                          {canManage ? (
                            <>
                              <button
                                className="fx-btn small ghost"
                                onClick={() => setEditing(q.id)}
                              >
                                Modificar cotización
                              </button>
                              {["SENT", "NEGOTIATING"].includes(q.status) ? (
                                <button
                                  className="fx-btn small"
                                  disabled={action.busy}
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `¿Registrar la aceptación comercial de ${q.quoteNumber}? Luego podrás activar su calendario.`,
                                      )
                                    )
                                      void action.run(
                                        () =>
                                          commercialApi.quoteAction(role, q.id, "accept", {}, true),
                                        "Aceptación registrada. Ya puedes configurar el calendario.",
                                      );
                                  }}
                                >
                                  Registrar aceptación
                                </button>
                              ) : null}
                              <button
                                className="fx-btn small ghost danger"
                                disabled={action.busy}
                                onClick={() => setArchive(q)}
                              >
                                Eliminar
                              </button>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  ),
                },
              ]}
              empty="No hay cotizaciones asignadas a este cliente"
            />
          )}
        </Section>
      ) : null}
      {section === "payments" ? (
        <div className="fx-stack">
          {portal.error ? (
            <LoadError error={portal.error} retry={() => void portal.reload()} />
          ) : portal.loading && !account ? (
            <Loading />
          ) : account?.userId && account.summary ? (
            <PortalFinancePanel
              key={`${clientId}:${account.summary.totals.receivedAmount}:${account.summary.payments.length}`}
              clientId={account.userId}
              businessClientId={clientId}
              initialSummary={account.summary}
              onChanged={refresh}
            />
          ) : (
            <Empty
              title="Sin cuentas por cobrar en el portal"
              text="Los pagos del libro Finance se muestran a continuación."
            />
          )}
          <Section
            eyebrow="LIBRO FINANCE"
            title="Pagos registrados"
            description="Los registros del portal y los del libro conservan sus identificadores de origen."
            actions={
              canRecord ? (
                <button className="fx-btn" onClick={() => setRecord(true)}>
                  Registrar en Finance
                </button>
              ) : null
            }
          >
            {summary.error ? (
              <LoadError error={summary.error} retry={() => void summary.reload()} />
            ) : !d ? (
              <Loading />
            ) : (
              <Register
                rows={d.payments}
                rowKey={(p) => p.id}
                onRow={(p) => setPayment(p.id)}
                columns={[
                  { key: "r", label: "Pago", render: (p) => p.paymentReference },
                  { key: "d", label: "Recibido", render: (p) => moment(p.receivedAt) },
                  {
                    key: "m",
                    label: "Monto",
                    align: "right",
                    render: (p) => <Amount value={p.grossAmount} currency={p.currency} />,
                  },
                  { key: "s", label: "Estado", render: (p) => <Pill value={p.status} /> },
                  {
                    key: "a",
                    label: "",
                    render: (p) => (
                      <button className="fx-btn small" onClick={() => setPayment(p.id)}>
                        Ver pago y aplicaciones
                      </button>
                    ),
                  },
                ]}
                empty="Sin pagos en el libro Finance"
              />
            )}
          </Section>
        </div>
      ) : null}
      {section === "invoices" ? (
        <div className="fx-stack">
          {summary.error ? (
            <LoadError error={summary.error} retry={() => void summary.reload()} />
          ) : !d ? (
            <Loading />
          ) : (
            <>
              <section className="fx-ticker small">
                <div>
                  <small>Facturado</small>
                  <strong>{money(d.invoiced, d.currency)}</strong>
                </div>
                <div>
                  <small>Aplicado a documentos</small>
                  <strong>{money(d.paid, d.currency)}</strong>
                </div>
                <div>
                  <small>Saldo</small>
                  <strong>{money(d.balance, d.currency)}</strong>
                </div>
                <div>
                  <small>Vencido</small>
                  <strong>{money(d.overdue, d.currency)}</strong>
                </div>
              </section>
              <Register
                rows={d.invoices}
                rowKey={(i) => i.id}
                onRow={(i) => setInvoice(i.id)}
                columns={[
                  {
                    key: "n",
                    label: "Documento",
                    render: (i) => (
                      <button className="fx-link" onClick={() => setInvoice(i.id)}>
                        {i.invoiceNumber}
                      </button>
                    ),
                  },
                  { key: "e", label: "Emisión", render: (i) => day(i.issueDate) },
                  { key: "v", label: "Vence", render: (i) => day(i.dueDate) },
                  {
                    key: "t",
                    label: "Total",
                    align: "right",
                    render: (i) => <Amount value={i.totalAmount} currency={i.currency} />,
                  },
                  {
                    key: "b",
                    label: "Saldo",
                    align: "right",
                    render: (i) => <Amount value={i.balanceDue} currency={i.currency} />,
                  },
                  { key: "s", label: "Estado", render: (i) => <Pill value={i.effectiveStatus} /> },
                ]}
                empty="El cliente no tiene documentos en Finance"
              />
              {d.promises.length ? (
                <ul className="fx-queue">
                  {d.promises.map((p) => (
                    <li key={p.id}>
                      <div>
                        <strong>Promesa de pago</strong>
                        <small>{day(p.promisedDate)}</small>
                      </div>
                      <Amount value={p.amount} />
                      <Pill value={p.status} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      {typeof document !== "undefined"
        ? createPortal(
            <div className="zy-full-control">
              <Drawer
                open={Boolean(quoteId)}
                wide
                title={`Calendario y pagos · ${openQuote?.quoteNumber ?? ""}`}
                onClose={() => setQuoteId(null)}
              >
                {quoteId ? (
                  <QuotePaymentPanel
                    key={quoteId}
                    quoteId={quoteId}
                    onChanged={() => void refresh()}
                  />
                ) : null}
              </Drawer>
              {editing ? (
                <QuoteEditor
                  id={editing}
                  role={role}
                  onClose={() => setEditing(null)}
                  onSelect={setEditing}
                  onChanged={refresh}
                />
              ) : null}
              {record && canRecord ? (
                <RecordPayment
                  key={`${clientId}:record`}
                  open
                  initialClientId={clientId}
                  onClose={() => setRecord(false)}
                  onDone={(id) => {
                    setRecord(false);
                    setPayment(id);
                    void refresh();
                  }}
                />
              ) : null}
              {payment ? (
                <PaymentDetail
                  id={payment}
                  onClose={() => setPayment(null)}
                  onChanged={() => void refresh()}
                />
              ) : null}
              {invoice ? (
                <InvoiceDetail
                  id={invoice}
                  onClose={() => setInvoice(null)}
                  onChanged={() => void refresh()}
                />
              ) : null}
              <ReasonDialog
                open={Boolean(archive)}
                title={`Eliminar ${archive?.quoteNumber ?? "cotización"} del listado`}
                description="Esta acción detiene la renovación. Si usa Flow, solicita su cancelación al final del período pagado desde aquí y retira el registro al confirmarse. Las cuotas pendientes de Finance se anulan; los pagos y saldos ya emitidos se conservan."
                confirm="Eliminar y detener renovación"
                onCancel={() => setArchive(null)}
                onConfirm={(reason) => {
                  const q = archive;
                  setArchive(null);
                  if (q)
                    void action
                      .run(async () => {
                        const r = await fetch(`/api/portal/admin/quotes/${q.id}/archive`, {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ clientId, reason }),
                        });
                        const data = await r.json();
                        if (!r.ok) throw Error(data.error);
                        return data;
                      })
                      .then((result) => {
                        if (result)
                          action.setNotice(
                            result.pending
                              ? "Eliminación solicitada. Flow está confirmando la cancelación; el registro se retirará automáticamente al confirmarse."
                              : "Cotización eliminada del listado. Historial conservado.",
                          );
                      });
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

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
