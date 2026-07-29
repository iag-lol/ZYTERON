"use client";

import { FormEvent, useState } from "react";
import { Banknote, IdCard, KeyRound, Save, ShieldCheck, UserRound } from "lucide-react";
import { ROLE_INFO, formatCLP } from "@/config/commercial";
import { formatDate, formatDay, readJson } from "@/lib/commercial/format";
import {
  DataItem,
  ErrorNote,
  InputField,
  Panel,
  Pill,
  PrimaryButton,
  SelectField,
  Toast,
} from "@/components/commercial/ui";

/**
 * Ficha personal del ejecutivo. Los datos de identidad, rol, comisión y metas
 * los define administración; el ejecutivo mantiene su contacto, su ficha
 * personal y sus datos bancarios de pago.
 */

export type ProfileUser = {
  id: string;
  name: string;
  rut: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  position: string | null;
  contract_type: string | null;
  started_at: string | null;
  birth_date: string | null;
  address: string | null;
  comuna: string | null;
  region: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_name: string | null;
  bank_account_type: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  bank_account_rut: string | null;
  payment_email: string | null;
  commission_pct: number;
  goal_monthly_leads: number;
  goal_monthly_won: number;
  goal_monthly_amount: number;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
};

type AuditEntry = {
  id: string;
  actor_type: string;
  action: string;
  summary: string;
  created_at: string;
};

export function CommercialProfile({ user, audit }: { user: ProfileUser; audit: AuditEntry[] }) {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const role = ROLE_INFO[user.role];

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function patchProfile(
    event: FormEvent<HTMLFormElement>,
    setSaving: (value: boolean) => void,
    message: string,
  ) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await readJson(
        await fetch("/api/comercial/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
        }),
      );
      flash(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPassword(true);
    setError("");
    const form = event.currentTarget;
    try {
      await readJson(
        await fetch("/api/comercial/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
        }),
      );
      form.reset();
      flash("Contraseña actualizada correctamente.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-5">
      {notice && <Toast message={notice} />}

      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Mi perfil</h1>
        <p className="text-[12.5px] text-slate-500">
          Mantén tu ficha y tus datos de pago al día: de ellos depende que tu liquidación mensual se
          pueda emitir y transferir sin demoras.
        </p>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {/* Identidad (solo lectura) */}
      <Panel title="Ficha profesional" description="Definida por administración." icon={<IdCard className="h-4 w-4" />}>
        <div className="flex flex-wrap items-center gap-2">
          <Pill label={role?.label ?? user.role} cls={role?.cls} />
          <Pill
            label={user.status === "active" ? "Cuenta activa" : "Cuenta suspendida"}
            cls={
              user.status === "active"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-rose-50 text-rose-700 ring-rose-200"
            }
          />
          {user.must_change_password && (
            <Pill label="Debes cambiar tu contraseña" cls="bg-amber-50 text-amber-700 ring-amber-200" />
          )}
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DataItem label="Nombre" value={user.name} />
          <DataItem label="RUT" value={user.rut} mono />
          <DataItem label="Cargo" value={user.position} />
          <DataItem label="Tipo de vínculo" value={user.contract_type} />
          <DataItem label="Fecha de inicio" value={user.started_at ? formatDay(user.started_at) : "—"} />
          <DataItem label="Comisión vigente" value={`${user.commission_pct || 0}%`} />
          <DataItem label="Último acceso" value={formatDate(user.last_login_at, true)} />
          <DataItem label="Cuenta creada" value={formatDate(user.created_at)} />
        </dl>
        {(user.goal_monthly_leads > 0 || user.goal_monthly_won > 0 || user.goal_monthly_amount > 0) && (
          <dl className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
            <DataItem label="Meta de registros / mes" value={user.goal_monthly_leads || "—"} />
            <DataItem label="Meta de cierres / mes" value={user.goal_monthly_won || "—"} />
            <DataItem
              label="Meta de venta / mes"
              value={user.goal_monthly_amount ? formatCLP(user.goal_monthly_amount) : "—"}
            />
          </dl>
        )}
        <p className="mt-3 text-[11px] text-slate-400">
          Si algún dato no corresponde, solicita su corrección a administración: estos campos no se editan
          desde el portal.
        </p>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Datos personales */}
        <Panel title="Datos personales y de contacto" description="Cómo te ubicamos." icon={<UserRound className="h-4 w-4" />}>
          <form onSubmit={(event) => patchProfile(event, setSavingPersonal, "Ficha personal actualizada.")}>
            <fieldset disabled={savingPersonal} className="grid gap-3 sm:grid-cols-2">
              <InputField label="Correo" name="email" type="email" defaultValue={user.email ?? ""} />
              <InputField label="Teléfono / WhatsApp" name="phone" defaultValue={user.phone ?? ""} />
              <InputField
                label="Fecha de nacimiento"
                name="birth_date"
                type="date"
                defaultValue={user.birth_date?.slice(0, 10) ?? ""}
              />
              <InputField label="Región" name="region" defaultValue={user.region ?? ""} />
              <InputField label="Comuna" name="comuna" defaultValue={user.comuna ?? ""} />
              <InputField label="Dirección" name="address" defaultValue={user.address ?? ""} />
              <InputField
                label="Contacto de emergencia"
                name="emergency_contact_name"
                defaultValue={user.emergency_contact_name ?? ""}
              />
              <InputField
                label="Teléfono de emergencia"
                name="emergency_contact_phone"
                defaultValue={user.emergency_contact_phone ?? ""}
              />
            </fieldset>
            <PrimaryButton loading={savingPersonal} className="mt-4">
              {!savingPersonal && <Save className="h-4 w-4" />} Guardar ficha personal
            </PrimaryButton>
          </form>
        </Panel>

        {/* Datos bancarios */}
        <Panel
          title="Datos bancarios para liquidaciones"
          description="A esta cuenta se transfiere tu comisión."
          icon={<Banknote className="h-4 w-4" />}
        >
          <form onSubmit={(event) => patchProfile(event, setSavingBank, "Datos de pago actualizados.")}>
            <fieldset disabled={savingBank} className="grid gap-3 sm:grid-cols-2">
              <InputField label="Banco" name="bank_name" defaultValue={user.bank_name ?? ""} />
              <SelectField label="Tipo de cuenta" name="bank_account_type" defaultValue={user.bank_account_type ?? ""}>
                <option value="">Seleccionar…</option>
                <option value="corriente">Cuenta corriente</option>
                <option value="vista">Cuenta vista</option>
                <option value="ahorro">Cuenta de ahorro</option>
                <option value="rut">Cuenta RUT</option>
              </SelectField>
              <InputField
                label="Número de cuenta"
                name="bank_account_number"
                defaultValue={user.bank_account_number ?? ""}
              />
              <InputField
                label="Titular de la cuenta"
                name="bank_account_holder"
                defaultValue={user.bank_account_holder ?? ""}
              />
              <InputField
                label="RUT del titular"
                name="bank_account_rut"
                defaultValue={user.bank_account_rut ?? ""}
                placeholder="12.345.678-9"
              />
              <InputField
                label="Correo para liquidaciones"
                name="payment_email"
                type="email"
                defaultValue={user.payment_email ?? ""}
                hint="Si lo dejas vacío usaremos tu correo de contacto."
              />
            </fieldset>
            <PrimaryButton loading={savingBank} className="mt-4">
              {!savingBank && <Save className="h-4 w-4" />} Guardar datos de pago
            </PrimaryButton>
            <p className="mt-3 text-[11px] leading-5 text-slate-400">
              Zyteron transfiere únicamente a la cuenta registrada aquí. Cualquier cambio queda con fecha
              en la bitácora de auditoría.
            </p>
          </form>
        </Panel>

        {/* Contraseña */}
        <Panel title="Seguridad de la cuenta" description="Tu acceso es personal e intransferible." icon={<KeyRound className="h-4 w-4" />}>
          <form onSubmit={savePassword}>
            <fieldset disabled={savingPassword} className="grid gap-3 sm:grid-cols-3">
              <InputField label="Contraseña actual" name="currentPassword" type="password" required />
              <InputField label="Nueva contraseña" name="newPassword" type="password" minLength={8} required />
              <InputField label="Repetir nueva" name="confirmPassword" type="password" minLength={8} required />
            </fieldset>
            <PrimaryButton loading={savingPassword} className="mt-4 bg-slate-900 hover:bg-slate-800">
              {!savingPassword && <KeyRound className="h-4 w-4" />} Actualizar contraseña
            </PrimaryButton>
            <p className="mt-3 text-[11px] leading-5 text-slate-400">
              Usa al menos 8 caracteres combinando letras y números. No compartas tu clave: todo lo que se
              haga con tu usuario queda registrado a tu nombre.
            </p>
          </form>
        </Panel>

        {/* Trazabilidad */}
        <Panel
          title="Movimientos de mi cuenta"
          description="Registro de cambios y acciones administrativas."
          icon={<ShieldCheck className="h-4 w-4" />}
          padded={false}
        >
          {audit.length === 0 ? (
            <p className="px-5 py-10 text-center text-[12px] text-slate-400">
              Aquí quedará registrado cada cambio de tu ficha, evaluación y liquidación.
            </p>
          ) : (
            <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
              {audit.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Pill
                      label={entry.actor_type === "admin" ? "Administración" : "Tú"}
                      cls={
                        entry.actor_type === "admin"
                          ? "bg-violet-50 text-violet-700 ring-violet-200"
                          : "bg-blue-50 text-blue-700 ring-blue-200"
                      }
                    />
                    <span className="text-[10.5px] text-slate-400">{formatDate(entry.created_at, true)}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-5 text-slate-600">{entry.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
