import type { PortalData } from "@/lib/client-experience/snapshot";
import { agendaEventDate, agendaEventTime } from "@/lib/client-experience/month-calendar";
import { invoicePaymentOption } from "@/lib/payments/invoice-payment-option";
import { projectStatus, projectStatusLabel } from "@/lib/client-experience/project-status";
export const money = (amount: number, currency = "CLP") =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency === "UF" ? "CLF" : currency,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(amount);
export const civil = (value: string | null) => {
  if (!value) return "Por coordinar";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").reverse().join("-");
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date(value))
    .replaceAll("/", "-");
};
export const initials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
export function presentation(data: PortalData) {
  return {
    services: data.services.map((s) => ({
      id: s.id,
      name: s.name,
      domain: "Servicio contratado",
      icon: "globe",
      category: "SERVICIOS DIGITALES",
      description: s.description,
      price: s.price === null ? "Según acuerdo" : money(s.price, s.currency),
      period: s.frequency || "Según acuerdo",
      renewal: civil(s.renewal),
      status: s.status === "ACTIVE" ? "Activo" : s.status,
      scope: s.description ? [s.description] : [],
      color: "green",
    })),
    projects: data.projects.map((p) => ({
      id: p.id,
      name: p.title,
      short: p.title,
      number: p.number,
      scope: p.scope,
      category: p.category || "PROYECTO",
      description: p.description,
      progress: p.progress,
      status: projectStatus(p.status),
      phase: projectStatusLabel(p.status),
      date: civil(p.end),
      next: "Consulta los próximos pasos al equipo",
      initials: [] as string[],
      color: "forest",
      steps: [] as string[],
      current: -1,
    })),
    invoices: data.invoices.map((i) => ({
      id: i.id,
      quoteId: i.quoteId,
      displayNumber:
        data.quotes.find((q) => q.id === i.quoteId)?.number || `Cuenta · ${i.id.slice(0, 8)}`,
      concept: i.concept,
      period: "Obligación registrada",
      issued: civil(i.issued),
      due: civil(i.due),
      amount: money(i.total, i.currency),
      net: "Consulta el documento de origen",
      tax: "Consulta el documento de origen",
      balance: money(i.balance, i.currency),
      status: i.status,
      obligation: i.balance > 0 ? "Pendiente" : "Saldada",
      document: "Cuenta por cobrar",
      payable: ["FLOW", "BOTH"].includes(
        invoicePaymentOption(
          i,
          data.quotes.find((q) => q.id === i.quoteId),
        ),
      ),
    })),
    documents: data.documents.map((d) => ({
      id: d.id,
      name: d.title,
      type:
        (
          {
            CONTRACT: "Contrato",
            CONTRATO: "Contrato",
            REPORT: "Informe",
            INFORME: "Informe",
            MANUAL: "Manual",
            DELIVERABLE: "Entregable",
          } as Record<string, string>
        )[d.category] || d.category,
      project: d.description || "Documento compartido",
      date: civil(d.date),
      version: "Publicado",
      status: "Compartido",
      size: d.fileName,
    })),
    tickets: data.tickets.map((t) => ({
      ...t,
      service: "Asistencia Zyteron",
      date: civil(t.date),
      status:
        (
          {
            OPEN: "Abierta",
            IN_PROGRESS: "En curso",
            WAITING_CLIENT: "Esperando tu respuesta",
            RESOLVED: "Resuelta",
            CLOSED: "Cerrada",
          } as Record<string, string>
        )[t.status] || t.status,
      messages: t.messages.map((m) => ({ ...m, time: civil(m.date) })),
    })),
    notifications: data.notifications.map((n) => ({
      ...n,
      time: civil(n.date),
      section: "notificaciones",
      icon: "bell",
      unread: !n.read,
    })),
    events: data.events.map((e) => ({
      ...e,
      day: agendaEventDate(e.date)?.slice(8) || "",
      month: new Intl.DateTimeFormat("es-CL", { month: "short", timeZone: "UTC" })
        .format(new Date(`${agendaEventDate(e.date)}T12:00:00Z`))
        .toUpperCase(),
      date: civil(agendaEventDate(e.date)),
      time: agendaEventTime(e.date),
    })),
  };
}
