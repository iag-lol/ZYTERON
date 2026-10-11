"use client";

import { AlertTriangle } from "lucide-react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminProtectedError({ error, reset }: Props) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-center text-xl font-bold text-slate-900">
          No se pudo cargar esta sección
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Ocurrió un error en la carga de datos del panel administrativo. Puedes
          reintentar ahora.
        </p>
        {error?.message ? (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Detalle: {error.message}
          </p>
        ) : null}
        <div className="mt-6 flex items-center justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
