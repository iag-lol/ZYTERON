"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, FileText, Mail, Phone, Trash2, UserRoundCheck } from "lucide-react";

type Props = {
  leadId: string;
  email?: string | null;
  phone?: string | null;
};

type ActionResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  redirectTo?: string;
};

const baseButtonClass =
  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors";

export function ContactLeadActions({ leadId, email, phone }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function runAction(path: string, fallbackMessage: string) {
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(path, { method: "POST" });
        const data = (await response.json().catch(() => null)) as ActionResult | null;

        if (!response.ok || !data?.ok) {
          setMessage(data?.error || fallbackMessage);
          return;
        }

        if (data.redirectTo) {
          router.push(data.redirectTo);
          return;
        }

        setMessage(data?.message || "Acción ejecutada correctamente.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : fallbackMessage);
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {phone ? (
          <a
            href={`tel:${phone}`}
            className={`${baseButtonClass} border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50`}
          >
            <Phone className="h-3.5 w-3.5" />
            Llamar
          </a>
        ) : null}

        {email ? (
          <a
            href={`mailto:${email}`}
            className={`${baseButtonClass} border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}
          >
            <Mail className="h-3.5 w-3.5" />
            Escribir
          </a>
        ) : null}

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            runAction(`/admin/contactos/${leadId}/convertir-cliente`, "No se pudo convertir en cliente.")
          }
          className={`${baseButtonClass} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60`}
        >
          <UserRoundCheck className="h-3.5 w-3.5" />
          Convertir en cliente
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            runAction(`/admin/contactos/${leadId}/generar-proyecto`, "No se pudo generar el borrador de proyecto.")
          }
          className={`${baseButtonClass} border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-60`}
        >
          <BriefcaseBusiness className="h-3.5 w-3.5" />
          Generar proyecto
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            runAction(`/admin/contactos/${leadId}/generar-cotizacion`, "No se pudo generar el borrador de cotización.")
          }
          className={`${baseButtonClass} border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60`}
        >
          <FileText className="h-3.5 w-3.5" />
          Generar cotización
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!window.confirm("¿Eliminar este contacto de forma permanente?")) return;
            setMessage("");
            startTransition(async () => {
              try {
                const res = await fetch(`/admin/contactos/${leadId}/eliminar`, { method: "POST" });
                const data = (await res.json().catch(() => null)) as ActionResult | null;
                if (!res.ok || !data?.ok) {
                  setMessage(data?.error || "No se pudo eliminar el contacto.");
                  return;
                }
                router.refresh();
              } catch {
                setMessage("No se pudo eliminar el contacto.");
              }
            });
          }}
          className={`${baseButtonClass} border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </button>
      </div>

      {message ? (
        <p className={`text-[11px] ${message.toLowerCase().includes("no se pudo") ? "text-rose-600" : "text-emerald-700"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
