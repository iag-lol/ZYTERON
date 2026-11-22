"use client";
import { useState } from "react";
import type { WorkRecord, AssignedClient } from "@control/lib/sales-workspace-api";
import { workApi } from "@control/lib/sales-workspace-api";
import { todayInChile, formatTime } from "@control/lib/date-time";
import { useAccess } from "../access-context";
import { DateInput, Drawer, Feedback, Field, useAction } from "../finance/fx-ui";
export function SalesRecordForm({
  initial,
  client,
  onClose,
  onSaved,
}: {
  initial?: WorkRecord;
  client?: AssignedClient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { role } = useAccess(),
    action = useAction(),
    [step, setStep] = useState(1),
    [requestId] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({
    company_name: initial?.company_name ?? client?.legal_name ?? "",
    contact_name: initial?.contact_name ?? client?.contact_name ?? "",
    email: initial?.email ?? client?.general_email ?? "",
    phone: initial?.phone ?? client?.phone ?? "",
    rut: initial?.rut ?? client?.rut ?? "",
    business_activity: initial?.business_activity ?? client?.business_activity ?? "",
    address: initial?.address ?? client?.address ?? "",
    commune: initial?.commune ?? client?.commune ?? "",
    city: initial?.city ?? "",
    website: initial?.website ?? "",
    interest: initial?.interest ?? "",
    notes: initial?.notes ?? "",
    followDate: initial?.next_action_at ? todayInChile(new Date(initial.next_action_at)) : "",
    followTime: initial?.next_action_at ? formatTime(initial.next_action_at) : "10:00",
  });
  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const save = async () => {
    const { followDate, followTime, ...fields } = form;
    const payload = {
      ...fields,
      requestId,
      client_id: client?.id,
      next_action_at: followDate
        ? new Date(`${followDate}T${followTime || "10:00"}`).toISOString()
        : null,
    };
    const saved = await action.run(() =>
      initial
        ? workApi.patch(role, `/records/${initial.id}`, payload)
        : workApi.post(role, "/records", payload),
    );
    if (saved) onSaved();
  };
  return (
    <Drawer
      open
      title={initial ? "Editar contacto y cliente" : "Nuevo contacto o cliente"}
      subtitle="Registra la conversación y la necesidad. Administración revisará el alta."
      onClose={onClose}
      wide
      className="sw-drawer"
    >
      <div className="sw-form-progress">
        <button type="button" className={step === 1 ? "active" : ""} onClick={() => setStep(1)}>
          1 · Contacto y necesidad
        </button>
        <button type="button" className={step === 2 ? "active" : ""} onClick={() => setStep(2)}>
          2 · Datos y seguimiento
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 1) setStep(2);
          else void save();
        }}
      >
        {step === 1 ? (
          <>
            <div className="sw-form-grid">
              <Field label="Empresa o negocio">
                <input
                  required
                  maxLength={180}
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  placeholder="Nombre del negocio"
                />
              </Field>
              <Field label="Persona de contacto">
                <input
                  required
                  maxLength={120}
                  value={form.contact_name}
                  onChange={(e) => set("contact_name", e.target.value)}
                  placeholder="Con quién hablaste"
                />
              </Field>
              <Field label="Correo">
                <input
                  type="email"
                  maxLength={180}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="contacto@empresa.cl"
                />
              </Field>
              <Field label="Teléfono o WhatsApp">
                <input
                  type="tel"
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+56 9 ..."
                />
              </Field>
            </div>
            <Field label="¿Qué necesita y qué interés mostró?">
              <textarea
                required
                rows={4}
                maxLength={1500}
                value={form.interest}
                onChange={(e) => set("interest", e.target.value)}
                placeholder="Qué quiere mejorar, qué respondió y qué puedes proponerle."
              />
            </Field>
            <p className="sw-help">
              Ingresa al menos un medio de contacto. El RUT puede completarse antes de solicitar el
              alta definitiva.
            </p>
          </>
        ) : (
          <>
            <div className="sw-form-grid">
              <Field
                label="RUT de la empresa"
                hint="Obligatorio para que administración apruebe el alta como cliente."
              >
                <input
                  maxLength={20}
                  disabled={Boolean(initial?.client_id || client)}
                  value={form.rut}
                  onChange={(e) => set("rut", e.target.value)}
                  placeholder="12.345.678-5"
                />
              </Field>
              <Field label="Giro">
                <input
                  maxLength={160}
                  value={form.business_activity}
                  onChange={(e) => set("business_activity", e.target.value)}
                />
              </Field>
              <Field label="Dirección">
                <input
                  maxLength={200}
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </Field>
              <Field label="Comuna">
                <input
                  maxLength={80}
                  value={form.commune}
                  onChange={(e) => set("commune", e.target.value)}
                />
              </Field>
              <Field label="Ciudad">
                <input
                  maxLength={80}
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </Field>
              <Field label="Sitio web">
                <input
                  type="url"
                  maxLength={250}
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Próximo contacto">
                <DateInput value={form.followDate} onChange={(v) => set("followDate", v)} />
              </Field>
              <Field label="Hora">
                <input
                  type="time"
                  value={form.followTime}
                  onChange={(e) => set("followTime", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Detalles y acuerdos">
              <textarea
                rows={4}
                maxLength={4000}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Acuerdos, dudas, participantes y siguiente paso."
              />
            </Field>
            <div className="sw-note">
              El registro quedará visible para administración. El alta como cliente y las propuestas
              requieren su validación.
            </div>
          </>
        )}
        <Feedback error={action.error} />
        <div className="sw-form-footer">
          <button
            type="button"
            className="fx-btn ghost"
            onClick={step === 1 ? onClose : () => setStep(1)}
          >
            {step === 1 ? "Cancelar" : "Volver"}
          </button>
          <button
            type="submit"
            className="fx-btn primary"
            disabled={
              action.busy ||
              !form.company_name.trim() ||
              !form.contact_name.trim() ||
              !form.interest.trim() ||
              !(form.email.trim() || form.phone.trim())
            }
          >
            {action.busy
              ? "Guardando…"
              : step === 1
                ? "Continuar"
                : "Guardar y solicitar validación"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
