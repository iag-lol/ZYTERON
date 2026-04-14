"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NuevaVenta() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [alert, setAlert] = useState<string | null>(null);
  const [form, setForm] = useState({ clientId: "", total: "" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setAlert(null);
      const res = await fetch("/admin/ventas/nueva/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: form.clientId, total: Number(form.total) || 0 }),
      });
      if (res.ok) {
        router.push("/admin/ventas");
      } else {
        const data = await res.json().catch(() => ({}));
        setAlert(data?.error || "No se pudo registrar");
      }
    });
  };

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ventas</p>
        <h1 className="text-2xl font-semibold text-slate-900">Registrar venta</h1>
        <p className="text-sm text-slate-600">Guarda el total vendido y el cliente asociado.</p>
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
              <Input value={form.clientId} onChange={(e) => set("clientId", e.target.value)} placeholder="ID de cliente" />
            </div>
            <div className="space-y-2">
              <Label>Total (CLP)</Label>
              <Input type="number" min={0} required value={form.total} onChange={(e) => set("total", e.target.value)} placeholder="1000000" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={pending} className="gap-2">
                {pending ? "Guardando..." : "Guardar venta"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
