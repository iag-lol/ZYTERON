"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@control/components/routed-link";
import { Bell, CheckCheck, MessageCircle, ArrowUpRight, X } from "lucide-react";
import { subscribeContactLive } from "@/lib/whatsapp/live-events";
import { formatDateTime } from "@control/lib/date-time";
import { MonitoringAlertsDigest } from "@control/components/monitoring/alerts-digest";
import "./contact-notification-bell.css";
type Item = {
  id: string;
  title: string;
  body: string;
  name: string | null;
  href: string;
  createdAt: string;
  kind: string;
};
export function ContactNotificationBell() {
  const [items, setItems] = useState<Item[]>([]),
    [open, setOpen] = useState(false),
    [seen, setSeen] = useState(0),
    [error, setError] = useState(false),
    [toast, setToast] = useState<Item | null>(null);
  const root = useRef<HTMLDivElement>(null),
    lastAlert = useRef(""),
    initialized = useRef(false),
    seenMarker = useRef(0),
    requestSequence = useRef(0),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const load = useCallback(async () => {
    const request = ++requestSequence.current;
    try {
      const response = await fetch("/api/admin/notifications/feed", { cache: "no-store" });
      if (!response.ok) throw Error();
      const data = await response.json();
      if (request !== requestSequence.current) return;
      setSeen((current) => current || seenMarker.current);
      setItems(data.items);
      setError(false);
      const latest = data.items[0]?.id;
      if (
        initialized.current &&
        latest &&
        latest !== lastAlert.current &&
        Date.parse(data.items[0].createdAt) > seenMarker.current
      ) {
        setToast(data.items[0]);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 8000);
      }
      lastAlert.current = latest;
      initialized.current = true;
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    try {
      seenMarker.current =
        Number(localStorage.getItem("zyteron-contact-notifications-seen")) || Date.now();
    } catch {
      seenMarker.current = Date.now();
    }
    void load();
    const unsubscribe = subscribeContactLive((kind) => {
      if (kind === "contact" || kind === "refresh") void load();
    });
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 25000);
    return () => {
      unsubscribe();
      clearInterval(timer);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [load]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const unread = items.filter((item) => Date.parse(item.createdAt) > seen).length;
  return (
    <div className="contactBell" ref={root}>
      <button
        className="notificationButton"
        type="button"
        aria-label={`Centro de notificaciones${unread ? `, ${unread} sin leer` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} />
        {unread ? <span className="contactBellCount">{unread > 99 ? "99+" : unread}</span> : null}
      </button>
      {toast && !open ? (
        <div className="contactToast" role="status">
          <MessageCircle size={18} />
          <Link href={toast.href} onClick={() => setToast(null)}>
            <strong>{toast.title}</strong>
            <span>{toast.name || toast.body.slice(0, 80)}</span>
          </Link>
          <button aria-label="Cerrar aviso" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      ) : null}
      {open ? (
        <section className="contactBellPanel" aria-label="Notificaciones de clientes">
          <header>
            <div>
              <small>CONTACTOS Y ACTIVIDAD</small>
              <strong>Notificaciones</strong>
            </div>
            <button aria-label="Cerrar notificaciones" onClick={() => setOpen(false)}>
              <X size={17} />
            </button>
          </header>
          <div className="contactBellActions">
            <Link href="/commercial/whatsapp" onClick={() => setOpen(false)}>
              Abrir comunicaciones
              <ArrowUpRight size={12} />
            </Link>
            <button
              onClick={() => {
                const value = Date.now();
                setSeen(value);
                seenMarker.current = value;
                try {
                  localStorage.setItem("zyteron-contact-notifications-seen", String(value));
                } catch {}
              }}
            >
              <CheckCheck size={13} />
              Marcar leídas
            </button>
          </div>
          <div className="contactBellItems">
            {error ? (
              <p>
                No fue posible actualizar los contactos.{" "}
                <button onClick={() => void load()}>Reintentar</button>
              </p>
            ) : !items.length ? (
              <p>
                Los nuevos leads, formularios, chats y WhatsApp aparecerán aquí en cuanto se
                registren.
              </p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={Date.parse(item.createdAt) > seen ? "unread" : ""}
                  onClick={() => setOpen(false)}
                >
                  <MessageCircle size={17} />
                  <div>
                    <strong>{item.title}</strong>
                    {item.name ? <b>{item.name}</b> : null}
                    <p>{item.body.slice(0, 160)}</p>
                    <small>{formatDateTime(item.createdAt)}</small>
                  </div>
                </Link>
              ))
            )}
          </div>
          <details>
            <summary>Alertas operativas</summary>
            <MonitoringAlertsDigest
              fallback={<p className="contactBellEmpty">Sin alertas operativas registradas.</p>}
            />
          </details>
        </section>
      ) : null}
    </div>
  );
}
