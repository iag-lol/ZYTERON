"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useTransition } from "react";

export default function NuevaCotizacion() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [alert, setAlert] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    total: "",
    status: "PENDING",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setAlert(null);
      const res = await fetch("/admin/cotizaciones/nueva/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, total: Number(form.total) || 0 }),
      });
      if (res.ok) {
        router.push("/admin/cotizaciones");
      } else {
        const data = await res.json().catch(() => ({}));
        setAlert(data?.error || "No se pudo crear la cotización");
      }
    });
  };

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cotizaciones</p>
        <h1 className="text-2xl font-semibold text-slate-900">Nueva cotización</h1>
        <p className="text-sm text-slate-600">Registra datos del cliente y el monto propuesto.</p>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">Datos</CardTitle>
        </CardHeader>
        <CardContent>
          {alert && <p className="mb-3 text-sm text-red-600">{alert}</p>}
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Cliente" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="cliente@correo.cl" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+56 9 ..." />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Razón social" />
            </div>
            <div className="space-y-2">
              <Label>Monto total (CLP)</Label>
              <Input type="number" min={0} required value={form.total} onChange={(e) => set("total", e.target.value)} placeholder="500000" />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pendiente</SelectItem>
                  <SelectItem value="SENT">Enviada</SelectItem>
                  <SelectItem value="WON">Ganada</SelectItem>
                  <SelectItem value="LOST">Perdida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Detalle / Necesidad</Label>
              <Textarea rows={4} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Requerimientos, alcance, notas" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={pending} className="gap-2">
                {pending ? "Guardando..." : "Guardar cotización"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
