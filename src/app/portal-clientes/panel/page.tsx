import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Clock,
  FileText,
  FolderOpen,
  Headphones,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  Shield,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { parseQuoteMessage } from "@/lib/admin/quote";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { currencyCLP, getClientPortalSnapshot } from "@/lib/portal/data";
import { normalizeQuoteMetaPayment, quotePaymentRequiresPortalAction } from "@/lib/payments/quote-payments";
import { getWebPricingSnapshot } from "@/lib/web-control";
import { PortalStore } from "@/components/portal/panel/portal-store";
import { siteConfig } from "@/config/site";

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return value.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: Date | null) {
  if (!value) return "—";
  return value.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Justo ahora";
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days}d`;
  return formatDate(date);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

type TimelineEvent = {
  id: string;
  type: "ticket" | "communication" | "request" | "notification" | "project" | "document";
  title: string;
  subtitle: string;
  date: Date;
};

function ProgressRing({ value, max, size = 56, strokeWidth = 5, color = "#3b82f6" }: { value: number; max: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="progress-ring-circle"
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="text-[11px] font-bold" fill="#0f172a">
        {value}
      </text>
    </svg>
  );
}

export default async function PortalDashboardPage() {
  const session = await requirePortalSession();
  const snapshot = await getClientPortalSnapshot(session.user.id);
  const pricingSnapshot = await getWebPricingSnapshot();

  const totalSales = snapshot.sales.reduce((acc, sale) => acc + (sale.total || 0), 0);
  const pendingQuotes = snapshot.quotes.filter((q) => String(q.status).toUpperCase() === "PENDING").length;
  const quotesWithPaymentPending = snapshot.quotes
    .map((quote) => ({
      ...quote,
      paymentMeta: normalizeQuoteMetaPayment(parseQuoteMessage(quote.message)).payment,
    }))
    .filter((quote) => quotePaymentRequiresPortalAction(quote.status, quote.paymentMeta));
  const activeProjects = snapshot.projects.filter((p) => {
    const s = String(p.status || "").toUpperCase();
    return s === "ACTIVE" || s === "IN_PROGRESS" || s === "EN_CURSO";
  }).length;
  const openTickets = snapshot.tickets.filter((t) => {
    const s = String(t.status || "").toUpperCase();
    return s !== "RESOLVED" && s !== "CLOSED";
  }).length;
  const unreadNotifications = snapshot.notifications.filter((n) => !n.isRead).length;
  const userName = snapshot.user?.firstName || session.user.name || "Cliente";
  const fullName = snapshot.user?.name || session.user.name || "Cliente";

  // Build unified timeline
  const timeline: TimelineEvent[] = [];
  for (const ticket of snapshot.tickets.slice(0, 4)) {
    timeline.push({
      id: `t-${ticket.id}`,
      type: "ticket",
      title: ticket.title,
      subtitle: `Ticket · ${ticket.status}`,
      date: ticket.createdAt,
    });
  }
  for (const comm of snapshot.communications.slice(0, 4)) {
    timeline.push({
      id: `c-${comm.id}`,
      type: "communication",
      title: comm.subject,
      subtitle: `${comm.direction === "INBOUND" ? "Enviado por ti" : "Zyteron"} · ${comm.channel}`,
      date: comm.createdAt,
    });
  }
  for (const req of snapshot.portalRequests.slice(0, 3)) {
    timeline.push({
      id: `r-${req.id}`,
      type: "request",
      title: req.title,
      subtitle: `Solicitud · ${req.status}`,
      date: req.createdAt,
    });
  }
  for (const doc of snapshot.documents.slice(0, 3)) {
    timeline.push({
      id: `d-${doc.id}`,
      type: "document",
      title: doc.title,
      subtitle: `Documento · ${doc.category}`,
      date: doc.createdAt,
    });
  }
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentTimeline = timeline.slice(0, 8);

  const timelineTypeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
    ticket: { icon: LifeBuoy, color: "text-violet-600", bg: "bg-violet-100" },
    communication: { icon: MessageCircle, color: "text-blue-600", bg: "bg-blue-100" },
    request: { icon: Ticket, color: "text-amber-600", bg: "bg-amber-100" },
    notification: { icon: Bell, color: "text-rose-600", bg: "bg-rose-100" },
    project: { icon: BriefcaseBusiness, color: "text-emerald-600", bg: "bg-emerald-100" },
    document: { icon: FolderOpen, color: "text-cyan-600", bg: "bg-cyan-100" },
  };

  return (
    <div className="space-y-6">
      {/* ── Hero Welcome ── */}
      <section className="portal-hero-gradient-subtle relative overflow-hidden rounded-3xl border border-blue-100 p-6 shadow-sm md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-72 -translate-x-1/2 rounded-full bg-sky-300/10 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl portal-hero-gradient text-lg font-extrabold text-white shadow-lg shadow-blue-600/20 animate-glow-ring">
              {getInitials(fullName)}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                {getGreeting()}
              </p>
              <h2 className="mt-0.5 text-2xl font-extrabold text-slate-900 md:text-3xl">
                {userName}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Este es tu portal privado. Revisa estado de cuenta, proyectos, documentación y soporte en un solo lugar.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {snapshot.user?.lastLoginAt ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 backdrop-blur-sm">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Último acceso: {formatDateTime(snapshot.user.lastLoginAt)}
              </div>
            ) : null}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-700 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Sesión segura
            </div>
          </div>
        </div>
      </section>

      {quotesWithPaymentPending.length > 0 ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Alerta de pago</p>
              <h3 className="mt-1 text-lg font-extrabold text-amber-900">Tienes pagos pendientes por validar</h3>
              <p className="mt-1 text-sm text-amber-800">
                Revisa tus cotizaciones con saldo pendiente y completa el pago o envía el comprobante correspondiente.
              </p>
            </div>
            <Link
              href="/portal-clientes/panel/cotizaciones"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-950"
            >
              Ir a cotizaciones
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}

      {/* ── Metric Cards with Progress Rings ── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="portal-card-premium p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600">Proyectos activos</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{activeProjects}</p>
              <p className="mt-1 text-xs text-slate-500">{snapshot.projects.length} proyectos totales</p>
            </div>
            <ProgressRing value={activeProjects} max={Math.max(snapshot.projects.length, 1)} color="#3b82f6" />
          </div>
        </article>

        <article className="portal-card-premium p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600">Cotizaciones pendientes</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{pendingQuotes}</p>
              <p className="mt-1 text-xs text-slate-500">{snapshot.quotes.length} cotizaciones registradas</p>
            </div>
            <ProgressRing value={pendingQuotes} max={Math.max(snapshot.quotes.length, 1)} color="#f59e0b" />
          </div>
        </article>

        <article className="portal-card-premium p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Compras / historial</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{currencyCLP(totalSales)}</p>
              <p className="mt-1 text-xs text-slate-500">{snapshot.sales.length} compras registradas</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </article>

        <article className="portal-card-premium p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600">Soporte abierto</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{openTickets}</p>
              <p className="mt-1 text-xs text-slate-500">{snapshot.tickets.length} tickets totales</p>
            </div>
            <ProgressRing value={openTickets} max={Math.max(snapshot.tickets.length, 1)} color="#8b5cf6" />
          </div>
        </article>
      </section>

      {/* ── Quick Actions with 3D hover ── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/portal-clientes/panel/proyectos", icon: BriefcaseBusiness, label: "Ver proyectos", desc: "Estados y avances", tone: "blue" },
          { href: "/portal-clientes/panel/asistencia", icon: LifeBuoy, label: "Soporte y tickets", desc: "Abre o revisa casos", tone: "violet" },
          { href: "/portal-clientes/panel/comunicacion", icon: MessageCircle, label: "Comunicación", desc: "Mensajes con el equipo", tone: "cyan" },
          { href: "/portal-clientes/panel/solicitudes", icon: FileText, label: "Nueva solicitud", desc: "Web, soporte y más", tone: "amber" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group portal-card-premium p-5 transition-all hover:border-blue-200"
            >
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-${item.tone}-100 text-${item.tone}-700 transition-transform group-hover:scale-110`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{item.label}</h3>
              <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
              <ArrowRight className="mt-2 h-4 w-4 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-blue-500" />
            </Link>
          );
        })}
      </section>

      {/* ── Activity Timeline + Contact Card ── */}
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Timeline */}
        <article className="portal-card-premium overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Actividad reciente</h3>
            <p className="mt-0.5 text-xs text-slate-500">Últimos movimientos en tu cuenta</p>
          </div>
          <div className="p-5">
            {recentTimeline.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                <Sparkles className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                Aún no hay actividad registrada en tu cuenta.
              </div>
            ) : (
              <div className="relative space-y-0">
                <div className="timeline-line" />
                {recentTimeline.map((event, index) => {
                  const config = timelineTypeConfig[event.type] || timelineTypeConfig.notification;
                  const EventIcon = config.icon;
                  return (
                    <div key={event.id} className="relative flex gap-3 pb-5 pl-1 animate-slide-in-up" style={{ animationDelay: `${index * 60}ms` }}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
                        <EventIcon className={`h-3.5 w-3.5 ${config.color}`} />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="truncate text-sm font-semibold text-slate-900">{event.title}</p>
                        <p className="text-xs text-slate-500">{event.subtitle} · {timeAgo(event.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        {/* Contact Card + Notifications Summary */}
        <div className="space-y-4">
          {/* Your Zyteron Contact */}
          <article className="portal-card-premium overflow-hidden">
            <div className="portal-hero-gradient px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Tu contacto Zyteron</p>
              <h3 className="mt-1 text-base font-extrabold text-white">Equipo de soporte</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 font-bold text-sm">
                  <Headphones className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Soporte Zyteron</p>
                  <p className="text-xs text-slate-500">Disponible Lun-Vie 9:00 a 18:00</p>
                </div>
              </div>
              <div className="space-y-2">
                <a
                  href="mailto:contacto@zyteron.cl"
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                >
                  <Mail className="h-4 w-4" />
                  contacto@zyteron.cl
                </a>
                <a
                  href={siteConfig.social.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Phone className="h-4 w-4" />
                  <span className="text-xs font-semibold text-emerald-700">
                    {siteConfig.contact.phoneDisplay} (WhatsApp)
                  </span>
                </a>
              </div>
              <Link
                href="/portal-clientes/panel/comunicacion"
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 btn-primary-glow"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar mensaje
              </Link>
            </div>
          </article>

          {/* Notifications Summary */}
          <article className="portal-card-premium p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Notificaciones</h3>
              </div>
              {unreadNotifications > 0 ? (
                <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse-badge">
                  {unreadNotifications}
                </span>
              ) : (
                <span className="text-xs text-slate-400">Sin alertas</span>
              )}
            </div>
            <div className="space-y-2">
              {snapshot.notifications.slice(0, 4).map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-xl border px-3 py-2.5 transition-colors ${
                    notification.isRead
                      ? "border-slate-200 bg-white"
                      : "border-blue-200 bg-blue-50/60"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600 line-clamp-1">{notification.body}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{timeAgo(notification.createdAt)}</p>
                </div>
              ))}
              {snapshot.notifications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-500">
                  No tienes notificaciones por ahora.
                </div>
              ) : null}
            </div>
          </article>
        </div>
      </section>

      {/* ── Documents + Communications Preview ── */}
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="portal-card-premium overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Últimos documentos</h3>
            </div>
            <Link href="/portal-clientes/panel/documentos" className="text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors">
              Ver todo →
            </Link>
          </div>
          <div className="p-5 space-y-2.5">
            {snapshot.documents.slice(0, 4).map((doc) => (
              <div key={doc.id} className="rounded-xl border border-slate-200 px-3.5 py-3 transition hover:border-blue-200 hover:bg-blue-50/30">
                <p className="text-sm font-semibold text-slate-900">{doc.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {doc.category} · {formatDate(doc.createdAt)}
                </p>
              </div>
            ))}
            {snapshot.documents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-3.5 py-6 text-center text-sm text-slate-500">
                Aún no tienes documentos en tu carpeta privada.
              </div>
            ) : null}
          </div>
        </article>

        <article className="portal-card-premium overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Comunicaciones recientes</h3>
            </div>
            <Link href="/portal-clientes/panel/comunicacion" className="text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors">
              Ver historial →
            </Link>
          </div>
          <div className="p-5 space-y-2.5">
            {snapshot.communications.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3.5 py-3 transition hover:border-blue-200 hover:bg-blue-50/30">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{item.subject}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    item.direction === "INBOUND"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {item.direction === "INBOUND" ? "Enviado" : "Recibido"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {item.channel} · {formatDate(item.createdAt)}
                </p>
              </div>
            ))}
            {snapshot.communications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-3.5 py-6 text-center text-sm text-slate-500">
                No hay comunicaciones registradas todavía.
              </div>
            ) : null}
          </div>
        </article>
      </section>

      {/* ── Security footer badge ── */}
      <section className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <Shield className="h-3.5 w-3.5 text-blue-600" />
        Tu información está protegida por sesión segura, cifrado AES-256 y permisos por rol. Solo tú puedes ver estos datos.
      </section>
      {/* ── Tienda y Servicios Integrados ── */}
      <PortalStore
        plans={pricingSnapshot.plans}
        extras={pricingSnapshot.extras}
        products={pricingSnapshot.products}
        user={{
          name: snapshot.user?.name || session.user.name || "",
          email: snapshot.user?.email || session.user.email || "",
          phone: snapshot.user?.phone || "",
          rut: snapshot.user?.rut || "",
          address: snapshot.user?.address || "",
        }}
      />
    </div>
  );
}
