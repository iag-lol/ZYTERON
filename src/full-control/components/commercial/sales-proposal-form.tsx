"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAccess } from "../access-context";
import { DateInput, Drawer, Feedback, Field, useAction } from "../finance/fx-ui";
import {
  workApi,
  type WorkRecord,
  type PublicPlan,
  type ProposalItem,
  type WorkProposal,
} from "@control/lib/sales-workspace-api";
const money = (v: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);
export function SalesProposalForm({
  records,
  plans,
  record,
  plan,
  initial,
  onClose,
  onSaved,
}: {
  records: WorkRecord[];
  plans: PublicPlan[];
  record?: WorkRecord;
  plan?: PublicPlan;
  initial?: WorkProposal;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { role } = useAccess(),
    action = useAction(),
    [requestId] = useState(() => crypto.randomUUID()),
    [recordId, setRecordId] = useState(record?.id ?? initial?.record_id ?? ""),
    [planId, setPlanId] = useState(plan?.id ?? ""),
    [items, setItems] = useState<ProposalItem[]>(
      initial?.items ??
        (plan
          ? [
              {
                planId: plan.id,
                description: plan.name,
                quantity: 1,
                unitPrice: plan.amount,
                discountPercent: 0,
              },
            ]
          : []),
    ),
    [billingType, setBillingType] = useState(
      initial?.billing_type ?? (plan?.billingType === "SUBSCRIPTION" ? "SUBSCRIPTION" : "ONE_TIME"),
    ),
    [validUntil, setValidUntil] = useState(() =>
      new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    ),
    [paymentTerms, setPaymentTerms] = useState(
      initial?.payment_terms ?? "Pago y condiciones sujetos a validación de administración.",
    ),
    [commercialTerms, setCommercialTerms] = useState(
      initial?.commercial_terms ?? plan?.description ?? "",
    ),
    [notes, setNotes] = useState("");
  const totals = useMemo(() => {
    const net = items.reduce(
      (t, i) => t + Math.round(i.quantity * i.unitPrice * (1 - i.discountPercent / 100)),
      0,
    );
    return { net, iva: Math.round(net * 0.19), total: net + Math.round(net * 0.19) };
  }, [items]);
  const change = (index: number, patch: Partial<ProposalItem>) =>
    setItems(items.map((i, n) => (n === index ? { ...i, ...patch } : i)));
  const add = () => {
    const selected = plans.find((p) => p.id === planId);
    if (selected) {
      if (!items.length)
        setBillingType(selected.billingType === "SUBSCRIPTION" ? "SUBSCRIPTION" : "ONE_TIME");
      setItems([
        ...items,
        {
          planId: selected.id,
          description: selected.name,
          quantity: 1,
          unitPrice: selected.amount,
          discountPercent: 0,
        },
      ]);
      if (!commercialTerms) setCommercialTerms(selected.description);
    }
  };
  const valid = Boolean(
    recordId &&
    items.length &&
    totals.total > 0 &&
    commercialTerms.trim() &&
    paymentTerms.trim() &&
    items.every(
      (i) =>
        i.description.trim() &&
        i.quantity > 0 &&
        i.unitPrice >= 0 &&
        i.discountPercent >= 0 &&
        i.discountPercent <= 100,
    ),
  );
  const save = async () => {
    const saved = await action.run(() =>
      workApi.post(role, `/records/${recordId}/proposals`, {
        requestId,
        items,
        billingType,
        validUntil,
        paymentTerms,
        commercialTerms,
        notes,
      }),
    );
    if (saved) onSaved();
  };
  return (
    <Drawer
      open
      title="Preparar propuesta"
      subtitle="Elige el cliente, arma el alcance y envía a administración para autorización."
      onClose={onClose}
      wide
      className="sw-drawer"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="sw-proposal-layout">
          <div>
            <div className="sw-form-grid">
              <Field label="Cliente o contacto">
                <select required value={recordId} onChange={(e) => setRecordId(e.target.value)}>
                  <option value="">Seleccionar de mi cartera</option>
                  {records
                    .filter(
                      (r) =>
                        r.review_status !== "REJECTED" && !["LOST", "COMPLETED"].includes(r.stage),
                    )
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.company_name} · {r.contact_name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Modalidad">
                <select
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value as "ONE_TIME" | "SUBSCRIPTION")}
                >
                  <option value="ONE_TIME">Pago único</option>
                  <option value="SUBSCRIPTION">Plan mensual</option>
                </select>
              </Field>
            </div>
            <div className="sw-plan-picker">
              <Field label="Agregar un plan o servicio">
                <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                  <option value="">Seleccionar del catálogo</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {money(p.amount)}
                      {p.billingType === "SUBSCRIPTION" ? " / mes" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                className="fx-btn ghost"
                disabled={!planId || items.length >= 30}
                onClick={add}
              >
                <Plus size={16} />
                Agregar
              </button>
            </div>
            <div className="sw-items">
              {items.map((i, index) => (
                <div className="sw-quote-item" key={index}>
                  <div className="sw-item-title">
                    <b>Servicio {index + 1}</b>
                    <button
                      type="button"
                      className="sw-icon-button"
                      aria-label={`Quitar servicio ${index + 1}`}
                      onClick={() => setItems(items.filter((_, n) => n !== index))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <Field label="Servicio y alcance">
                    <input
                      required
                      maxLength={500}
                      value={i.description}
                      onChange={(e) => change(index, { description: e.target.value })}
                    />
                  </Field>
                  <div className="sw-form-grid three">
                    <Field label="Cantidad">
                      <input
                        required
                        type="number"
                        min="0.01"
                        max="10000"
                        step="0.01"
                        value={i.quantity}
                        onChange={(e) => change(index, { quantity: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Precio neto propuesto">
                      <input
                        required
                        type="number"
                        min="0"
                        max="10000000000"
                        step="1"
                        value={i.unitPrice}
                        onChange={(e) => change(index, { unitPrice: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Descuento %">
                      <input
                        required
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={i.discountPercent}
                        onChange={(e) => change(index, { discountPercent: Number(e.target.value) })}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="fx-btn ghost"
              disabled={items.length >= 30}
              onClick={() =>
                setItems([
                  ...items,
                  { description: "", quantity: 1, unitPrice: 0, discountPercent: 0 },
                ])
              }
            >
              <Plus size={15} />
              Solicitar servicio a medida
            </button>
            <Field label="Alcance y condiciones para el cliente">
              <textarea
                required
                maxLength={5000}
                rows={4}
                value={commercialTerms}
                onChange={(e) => setCommercialTerms(e.target.value)}
                placeholder="Qué se incluye, qué queda fuera y qué plazo necesita el cliente."
              />
            </Field>
            <div className="sw-form-grid">
              <Field label="Válida hasta">
                <DateInput required value={validUntil} onChange={setValidUntil} />
              </Field>
              <Field label="Condiciones de pago">
                <textarea
                  required
                  rows={2}
                  maxLength={1500}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Observaciones para revisión">
              <textarea
                rows={2}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
          <aside className="sw-quote-summary">
            <span>PROPUESTA POR AUTORIZAR</span>
            <h3>Resumen</h3>
            <p>{records.find((r) => r.id === recordId)?.company_name ?? "Selecciona un cliente"}</p>
            <dl>
              <div>
                <dt>Neto</dt>
                <dd>{money(totals.net)}</dd>
              </div>
              <div>
                <dt>IVA 19%</dt>
                <dd>{money(totals.iva)}</dd>
              </div>
              <div>
                <dt>Total{billingType === "SUBSCRIPTION" ? " mensual" : ""}</dt>
                <dd>{money(totals.total)}</dd>
              </div>
            </dl>
            <p>
              Administración revisará alcance, precios y condiciones antes de autorizar la
              propuesta.
            </p>
            <small>
              Comisión: 15% de la utilidad validada, una vez confirmado el pago del cliente.
            </small>
          </aside>
        </div>
        <Feedback error={action.error} />
        <div className="sw-form-footer">
          <button className="fx-btn ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="fx-btn primary" type="submit" disabled={action.busy || !valid}>
            {action.busy ? "Enviando…" : "Solicitar autorización"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
