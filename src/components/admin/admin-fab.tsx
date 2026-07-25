"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Plus, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botón de acción flotante del admin. Un botón principal que, al pincharlo,
 * despliega dos accesos: WhatsApp y Asistente IA. Iconos profesionales.
 */
export function AdminFab() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const actions = [
    {
      href: "/admin/whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      ring: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30",
    },
    {
      href: "/admin/asistente-ia",
      label: "Asistente IA",
      icon: Sparkles,
      ring: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30",
    },
  ];

  return (
    <div ref={ref} className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {/* Acciones desplegadas */}
      <div
        className={cn(
          "flex flex-col items-end gap-3 transition-all duration-200",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            onClick={() => setOpen(false)}
            className="group flex items-center gap-2.5"
          >
            <span className="rounded-lg bg-slate-900/90 px-2.5 py-1 text-[12px] font-semibold text-white shadow-md">
              {a.label}
            </span>
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform group-hover:scale-105",
                a.ring,
              )}
            >
              <a.icon className="h-5 w-5" />
            </span>
          </Link>
        ))}
      </div>

      {/* Botón principal */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar accesos" : "Abrir accesos rápidos"}
        aria-expanded={open}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all duration-200",
          open ? "rotate-45 bg-slate-800 hover:bg-slate-900" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30",
        )}
      >
        {open ? <X className="h-6 w-6 -rotate-45" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
