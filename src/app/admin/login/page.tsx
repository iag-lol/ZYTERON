"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function AdminLoginInner() {
  const searchParams = useSearchParams();
  return <AdminLoginForm queryHasError={Boolean(searchParams.get("error"))} />;
}

function AdminLoginForm({ queryHasError }: { queryHasError: boolean }) {
  const [rut, setRut] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [hideQueryError, setHideQueryError] = useState(false);
  const [pending, startTransition] = useTransition();
  const queryError = !hideQueryError && queryHasError ? "Credenciales incorrectas" : "";
  const visibleError = error || queryError;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setHideQueryError(true);
    startTransition(async () => {
      // Con RUT → acceso de partner/ejecutivo/gestor. Sin RUT → admin (solo contraseña).
      if (rut.trim()) {
        try {
          const res = await fetch("/api/comercial/login", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rut: rut.trim(), password: pwd }),
          });
          const data = (await res.json().catch(() => null)) as { redirect?: string; error?: string } | null;
          if (res.ok && data?.redirect) {
            window.location.assign(data.redirect);
          } else {
            setError(data?.error || "RUT o contraseña incorrectos");
          }
        } catch {
          setError("No se pudo conectar. Intenta nuevamente.");
        }
        return;
      }

      const res = await fetch("/admin/login/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pwd }),
      });
      if (res.ok) {
        window.location.assign("/admin");
      } else {
        setError("Contraseña incorrecta");
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-sm font-semibold text-primary">Acceso Zyteron</p>
          <h1 className="text-2xl font-semibold text-slate-900">Acceso seguro</h1>
          <p className="text-sm text-slate-600">
            Administración: solo contraseña. Partners y ejecutivos: RUT + contraseña.
          </p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="rut">RUT <span className="font-normal text-slate-400">(solo partners / ejecutivos)</span></Label>
            <Input
              id="rut"
              name="rut"
              type="text"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="12.345.678-9"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="pwd"
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {visibleError && <p className="text-sm text-red-600">{visibleError}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Verificando..." : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginForm queryHasError={false} />}>
      <AdminLoginInner />
    </Suspense>
  );
}
