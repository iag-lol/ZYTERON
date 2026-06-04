"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TicketMessage = {
  id: string;
  authorRole: string;
  message: string;
  createdAt: string;
};

type TicketItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
};

type ProjectOption = {
  id: string;
  title: string;
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
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

function getStatusConfig(status: string) {
  const s = status.toUpperCase();
  if (s === "OPEN") return { label: "Abierto", color: "border-amber-200 bg-amber-50 text-amber-700" };
  if (s === "WAITING_ADMIN" || s === "WAITING_RESPONSE") return { label: "Esperando respuesta", color: "border-blue-200 bg-blue-50 text-blue-700" };
  if (s === "WAITING_CLIENT") return { label: "Te toca responder", color: "border-violet-200 bg-violet-50 text-violet-700" };
  if (s === "RESOLVED") return { label: "Resuelto", color: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (s === "CLOSED") return { label: "Cerrado", color: "border-slate-200 bg-slate-100 text-slate-600" };
  return { label: status, color: "border-blue-200 bg-blue-50 text-blue-700" };
}

function getPriorityConfig(priority: string) {
  const p = priority.toUpperCase();
  if (p === "URGENT") return { label: "Urgente", color: "text-red-600" };
  if (p === "HIGH") return { label: "Alta", color: "text-rose-600" };
  if (p === "LOW") return { label: "Baja", color: "text-slate-500" };
  return { label: "Normal", color: "text-slate-600" };
}

export function SupportTicketCenter({
  initialTickets,
  projects,
}: {
  initialTickets: TicketItem[];
  projects: ProjectOption[];
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [pending, startTransition] = useTransition();
  const [replyPending, startReplyTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "SOPORTE",
    priority: "NORMAL",
    projectId: "",
  });
  const [replyTextByTicket, setReplyTextByTicket] = useState<Record<string, string>>({});

  function mapApiError(input: unknown, fallback: string) {
    const message = String(input || "").trim();
    if (!message) return fallback;
    if (message.includes("Too small: expected string to have >=10 characters")) {
      return "El detalle debe tener al menos 10 caracteres.";
    }
    if (message.includes("Too small: expected string to have >=4 characters")) {
      return "El título debe tener al menos 4 caracteres.";
    }
    return message;
  }

  async function createTicket() {
    setError("");
    setMessage("");
    const title = String(form.title || "").trim();
    const description = String(form.description || "").trim();
    if (title.length < 4) {
      setError("El título debe tener al menos 4 caracteres.");
      return;
    }
    if (description.length < 10) {
      setError("El detalle debe tener al menos 10 caracteres.");
      return;
    }

    const response = await fetch("/api/portal/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(mapApiError(payload?.error, "No se pudo crear el ticket."));
      return;
    }
    setMessage("Ticket creado correctamente. Actualiza la vista para ver el detalle completo.");
    setForm({ title: "", description: "", category: "SOPORTE", priority: "NORMAL", projectId: "" });
  }

  async function sendReply(ticketId: string) {
    const text = String(replyTextByTicket[ticketId] || "").trim();
    if (!text) return;
    const response = await fetch(`/api/portal/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(mapApiError(payload?.error, "No se pudo enviar el mensaje."));
      return;
    }
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: "WAITING_ADMIN",
              messages: [
                ...ticket.messages,
                {
                  id: payload.id || `tmp-${Date.now()}`,
                  authorRole: "CLIENT",
                  message: text,
                  createdAt: payload.createdAt || new Date().toISOString(),
                },
              ],
            }
          : ticket,
      ),
    );
    setReplyTextByTicket((current) => ({ ...current, [ticketId]: "" }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      {/* Create Ticket Form */}
      <section className="portal-card-premium p-5">
        <h3 className="text-sm font-bold text-slate-900">Crear ticket de soporte</h3>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(createTicket);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Ej: Ajuste en formulario de contacto"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoría</Label>
              <select
                id="category"
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="SOPORTE">Soporte</option>
                <option value="BUG">Bug</option>
                <option value="CAMBIO">Cambio</option>
                <option value="CONSULTA">Consulta</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Prioridad</Label>
              <select
                id="priority"
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="LOW">Baja</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="projectId">Proyecto relacionado (opcional)</Label>
            <select
              id="projectId"
              value={form.projectId}
              onChange={(event) => setForm((prev) => ({ ...prev, projectId: event.target.value }))}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="">Sin proyecto específico</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Detalle</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={5}
              placeholder="Describe claramente lo que necesitas."
            />
          </div>

          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

          <Button type="submit" className="h-10 bg-blue-700 hover:bg-blue-800 btn-primary-glow" disabled={pending}>
            {pending ? "Creando..." : "Crear ticket"}
          </Button>
        </form>
      </section>

      {/* Ticket List with Chat */}
      <section className="portal-card-premium p-5">
        <h3 className="text-sm font-bold text-slate-900">Historial de tickets</h3>
        <div className="mt-4 space-y-3">
          {tickets.map((ticket) => {
            const statusConfig = getStatusConfig(ticket.status);
            const priorityConfig = getPriorityConfig(ticket.priority);
            const isExpanded = expandedTicket === ticket.id;

            return (
              <article key={ticket.id} className="overflow-hidden rounded-xl border border-slate-200 transition hover:border-blue-200">
                {/* Ticket Header */}
                <button
                  type="button"
                  onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                  className="w-full px-4 py-3 text-left transition hover:bg-slate-50/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{ticket.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{ticket.category || "General"}</span>
                        <span>·</span>
                        <span className={priorityConfig.color}>{priorityConfig.label}</span>
                        <span>·</span>
                        <span>{ticket.messages.length} mensajes</span>
                        <span>·</span>
                        <span>{timeAgo(ticket.updatedAt)}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </button>

                {/* Expanded Chat */}
                {isExpanded ? (
                  <div className="border-t border-slate-100 animate-slide-in-up">
                    {/* Waiting indicator */}
                    {ticket.status.toUpperCase() === "WAITING_CLIENT" ? (
                      <div className="mx-4 mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
                        💬 Zyteron ha respondido — te toca a ti
                      </div>
                    ) : null}

                    <div className="max-h-[320px] overflow-y-auto p-4 space-y-2.5">
                      {ticket.messages.map((msg, idx) => {
                        const isClient = msg.authorRole === "CLIENT";
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isClient ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`max-w-[80%] ${isClient ? "chat-bubble-client" : "chat-bubble-admin"}`}>
                              <div className="mb-1 flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                  {isClient ? "Tú" : "Zyteron"}
                                </span>
                                <span className="text-[10px] text-slate-400">{timeAgo(msg.createdAt)}</span>
                              </div>
                              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                                {msg.message}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply Form */}
                    <form
                      className="flex gap-2 border-t border-slate-100 bg-slate-50/50 p-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        startReplyTransition(() => sendReply(ticket.id));
                      }}
                    >
                      <Input
                        value={replyTextByTicket[ticket.id] || ""}
                        onChange={(event) =>
                          setReplyTextByTicket((current) => ({ ...current, [ticket.id]: event.target.value }))
                        }
                        placeholder="Responder al ticket..."
                        className="flex-1"
                      />
                      <Button type="submit" variant="secondary" disabled={replyPending} className="shrink-0">
                        Enviar
                      </Button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })}
          {tickets.length === 0 ? (
            <div className="portal-card-premium p-10 text-center">
              <p className="text-sm text-slate-500">No tienes tickets de soporte aún.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
