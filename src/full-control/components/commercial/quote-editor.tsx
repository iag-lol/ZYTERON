"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { quoteTotals } from "@/lib/client-experience/quote-totals";
import { commercialApi } from "@control/lib/commercial-api";
import { Plus, Trash2, Save, Link2 } from "lucide-react";
import type { Client, Role } from "@zyteron/contracts";
import { clientsApi } from "@control/lib/clients-api";
import { Drawer, Feedback, Loading, Field, DateInput } from "@control/components/finance/fx-ui";
import {
  commercialTotals,
  quoteEditSchema,
  type QuoteEdit,
} from "@/lib/full-control/quote-edit-model";
type Detail = QuoteEdit & {
  id: string;
  editable: boolean;
  clientId: string | null;
  quoteNumber: string;
  currency: string;
  source: string;
};
async function call(id: string, method = "GET", body?: unknown) {
  const r = await fetch(`/api/portal/admin/quotes/${id}/commercial`, {
    method,
    cache: "no-store",
    ...(body
      ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "No se pudo guardar la cotización.");
  return d;
}
export function QuoteEditor({
  id,
  role,
  onClose,
  onChanged,
  onSelect,
}: {
  id: string;
  onSelect: (id: string) => void;
  role: Role;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [data, setData] = useState<Detail | null>(null),
    [clients, setClients] = useState<Client[]>([]),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    call(id)
      .then((d) => {
        if (active) {
          setData(d);
          setSelected(d.clientId || "");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    clientsApi
      .list(role, new URLSearchParams({ pageSize: "100" }))
      .then((d) => {
        if (active) setClients(d.items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id, role]);
  const patch = (value: Partial<Detail>) => setData((d) => (d ? { ...d, ...value } : d));
  const save = async () => {
    if (!data || busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = quoteEditSchema.parse({
        revision: data.revision,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        companyName: data.companyName,
        validUntil: data.validUntil,
        paymentTerms: data.paymentTerms,
        commercialTerms: data.commercialTerms,
        notes: data.notes,
        taxRate: data.taxRate,
        items: data.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent,
          taxable: i.taxable,
        })),
      });
      await call(id, "PATCH", payload);
      await onChanged();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "ZodError"
          ? e.message
          : "Revisa descripciones, cantidades, montos y correo.",
      );
    } finally {
      setBusy(false);
    }
  };
  const link = async () => {
    if (busy || !selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await call(id, "POST", { clientId: selected });
      setData(await call(id));
      setNotice(
        "Cotización vinculada. Las propuestas enviadas aparecerán en la cuenta del cliente si su portal está habilitado.",
      );
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo vincular.");
    } finally {
      setBusy(false);
    }
  };
  const nativeTotals =
    data?.source === "WEBSITE"
      ? quoteTotals(
          data.items.map((i) => ({
            qty: i.quantity,
            unitPrice: i.unitPrice,
            discountPct: i.discountPercent,
            taxable: i.taxable,
          })),
          data.taxRate > 0,
        )
      : null;
  const total = nativeTotals
    ? { net: nativeTotals.subtotal, tax: nativeTotals.iva, total: nativeTotals.grandTotal }
    : data
      ? commercialTotals(data.items, data.taxRate, data.currency)
      : null;
  const copy = async () => {
    setBusy(true);
    setError("");
    try {
      const result = (await commercialApi.quoteAction(role, id, "duplicate")) as { id: string };
      await onChanged();
      onSelect(result.id);
      setData(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo preparar la copia.");
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    if (!busy) onClose();
  };
  return createPortal(
    <Drawer
      open
      wide
      title={data ? `Cotización · ${data.quoteNumber}` : "Cargando cotización"}
      subtitle="Servicios, importes, condiciones y cuenta del cliente."
      onClose={close}
    >
      <div className="fx-stack quoteEditor">
        <Feedback error={error} notice={notice} />
        {!data && !error ? <Loading /> : null}
        {data ? (
          <>
            <section className="quotePortalLink">
              <h4>Cuenta del cliente</h4>
              <p>
                Selecciona la cuenta que verá la propuesta y sus cobros. El correo debe corresponder
                al cliente.
              </p>
              <select
                aria-label="Cuenta del cliente"
                value={selected}
                disabled={busy || !!data.clientId}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Seleccionar cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.legalName}
                  </option>
                ))}
              </select>
              <button
                className="fx-btn"
                disabled={busy || !selected || !!data.clientId}
                onClick={() => void link()}
              >
                <Link2 size={14} />
                {data.clientId ? "Cuenta vinculada" : "Vincular al portal"}
              </button>
              <small>
                La habilitación y verificación del acceso se administran en la ficha del cliente.
              </small>
            </section>
            {!data.editable ? (
              <p className="fx-hint">
                Esta versión conserva sus documentos y compromisos. Usa Crear revisión editable o
                Duplicar en el listado para cambiar importes.
              </p>
            ) : null}
            {!data.editable ? (
              <button className="fx-btn primary" disabled={busy} onClick={() => void copy()}>
                Crear copia editable
              </button>
            ) : null}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <fieldset disabled={busy || !data.editable}>
                <div className="fx-form-grid">
                  <Field label="Empresa">
                    <input
                      required
                      value={data.companyName}
                      onChange={(e) => patch({ companyName: e.target.value })}
                    />
                  </Field>
                  <Field label="Contacto">
                    <input
                      required
                      value={data.contactName}
                      onChange={(e) => patch({ contactName: e.target.value })}
                    />
                  </Field>
                  <Field label="Correo">
                    <input
                      type="email"
                      value={data.contactEmail}
                      onChange={(e) => patch({ contactEmail: e.target.value })}
                    />
                  </Field>
                  <Field label="Vigencia">
                    <DateInput value={data.validUntil} onChange={(v) => patch({ validUntil: v })} />
                  </Field>
                </div>
                <h4>Servicios e importes · {data.currency}</h4>
                <div className="quoteEditItems">
                  {data.items.map((item, index) => (
                    <section key={index}>
                      <label>
                        Descripción
                        <textarea
                          required
                          value={item.description}
                          onChange={(e) =>
                            patch({
                              items: data.items.map((i, n) =>
                                n === index ? { ...i, description: e.target.value } : i,
                              ),
                            })
                          }
                        />
                      </label>
                      <div className="quoteEditNumbers">
                        {(
                          [
                            ["quantity", "Cantidad", 0.001],
                            ["unitPrice", "Precio unitario", 0],
                            ["discountPercent", "Descuento %", 0],
                          ] as const
                        ).map(([key, label, min]) => (
                          <label key={key}>
                            {label}
                            <input
                              required
                              type="number"
                              min={min}
                              max={key === "discountPercent" ? 100 : undefined}
                              step="any"
                              value={item[key]}
                              onChange={(e) =>
                                patch({
                                  items: data.items.map((i, n) =>
                                    n === index ? { ...i, [key]: Number(e.target.value) } : i,
                                  ),
                                })
                              }
                            />
                          </label>
                        ))}
                        <label>
                          <input
                            type="checkbox"
                            checked={item.taxable}
                            onChange={(e) =>
                              patch({
                                items: data.items.map((i, n) =>
                                  n === index ? { ...i, taxable: e.target.checked } : i,
                                ),
                              })
                            }
                          />{" "}
                          Afecto a IVA
                        </label>
                        <button
                          type="button"
                          aria-label={`Quitar servicio ${index + 1}`}
                          disabled={data.items.length === 1}
                          onClick={() => patch({ items: data.items.filter((_, n) => n !== index) })}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </section>
                  ))}
                </div>
                <button
                  className="fx-btn"
                  type="button"
                  onClick={() =>
                    patch({
                      items: [
                        ...data.items,
                        {
                          description: "",
                          quantity: 1,
                          unitPrice: 0,
                          discountPercent: 0,
                          taxable: true,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={14} />
                  Agregar servicio
                </button>
                <Field label="Impuestos">
                  <select
                    value={data.taxRate}
                    onChange={(e) => patch({ taxRate: Number(e.target.value) as 0 | 19 })}
                  >
                    <option value={19}>IVA 19%</option>
                    <option value={0}>Sin IVA</option>
                  </select>
                </Field>
                <div className="quoteEditTotal">
                  Neto {new Intl.NumberFormat("es-CL").format(total?.net || 0)} · IVA{" "}
                  {new Intl.NumberFormat("es-CL").format(total?.tax || 0)}
                  <strong>
                    Total{" "}
                    {new Intl.NumberFormat("es-CL", {
                      style: "currency",
                      currency: data.currency === "UF" ? "CLF" : data.currency,
                      maximumFractionDigits: data.currency === "CLP" ? 0 : 2,
                    }).format(total?.total || 0)}
                  </strong>
                </div>
                <Field label="Condiciones de pago">
                  <textarea
                    value={data.paymentTerms}
                    onChange={(e) => patch({ paymentTerms: e.target.value })}
                  />
                </Field>
                <Field label="Condiciones comerciales">
                  <textarea
                    rows={4}
                    value={data.commercialTerms}
                    onChange={(e) => patch({ commercialTerms: e.target.value })}
                  />
                </Field>
                <Field label="Observaciones de la propuesta">
                  <textarea value={data.notes} onChange={(e) => patch({ notes: e.target.value })} />
                </Field>
                {data.editable ? (
                  <button className="fx-btn primary" type="submit">
                    <Save size={15} />
                    {busy ? "Guardando…" : "Guardar borrador"}
                  </button>
                ) : null}
              </fieldset>
            </form>
          </>
        ) : null}
      </div>
    </Drawer>,
    document.body,
  );
}
