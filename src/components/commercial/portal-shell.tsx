"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BookOpenCheck,
  Building2,
  CalendarClock,
  Check,
  ChevronLeft,
  CircleUser,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { ROLE_INFO } from "@/config/commercial";
import { initials, relativeTime } from "@/lib/commercial/format";
import { cn } from "@/lib/utils";

/**
 * Marco del portal comercial: navegación lateral, identidad del ejecutivo y
 * centro de notificaciones. Mismo lenguaje visual que el portal de clientes
 * (barra oscura + contenido claro) para que se reconozca como un producto
 * Zyteron.
 */

const NAV = [
  { href: "/portal-comercial", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/portal-comercial/cartera", label: "Mi cartera", icon: Building2 },
  { href: "/portal-comercial/agenda", label: "Agenda y seguimiento", icon: CalendarClock },
  { href: "/portal-comercial/ganancias", label: "Ganancias y liquidaciones", icon: Wallet },
  { href: "/portal-comercial/centro", label: "Centro de conocimiento", icon: BookOpenCheck },
  { href: "/portal-comercial/perfil", label: "Mi perfil", icon: CircleUser },
];

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const KIND_DOT: Record<string, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  payment: "bg-blue-500",
  evaluation: "bg-violet-500",
  info: "bg-slate-400",
};

export function CommercialPortalShell({
  user,
  pendingBadge,
  children,
}: {
  user: { name: string; rut: string; role: string; position: string | null };
  pendingBadge: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/comercial/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { notifications?: Notification[]; unread?: number };
      setNotifications(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // Silencioso: el portal sigue operando sin el centro de avisos.
    }
  }, []);

  useEffect(() => {
    // Diferido para no encadenar renders al montar; luego refresca cada 30 s.
    const first = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const markRead = useCallback(async (id?: string) => {
    await fetch("/api/comercial/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    }).catch(() => {});
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((item) => (!id || item.id === id ? { ...item, read_at: item.read_at ?? now } : item)),
    );
    setUnread((prev) => (id ? Math.max(0, prev - 1) : 0));
  }, []);

  const role = ROLE_INFO[user.role];

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[276px_1fr]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[276px] flex-col border-r border-white/10 bg-slate-950/95 px-4 py-5 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <Link href="/portal-comercial" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-900/40">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[13px] font-extrabold text-white">Portal Comercial</span>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">Zyteron</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 lg:hidden"
              aria-label="Cerrar menú"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <nav className="mt-6 space-y-1">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const badge = item.href === "/portal-comercial/agenda" ? pendingBadge : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all",
                    active
                      ? "bg-blue-500/15 text-blue-100 ring-1 ring-inset ring-blue-400/20"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100",
                  )}
                >
                  <item.icon
                    className={cn("h-4 w-4 shrink-0", active ? "text-blue-300" : "text-slate-500 group-hover:text-slate-200")}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge > 0 && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[12px] font-extrabold text-white">
                {initials(user.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-white">{user.name}</p>
                <p className="truncate text-[10.5px] text-blue-100/70">{user.position || role?.label || user.role}</p>
              </div>
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-blue-100/60">
              <ShieldCheck className="h-3 w-3" /> RUT {user.rut} · sesión cifrada
            </p>
          </div>

          <form action="/api/comercial/logout" method="post" className="mt-4">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[12.5px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </form>

          <p className="mt-auto pt-5 text-[10px] leading-4 text-slate-600">
            Información confidencial de Zyteron SpA. El uso del portal queda registrado en la bitácora
            de auditoría.
          </p>
        </aside>

        <div className="flex min-h-screen flex-col bg-slate-50">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen((value) => !value)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-extrabold text-slate-900">
                    {NAV.find((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)))?.label ??
                      "Portal Comercial"}
                  </p>
                  <p className="hidden text-[11px] text-slate-500 sm:block">
                    {role?.description ?? "Gestión comercial de Zyteron"}
                  </p>
                </div>
              </div>

              <div className="relative" ref={boxRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((value) => !value);
                    if (!notifOpen) void load();
                  }}
                  className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  <Bell className="h-3.5 w-3.5 text-blue-600" />
                  <span className="hidden sm:inline">{unread > 0 ? `${unread} nuevas` : "Sin avisos"}</span>
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[330px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[380px]">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-[13px] font-extrabold text-slate-900">Avisos de Zyteron</p>
                      {unread > 0 && (
                        <button
                          onClick={() => void markRead()}
                          className="text-[11px] font-bold text-blue-700 hover:text-blue-800"
                        >
                          Marcar todo leído
                        </button>
                      )}
                    </div>
                    <div className="max-h-[340px] divide-y divide-slate-100 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-10 text-center text-[12.5px] text-slate-400">
                          Aquí verás evaluaciones, liquidaciones y avisos de administración.
                        </p>
                      ) : (
                        notifications.map((item) => (
                          <div
                            key={item.id}
                            className={cn("flex items-start gap-3 px-4 py-3", !item.read_at && "bg-blue-50/40")}
                          >
                            <span
                              className={cn(
                                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                                item.read_at ? "bg-slate-200" : KIND_DOT[item.kind] ?? "bg-blue-500",
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className={cn("text-[12.5px] text-slate-800", !item.read_at && "font-bold")}>
                                {item.title}
                              </p>
                              {item.body && <p className="mt-0.5 text-[11.5px] leading-5 text-slate-500">{item.body}</p>}
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10.5px] text-slate-400">{relativeTime(item.created_at)}</span>
                                {item.link && (
                                  <Link
                                    href={item.link}
                                    onClick={() => setNotifOpen(false)}
                                    className="text-[10.5px] font-bold text-blue-700 hover:underline"
                                  >
                                    Ver detalle
                                  </Link>
                                )}
                              </div>
                            </div>
                            {!item.read_at && (
                              <button
                                onClick={() => void markRead(item.id)}
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                                title="Marcar como leído"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>

          <footer className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
            <p className="flex items-center justify-center gap-2 text-center text-[10.5px] text-slate-500">
              <ShieldCheck className="h-3 w-3 text-blue-600" />
              Zyteron SpA · Portal comercial privado · Cada acción queda registrada con fecha y responsable
            </p>
          </footer>
        </div>
      </div>

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          aria-label="Cerrar menú"
        />
      )}
    </div>
  );
}
