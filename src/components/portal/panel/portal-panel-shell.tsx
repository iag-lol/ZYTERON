"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  CircleUser,
  FileDigit,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageCircle,
  Shield,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";

const navItems = [
  { href: "/portal-clientes/panel", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/portal-clientes/panel/perfil", label: "Mi perfil", icon: CircleUser },
  { href: "/portal-clientes/panel/cotizaciones", label: "Cotizaciones", icon: FileDigit },
  { href: "/portal-clientes/panel/proyectos", label: "Proyectos", icon: BriefcaseBusiness },
  { href: "/portal-clientes/panel/documentos", label: "Documentos", icon: FolderOpen },
  { href: "/portal-clientes/panel/compras-boletas", label: "Compras y boletas", icon: FileText },
  { href: "/portal-clientes/panel/asistencia", label: "Asistencia", icon: LifeBuoy },
  { href: "/portal-clientes/panel/credenciales", label: "Credenciales", icon: ShieldCheck },
  { href: "/portal-clientes/panel/comunicacion", label: "Comunicación", icon: MessageCircle },
  { href: "/portal-clientes/panel/solicitudes", label: "Solicitudes", icon: Ticket },
];

function isActivePath(current: string, href: string, exact?: boolean) {
  return exact ? current === href : current.startsWith(href);
}

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function getNotificationTypeConfig(type: string) {
  switch (type) {
    case "SUCCESS":
      return { color: "border-emerald-200 bg-emerald-50", dot: "bg-emerald-500" };
    case "WARNING":
      return { color: "border-amber-200 bg-amber-50", dot: "bg-amber-500" };
    case "ALERT":
      return { color: "border-rose-200 bg-rose-50", dot: "bg-rose-500" };
    default:
      return { color: "border-blue-200 bg-blue-50", dot: "bg-blue-500" };
  }
}

export function PortalPanelShell({
  children,
  heading,
  subheading,
  userLabel,
  unreadCount: initialUnreadCount,
}: {
  children: React.ReactNode;
  heading: string;
  subheading: string;
  userLabel: string;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const notifRef = useRef<HTMLDivElement>(null);

  // Poll for notifications every 20 seconds
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/portal/notifications");
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch {
      // Silent fail on polling
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAsRead(notifId: string) {
    try {
      await fetch("/api/portal/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notifId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silent fail
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen md:grid-cols-[280px_1fr]">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-[280px] border-r border-white/10 bg-slate-950/95 px-4 py-5 backdrop-blur-xl transition-transform md:sticky md:top-0 md:h-screen md:overflow-y-auto md:translate-x-0 scrollbar-none ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <Link href="/portal-clientes/panel" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-700/30">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-white">Portal Clientes</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Zyteron</p>
              </div>
            </Link>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 md:hidden"
              onClick={() => setOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href, item.exact);
              const isCommunication = item.href.includes("comunicacion");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-500/15 text-blue-100"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${active ? "text-blue-300" : "text-slate-500 group-hover:text-slate-200"}`} />
                  <span className="flex-1">{item.label}</span>
                  {isCommunication && unreadCount > 0 ? (
                    <span className="notification-dot" />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-3.5 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-200">Cuenta activa</p>
            <p className="mt-1 text-sm font-semibold text-white">{userLabel}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-100/70">
              <Shield className="h-3 w-3" />
              Sesión segura · Permisos por rol
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/portal-clientes/login" })}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </aside>

        <div className="flex min-h-screen flex-col bg-slate-50">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
            <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 md:hidden"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div>
                  <h1 className="text-sm font-bold text-slate-900 sm:text-base">{heading}</h1>
                  <p className="hidden text-xs text-slate-500 sm:block">{subheading}</p>
                </div>
              </div>

              {/* Notification Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    if (!notifOpen) fetchNotifications();
                  }}
                  className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Bell className="h-3.5 w-3.5 text-blue-600" />
                  {unreadCount > 0 ? (
                    <>
                      <span>{unreadCount} nuevas</span>
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse-badge">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    </>
                  ) : (
                    <span>Sin alertas</span>
                  )}
                </button>

                {notifOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-notification-enter sm:w-[380px]">
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">Notificaciones</p>
                        {unreadCount > 0 ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {unreadCount} sin leer
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-500">
                          <Bell className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                          Sin notificaciones
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notif) => {
                          const config = getNotificationTypeConfig(notif.type);
                          return (
                            <div
                              key={notif.id}
                              className={`flex items-start gap-3 px-4 py-3 transition ${
                                notif.isRead ? "bg-white" : "bg-blue-50/40"
                              }`}
                            >
                              <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notif.isRead ? "bg-slate-200" : config.dot}`} />
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm ${notif.isRead ? "text-slate-700" : "font-semibold text-slate-900"}`}>
                                  {notif.title}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{notif.body}</p>
                                <p className="mt-1 text-[11px] text-slate-400">{timeAgo(notif.createdAt)}</p>
                              </div>
                              {!notif.isRead ? (
                                <button
                                  type="button"
                                  onClick={() => markAsRead(notif.id)}
                                  className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                                  title="Marcar como leída"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>

          <footer className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <Shield className="h-3 w-3 text-blue-600" />
              Zyteron Portal · Gestión privada y segura · Datos aislados por cuenta
            </div>
          </footer>
        </div>
      </div>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
        />
      ) : null}
    </div>
  );
}
