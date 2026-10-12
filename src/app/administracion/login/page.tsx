"use client";

import { ExperienceBrand } from "@/components/client-experience/brand";
import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, IdCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";

function AdminLoginInner() {
  const searchParams = useSearchParams();
  return <AdminLoginForm queryHasError={Boolean(searchParams.get("error"))} />;
}

function AdminLoginForm({ queryHasError }: { queryHasError: boolean }) {
  const [rut, setRut] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
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
          const data = (await res.json().catch(() => null)) as {
            redirect?: string;
            error?: string;
          } | null;
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

      try {
        const res = await fetch("/administracion/login/submit", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pwd }),
        });
        if (res.ok) {
          window.location.assign("/administracion");
        } else {
          setError(
            res.status === 429
              ? "Espera un minuto antes de volver a intentar."
              : "Contraseña incorrecta",
          );
        }
      } catch {
        setError("No se pudo conectar. Intenta nuevamente.");
      }
    });
  }

  const field =
    "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-[14px] text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-[#537a42] focus:ring-4 focus:ring-[#537a42]/10";

  return (
    <div className="relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#17382c] px-4 py-10 sm:px-6">
      {/* Fondo: resplandores suaves y una rejilla muy tenue */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#c1e986]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-1/4 bottom-0 h-[460px] w-[460px] translate-y-1/3 rounded-full bg-[#d4edb1]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative w-full max-w-[420px]">
        {/* Marca */}
        <div className="flex flex-col items-center text-center">
          <span className="flex items-center justify-center">
            <ExperienceBrand light admin />
          </span>
        </div>

        {/* Tarjeta */}
        <div className="mt-7 rounded-2xl border border-white/10 bg-white p-6 shadow-2xl shadow-slate-950/50 sm:p-8">
          <h1 className="text-[20px] font-extrabold tracking-tight text-slate-900">
            Tu equipo, conectado.
          </h1>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[12.5px] font-bold text-slate-700">RUT</span>
                <span className="text-[11px] text-slate-400">Opcional</span>
              </span>
              <span className="relative block">
                <IdCard className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  id="rut"
                  name="rut"
                  type="text"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder="12.345.678-9"
                  autoComplete="username"
                  className={field}
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-slate-700">
                Contraseña
              </span>
              <span className="relative block">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="pwd"
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`${field} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  {showPwd ? (
                    <EyeOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" />
                  )}
                </button>
              </span>
            </label>

            {visibleError && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-rose-700"
              >
                {visibleError}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#284f3b] py-3.5 text-[14px] font-bold text-white shadow-sm transition-colors hover:bg-[#17382c] focus:ring-4 focus:ring-blue-500/25 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Verificando" : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          {siteConfig.legalName} · Conexión cifrada
        </p>
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
