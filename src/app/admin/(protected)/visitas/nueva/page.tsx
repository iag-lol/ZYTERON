"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NuevaVisita() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [alert, setAlert] = useState<string | null>(null);
  const [form, setForm] = useState({ clientId: "", date: "", notes: "", status: "Programada" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setAlert(null);
      const res = await fetch("/admin/visitas/nueva/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push("/admin/visitas");
      } else {
        const data = await res.json().catch(() => ({}));
        setAlert(data?.error || "No se pudo agendar");
      }
    });
  };

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Visitas</p>
        <h1 className="text-2xl font-semibold text-slate-900">Nueva visita</h1>
        <p className="text-sm text-slate-600">Agenda una visita técnica o comercial.</p>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">Datos</CardTitle>
        </CardHeader>
        <CardContent>
          {alert && <p className="mb-3 text-sm text-red-600">{alert}</p>}
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>ID Cliente (opcional)</Label>
              <Input value={form.clientId} onChange={(e) => set("clientId", e.target.value)} placeholder="ID de cliente o dejar vacío" />
            </div>
            <div className="space-y-2">
              <Label>Fecha y hora</Label>
              <Input type="datetime-local" required value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Programada">Programada</SelectItem>
                  <SelectItem value="Hecha">Hecha</SelectItem>
                  <SelectItem value="Reagendada">Reagendada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Notas</Label>
              <Textarea rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Objetivo, ubicación, equipo asignado" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={pending} className="gap-2">
                {pending ? "Guardando..." : "Guardar visita"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
