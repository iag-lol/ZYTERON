"use client";

import Image from "next/image";
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

  const field =
    "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-[14px] text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Panel de marca · en móvil se reduce a una franja superior */}
      <aside className="relative isolate min-w-0 overflow-hidden bg-slate-950 px-5 py-9 sm:px-10 lg:flex lg:flex-col lg:justify-between lg:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-600/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl"
        />

        <div className="relative flex items-center gap-3.5 lg:gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15 backdrop-blur lg:h-14 lg:w-14">
            <Image src="/logo.svg" alt="Zyteron" width={36} height={36} priority unoptimized className="h-8 w-8 lg:h-9 lg:w-9" />
          </span>
          <span className="min-w-0">
            <span className="block text-[19px] font-extrabold tracking-tight text-white lg:text-[22px]">
              {siteConfig.name}
            </span>
            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.22em] text-blue-300/80">
              Acceso privado
            </span>
          </span>
        </div>

        <p className="relative mt-8 hidden text-[11px] text-slate-600 lg:block">
          {siteConfig.legalName} · {siteConfig.address.display}
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex min-w-0 items-center justify-center px-5 py-12 sm:px-10 lg:py-14">
        <div className="mx-auto w-full max-w-[400px] min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 sm:text-[30px]">Iniciar sesión</h1>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[12.5px] font-bold text-slate-700">RUT</span>
                <span className="text-[11px] text-slate-400">Opcional</span>
              </span>
              <span className="relative block">
                <IdCard className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  id="rut"
                  name="rut"
                  type="text"
                  inputMode="text"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder="12.345.678-9"
                  autoComplete="username"
                  className={field}
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-slate-700">Contraseña</span>
              <span className="relative block">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
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
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </span>
            </label>

            {visibleError && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-rose-700">
                {visibleError}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-[14px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Verificando" : "Ingresar"}
            </button>
          </form>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Conexión cifrada
          </p>
        </div>
      </main>
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
