"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCheck,
  FileText,
  MessageSquare,
  X,
} from "lucide-react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// -- Tipos ------------------------------------------------------------------

type NotificationKind = "lead" | "quote";

type AdminNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  subtitle: string;
  createdAt: string;
  href: string;
};

type LeadRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  message: string | null;
  createdAt: string;
};

type QuoteRow = {
  id: string;
  name: string | null;
  company: string | null;
  total: number | null;
  createdAt: string;
};

const LAST_SEEN_KEY = "zyteron_admin_notif_last_seen_v1";
const MAX_ITEMS = 30;

// -- Formateadores ----------------------------------------------------------

function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "hace un momento";
  const min = Math.round(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `hace ${day} d`;
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function formatCLP(value: number | null) {
  if (!value || Number.isNaN(value)) return null;
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value}`;
  }
}

function leadToNotification(row: LeadRow): AdminNotification {
  const name = row.name?.trim() || "Nuevo contacto";
  const parts = [row.email, row.phone].filter(Boolean).join(" · ");
  return {
    id: `lead:${row.id}`,
    kind: "lead",
    title: `Nuevo contacto: ${name}`,
    subtitle: parts || row.message?.slice(0, 80) || "Solicitud desde el sitio web",
    createdAt: row.createdAt,
    href: "/admin/contactos",
  };
}

function quoteToNotification(row: QuoteRow): AdminNotification {
  const name = row.name?.trim() || "Cliente";
  const total = formatCLP(row.total);
  const company = row.company?.trim();
  return {
    id: `quote:${row.id}`,
    kind: "quote",
    title: `Nueva cotización: ${name}`,
    subtitle: [company, total].filter(Boolean).join(" · ") || "Cotización desde el sitio web",
    createdAt: row.createdAt,
    href: "/admin/cotizaciones",
  };
}

// -- Componente -------------------------------------------------------------

export function AdminNotifications() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<AdminNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );

  const supabaseRef = useRef<SupabaseClient | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const lastSeenRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Baseline de "visto" persistido entre recargas.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_SEEN_KEY);
      lastSeenRef.current = raw ? Number(raw) || 0 : 0;
    } catch {
      lastSeenRef.current = 0;
    }
    if ("Notification" in window) {
      setPermission(Notification.permission);
      // Intento automático de pedir permiso (algunos navegadores lo permiten).
      if (Notification.permission === "default") {
        Notification.requestPermission().then(setPermission).catch(() => {});
      }
    }
    // Desbloquea el audio con la primera interacción del usuario en el panel.
    const unlock = () => {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (Ctx && !audioCtxRef.current) audioCtxRef.current = new Ctx();
        audioCtxRef.current?.resume().catch(() => {});
      } catch {
        /* noop */
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Insignia en el ícono de la app (PWA instalada, escritorio y Android).
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (unread > 0) nav.setAppBadge?.(unread).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [unread]);

  const playSound = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx && !audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      // Dos tonos cortos ascendentes, sobrios y profesionales.
      [880, 1175].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = now + i * 0.16;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.16);
      });
    } catch {
      /* noop */
    }
  }, []);

  const pushToast = useCallback((notif: AdminNotification) => {
    setToasts((prev) => [notif, ...prev].slice(0, 4));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== notif.id));
    }, 8000);
  }, []);

  const fireBrowserNotification = useCallback((notif: AdminNotification) => {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const n = new Notification(notif.title, {
        body: notif.subtitle,
        tag: notif.id,
        icon: "/logo.svg",
        badge: "/logo.svg",
      });
      n.onclick = () => {
        window.focus();
        window.location.href = notif.href;
        n.close();
      };
    } catch {
      /* noop */
    }
  }, []);

  const ingest = useCallback(
    (incoming: AdminNotification[], { isInitial }: { isInitial: boolean }) => {
      if (incoming.length === 0) return;

      const fresh: AdminNotification[] = [];
      for (const notif of incoming) {
        if (seenIdsRef.current.has(notif.id)) continue;
        seenIdsRef.current.add(notif.id);
        fresh.push(notif);
      }
      if (fresh.length === 0) return;

      setItems((prev) =>
        [...fresh, ...prev]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_ITEMS),
      );

      // En la carga inicial no alertamos por lo ya existente antes del baseline.
      const alertable = fresh.filter((n) => {
        const ts = new Date(n.createdAt).getTime();
        if (isInitial) return ts > lastSeenRef.current;
        return true;
      });

      if (alertable.length > 0) {
        setUnread((u) => u + alertable.length);
        if (!isInitial || mountedRef.current) {
          playSound();
          for (const notif of alertable) {
            pushToast(notif);
            // Notificación del sistema SIEMPRE (con la pestaña abierta o no).
            fireBrowserNotification(notif);
          }
        }
      }
    },
    [pushToast, fireBrowserNotification, playSound],
  );

  // Carga inicial + realtime + polling de respaldo.
  useEffect(() => {
    let client: SupabaseClient;
    try {
      client = createSupabaseBrowserClient();
    } catch {
      return; // Supabase no configurado: no rompemos el panel.
    }
    supabaseRef.current = client;
    let channel: RealtimeChannel | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function fetchRecent(isInitial: boolean) {
      const [leadsRes, quotesRes] = await Promise.all([
        client
          .from("Lead")
          .select("id,name,email,phone,source,message,createdAt")
          .order("createdAt", { ascending: false })
          .limit(15),
        client
          .from("Quote")
          .select("id,name,company,total,createdAt")
          .order("createdAt", { ascending: false })
          .limit(15),
      ]);

      if (cancelled) return;

      const notifs: AdminNotification[] = [];
      if (!leadsRes.error && Array.isArray(leadsRes.data)) {
        for (const row of leadsRes.data as LeadRow[]) notifs.push(leadToNotification(row));
      }
      if (!quotesRes.error && Array.isArray(quotesRes.data)) {
        for (const row of quotesRes.data as QuoteRow[]) notifs.push(quoteToNotification(row));
      }
      ingest(notifs, { isInitial });
      if (isInitial) mountedRef.current = true;
    }

    void fetchRecent(true);

    // Realtime: inserciones instantáneas (requiere publicación supabase_realtime).
    try {
      channel = client
        .channel("admin-notifications")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Lead" },
          (payload) => {
            ingest([leadToNotification(payload.new as LeadRow)], { isInitial: false });
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Quote" },
          (payload) => {
            ingest([quoteToNotification(payload.new as QuoteRow)], { isInitial: false });
          },
        )
        .subscribe();
    } catch {
      /* realtime no disponible: seguimos con polling */
    }

    // Respaldo por polling (por si realtime no está habilitado en la BD).
    pollTimer = setInterval(() => {
      if (document.visibilityState === "visible") void fetchRecent(false);
    }, 30_000);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (channel) client.removeChannel(channel).catch(() => {});
    };
  }, [ingest]);

  // Cerrar dropdown al hacer clic fuera.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAllSeen = useCallback(() => {
    setUnread(0);
    lastSeenRef.current = Date.now();
    try {
      localStorage.setItem(LAST_SEEN_KEY, String(lastSeenRef.current));
    } catch {
      /* noop */
    }
  }, []);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next) markAllSeen();
      return next;
    });
  }, [markAllSeen]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch {
      /* noop */
    }
  }, []);

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={toggleOpen}
          aria-label="Notificaciones"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-10 z-50 w-[340px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-[13px] font-semibold text-slate-800">Notificaciones</p>
              <div className="flex items-center gap-1">
                {permission === "default" && (
                  <button
                    type="button"
                    onClick={requestPermission}
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    Activar avisos
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <BellOff className="h-6 w-6 text-slate-300" />
                  <p className="text-[12px] text-slate-400">Aún no hay notificaciones.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((notif) => (
                    <li key={notif.id}>
                      <Link
                        href={notif.href}
                        prefetch={false}
                        onClick={() => setOpen(false)}
                        className="flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            notif.kind === "quote"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-blue-50 text-blue-600",
                          )}
                        >
                          {notif.kind === "quote" ? (
                            <FileText className="h-4 w-4" />
                          ) : (
                            <MessageSquare className="h-4 w-4" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-slate-800">
                            {notif.title}
                          </span>
                          <span className="block truncate text-[12px] text-slate-500">
                            {notif.subtitle}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-400">
                            {formatRelative(notif.createdAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-slate-100 px-4 py-2">
                <button
                  type="button"
                  onClick={markAllSeen}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Marcar todo como leído
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toasts en tiempo real */}
      <div className="pointer-events-none fixed right-4 top-16 z-[60] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((notif) => (
          <Link
            key={notif.id}
            href={notif.href}
            prefetch={false}
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== notif.id))}
            className="pointer-events-auto flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/10 transition-transform hover:scale-[1.01]"
          >
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                notif.kind === "quote"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-blue-50 text-blue-600",
              )}
            >
              {notif.kind === "quote" ? (
                <FileText className="h-4 w-4" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-slate-800">
                {notif.title}
              </span>
              <span className="block truncate text-[12px] text-slate-500">{notif.subtitle}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
