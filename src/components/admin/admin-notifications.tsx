"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  BellRing,
  BriefcaseBusiness,
  CheckCheck,
  FileText,
  LoaderCircle,
  MessageCircle,
  MessageSquare,
  Send,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationKind = "contact" | "quote" | "whatsapp" | "web" | "partner" | "executive" | "system";

type AdminNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  subtitle: string;
  createdAt: string;
  href: string;
};

type NotificationMetrics = {
  contactsNewToday: number;
  quotesNewToday: number;
  whatsappPending: number;
  webMessagesToday: number;
  partnerClientsNewToday: number;
  executiveClientsNewToday: number;
  pendingAlerts: number;
};

type PushState =
  | "checking"
  | "ready"
  | "activating"
  | "active"
  | "unsupported"
  | "ios-install-required"
  | "denied"
  | "server-missing"
  | "storage-missing"
  | "error";

type PushMessagePayload = {
  title?: string;
  body?: string;
  href?: string;
  tag?: string;
  kind?: NotificationKind;
  createdAt?: string;
  eventId?: string;
};

const LAST_SEEN_KEY = "zyteron_admin_notif_last_seen_v2";
const MAX_ITEMS = 30;
const EMPTY_METRICS: NotificationMetrics = {
  contactsNewToday: 0,
  quotesNewToday: 0,
  whatsappPending: 0,
  webMessagesToday: 0,
  partnerClientsNewToday: 0,
  executiveClientsNewToday: 0,
  pendingAlerts: 0,
};

function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "hace un momento";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function deviceLabel() {
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "Zyteron en iPhone/iPad";
  if (/android/i.test(navigator.userAgent)) return "Zyteron en Android";
  if (/windows/i.test(navigator.userAgent)) return "Zyteron en Windows";
  if (/macintosh|mac os x/i.test(navigator.userAgent)) return "Zyteron en Mac";
  return "Zyteron en este dispositivo";
}

function kindStyle(kind: NotificationKind) {
  if (kind === "quote") return "bg-emerald-50 text-emerald-600";
  if (kind === "whatsapp") return "bg-green-50 text-green-600";
  if (kind === "partner") return "bg-violet-50 text-violet-600";
  if (kind === "executive") return "bg-amber-50 text-amber-600";
  if (kind === "web") return "bg-cyan-50 text-cyan-600";
  return "bg-blue-50 text-blue-600";
}

function KindIcon({ kind }: { kind: NotificationKind }) {
  if (kind === "quote") return <FileText className="h-4 w-4" />;
  if (kind === "whatsapp") return <MessageCircle className="h-4 w-4" />;
  if (kind === "partner" || kind === "executive") return <Users className="h-4 w-4" />;
  return <MessageSquare className="h-4 w-4" />;
}

function pushDescription(state: PushState, activeDevices: number) {
  if (state === "active") return `Activas en este dispositivo${activeDevices > 1 ? ` y ${activeDevices - 1} más` : ""}.`;
  if (state === "activating") return "Solicitando permiso y registrando el dispositivo…";
  if (state === "ios-install-required") return "En iPhone/iPad, instala Zyteron en la pantalla de inicio y abre la app desde su icono.";
  if (state === "denied") return "El sistema bloqueó el permiso. Habilita Zyteron en Configuración > Notificaciones.";
  if (state === "server-missing") return "Faltan las claves VAPID en el servidor.";
  if (state === "storage-missing") return "Falta crear la tabla de dispositivos en la base de datos.";
  if (state === "unsupported") return "Este navegador no admite notificaciones push. Usa la app instalada o un navegador actualizado.";
  if (state === "error") return "No se pudo activar. Revisa el permiso del sistema e inténtalo nuevamente.";
  if (state === "checking") return "Comprobando este dispositivo…";
  return "Recibe contactos, cotizaciones, WhatsApp y actividad comercial aunque la app esté cerrada.";
}

export function AdminNotifications() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [metrics, setMetrics] = useState<NotificationMetrics>(EMPTY_METRICS);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<AdminNotification[]>([]);
  const [pushState, setPushState] = useState<PushState>("checking");
  const [activeDevices, setActiveDevices] = useState(0);
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const seenIdsRef = useRef(new Set<string>());
  const lastSeenRef = useRef(0);
  const mountedRef = useRef(false);
  const pushActiveRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const now = ctx.currentTime;
      [880, 1175].forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + index * 0.16;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.16);
      });
    } catch {
      // El sonido es secundario; la notificación visual sigue funcionando.
    }
  }, []);

  const pushToast = useCallback((notification: AdminNotification) => {
    setToasts((current) => [notification, ...current].slice(0, 4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== notification.id));
    }, 8_000);
  }, []);

  const showLocalSystemNotification = useCallback(async (notification: AdminNotification) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const options: NotificationOptions = {
      body: notification.subtitle,
      tag: notification.id,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { href: notification.href },
    };
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(notification.title, options);
    } catch {
      try {
        new Notification(notification.title, options);
      } catch {
        // iOS y Android requieren la vía del service worker.
      }
    }
  }, []);

  const ingest = useCallback(
    (incoming: AdminNotification[], options: { initial?: boolean; fromPush?: boolean } = {}) => {
      const fresh = incoming.filter((notification) => {
        if (seenIdsRef.current.has(notification.id)) return false;
        seenIdsRef.current.add(notification.id);
        return true;
      });
      if (fresh.length === 0) return;

      setItems((current) =>
        [...fresh, ...current]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_ITEMS),
      );

      const alertable = fresh.filter((notification) => new Date(notification.createdAt).getTime() > lastSeenRef.current);
      if (alertable.length === 0) return;
      setUnread((current) => current + alertable.length);

      if (!options.initial && mountedRef.current) {
        playSound();
        alertable.forEach((notification) => {
          pushToast(notification);
          if (!options.fromPush && !pushActiveRef.current) void showLocalSystemNotification(notification);
        });
      }
    },
    [playSound, pushToast, showLocalSystemNotification],
  );

  const refreshFeed = useCallback(async (initial = false) => {
    try {
      const response = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { items?: AdminNotification[]; metrics?: NotificationMetrics };
      if (data.metrics) setMetrics(data.metrics);
      if (Array.isArray(data.items)) ingest(data.items, { initial });
    } finally {
      if (initial) mountedRef.current = true;
    }
  }, [ingest]);

  const checkPushState = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      return;
    }
    if (isIosDevice() && !isStandalone()) {
      setPushState("ios-install-required");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    try {
      const response = await fetch("/api/admin/push/subscriptions", { cache: "no-store" });
      if (!response.ok) throw new Error("push config unavailable");
      const config = (await response.json()) as { configured: boolean; storageReady: boolean; activeDevices: number };
      setActiveDevices(config.activeDevices || 0);
      if (!config.configured) {
        setPushState("server-missing");
        return;
      }
      if (!config.storageReady) {
        setPushState("storage-missing");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      const active = Boolean(subscription && Notification.permission === "granted");
      pushActiveRef.current = active;
      setPushState(active ? "active" : "ready");
    } catch {
      setPushState("error");
    }
  }, []);

  useEffect(() => {
    const now = Date.now();
    try {
      const stored = Number(localStorage.getItem(LAST_SEEN_KEY));
      lastSeenRef.current = Number.isFinite(stored) && stored > 0 ? stored : now;
      if (!stored) localStorage.setItem(LAST_SEEN_KEY, String(now));
    } catch {
      lastSeenRef.current = now;
    }

    void refreshFeed(true);
    void checkPushState();
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshFeed(false);
    }, 25_000);

    const unlockAudio = () => {
      try {
        const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx && !audioCtxRef.current) audioCtxRef.current = new Ctx();
        void audioCtxRef.current?.resume();
      } catch {
        // El audio continuará deshabilitado, sin afectar los avisos visuales.
      }
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    const onWorkerMessage = (event: MessageEvent<{ type?: string; payload?: PushMessagePayload }>) => {
      if (event.data?.type !== "ZYTERON_PUSH" || !event.data.payload?.title) return;
      const payload = event.data.payload;
      ingest(
        [{
          id: payload.eventId || `push:${payload.tag || Date.now()}`,
          kind: payload.kind || "system",
          title: payload.title || "Zyteron",
          subtitle: payload.body || "Nueva actividad en Zyteron",
          createdAt: payload.createdAt || new Date().toISOString(),
          href: payload.href || "/admin",
        }],
        { fromPush: true },
      );
      void refreshFeed(false);
    };
    navigator.serviceWorker?.addEventListener("message", onWorkerMessage);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      navigator.serviceWorker?.removeEventListener("message", onWorkerMessage);
    };
  }, [checkPushState, ingest, playSound, refreshFeed]);

  useEffect(() => {
    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (unread > 0) void badgeNavigator.setAppBadge?.(unread).catch(() => {});
    else void badgeNavigator.clearAppBadge?.().catch(() => {});
  }, [unread]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [open]);

  const markAllSeen = useCallback(() => {
    const now = Date.now();
    lastSeenRef.current = now;
    setUnread(0);
    try {
      localStorage.setItem(LAST_SEEN_KEY, String(now));
    } catch {
      // El contador de esta sesión sigue funcionando.
    }
  }, []);

  const activatePush = useCallback(async () => {
    if (isIosDevice() && !isStandalone()) {
      setPushState("ios-install-required");
      return;
    }
    setPushState("activating");
    try {
      const configResponse = await fetch("/api/admin/push/subscriptions", { cache: "no-store" });
      const config = (await configResponse.json()) as { configured?: boolean; publicKey?: string; storageReady?: boolean; error?: string };
      if (!configResponse.ok || !config.configured || !config.publicKey) {
        setPushState("server-missing");
        return;
      }
      if (config.storageReady === false) {
        setPushState("storage-missing");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "ready");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });
      const response = await fetch("/api/admin/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...subscription.toJSON(), deviceLabel: deviceLabel() }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setPushState(body?.error?.includes("tabla") ? "storage-missing" : "error");
        return;
      }
      pushActiveRef.current = true;
      setPushState("active");
      setActiveDevices((count) => Math.max(1, count + (existing ? 0 : 1)));
      await fetch("/api/admin/push/test", { method: "POST" }).catch(() => null);
    } catch {
      setPushState(Notification.permission === "denied" ? "denied" : "error");
    }
  }, []);

  const disablePush = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/admin/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      pushActiveRef.current = false;
      setActiveDevices((count) => Math.max(0, count - 1));
      setPushState("ready");
    } catch {
      setPushState("error");
    }
  }, []);

  const sendTest = useCallback(async () => {
    setTestStatus("sending");
    try {
      const response = await fetch("/api/admin/push/test", { method: "POST" });
      setTestStatus(response.ok ? "sent" : "error");
    } catch {
      setTestStatus("error");
    }
    window.setTimeout(() => setTestStatus("idle"), 3_000);
  }, []);

  const metricCards = [
    ["Contactos", metrics.contactsNewToday],
    ["Cotizaciones", metrics.quotesNewToday],
    ["WhatsApp", metrics.whatsappPending],
    ["Web", metrics.webMessagesToday],
    ["Partners", metrics.partnerClientsNewToday],
    ["Ejecutivos", metrics.executiveClientsNewToday],
  ] as const;

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-[17px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[17px] text-white ring-2 ring-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
          {pushState === "active" && unread === 0 && <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />}
        </button>

        {open && (
          <div className="absolute right-0 top-10 z-50 w-[min(430px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-[14px] font-semibold text-slate-900">Notificaciones</p>
                <p className="text-[11px] text-slate-400">Actividad del panel Zyteron</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className={cn("m-3 rounded-xl border p-3", pushState === "active" ? "border-emerald-200 bg-emerald-50/70" : "border-blue-100 bg-blue-50/60")}>
              <div className="flex gap-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", pushState === "active" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>
                  {pushState === "checking" || pushState === "activating" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : pushState === "active" ? <BellRing className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-slate-800">Avisos en tiempo real</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-600">{pushDescription(pushState, activeDevices)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {pushState === "active" ? (
                      <>
                        <button type="button" onClick={sendTest} disabled={testStatus === "sending"} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                          <Send className="h-3 w-3" />
                          {testStatus === "sending" ? "Enviando…" : testStatus === "sent" ? "Prueba enviada" : testStatus === "error" ? "Falló la prueba" : "Enviar prueba"}
                        </button>
                        <button type="button" onClick={disablePush} className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-white/80">Desactivar aquí</button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={activatePush}
                        disabled={["checking", "activating", "unsupported", "server-missing", "storage-missing"].includes(pushState)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pushState === "activating" ? "Activando…" : "Activar en este dispositivo"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
              {metricCards.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 text-center">
                  <p className="text-[15px] font-bold leading-none text-slate-800">{value}</p>
                  <p className="mt-1 truncate text-[9px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-y border-slate-100 px-4 py-2">
              <span className="text-[11px] font-medium text-slate-500">{unread ? `${unread} sin leer` : "Todo al día"}</span>
              <span className={cn("text-[11px] font-semibold", metrics.pendingAlerts > 0 ? "text-amber-600" : "text-emerald-600")}>
                {metrics.pendingAlerts} alertas pendientes
              </span>
            </div>

            <div className="max-h-[330px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-9 text-center">
                  <BellOff className="h-6 w-6 text-slate-300" />
                  <p className="text-[12px] text-slate-400">Aún no hay notificaciones.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((notification) => (
                    <li key={notification.id}>
                      <Link href={notification.href} prefetch={false} onClick={() => { markAllSeen(); setOpen(false); }} className="flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
                        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", kindStyle(notification.kind))}>
                          <KindIcon kind={notification.kind} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-slate-800">{notification.title}</span>
                          <span className="block truncate text-[12px] text-slate-500">{notification.subtitle}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-400">{formatRelative(notification.createdAt)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
              <button type="button" onClick={markAllSeen} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700">
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todo como leído
              </button>
              <span className="flex items-center gap-1 text-[10px] text-slate-400"><BriefcaseBusiness className="h-3 w-3" /> Mac · Windows · iOS · Android</span>
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none fixed right-4 top-16 z-[60] flex w-[330px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((notification) => (
          <Link key={notification.id} href={notification.href} prefetch={false} onClick={() => setToasts((current) => current.filter((item) => item.id !== notification.id))} className="pointer-events-auto flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/10 hover:scale-[1.01]">
            <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", kindStyle(notification.kind))}><KindIcon kind={notification.kind} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-slate-800">{notification.title}</span>
              <span className="block truncate text-[12px] text-slate-500">{notification.subtitle}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
