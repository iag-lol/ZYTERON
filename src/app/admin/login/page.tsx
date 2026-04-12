"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch("/admin/login/submit", {
        method: "POST",
        body: JSON.stringify({ pwd }),
      });
      if (res.ok) {
        router.push("/admin");
      } else {
        setError("Contraseña incorrecta");
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-sm font-semibold text-primary">Panel administrativo</p>
          <h1 className="text-2xl font-semibold text-slate-900">Acceso seguro</h1>
          <p className="text-sm text-slate-600">Protegido con contraseña administrada por ambiente.</p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Verificando..." : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
