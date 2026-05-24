"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PortalCreateUserForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    phone: "",
    password: "",
    sendVerificationCode: true,
  });

  async function onSubmit() {
    setError("");
    setSuccess("");
    const response = await fetch("/api/portal/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || "No se pudo crear el usuario.");
      return;
    }
    setSuccess("Usuario creado correctamente.");
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      phone: "",
      password: "",
      sendVerificationCode: true,
    });
  }

  return (
    <form
      className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(onSubmit);
      }}
    >
      <div className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Alta controlada</p>
        <h3 className="text-lg font-extrabold text-slate-900">Crear cuenta manual de cliente</h3>
        <p className="text-sm text-slate-500">
          Registra cuentas internas con trazabilidad, contraseña inicial opcional y envío de verificación.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" value={form.firstName} onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" value={form.lastName} onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="company">Empresa</Label>
          <Input id="company" value={form.company} onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña inicial (opcional)</Label>
          <Input id="password" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
        </div>
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={form.sendVerificationCode}
          onChange={(event) => setForm((prev) => ({ ...prev, sendVerificationCode: event.target.checked }))}
        />
        Enviar código de verificación por correo
      </label>
      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      <Button type="submit" className="h-10 w-fit bg-blue-700 px-5 hover:bg-blue-800" disabled={pending}>
        {pending ? "Creando..." : "Crear usuario"}
      </Button>
    </form>
  );
}
