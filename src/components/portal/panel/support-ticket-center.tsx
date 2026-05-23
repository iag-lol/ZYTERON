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
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "SOPORTE",
    priority: "NORMAL",
    projectId: "",
  });
  const [replyTextByTicket, setReplyTextByTicket] = useState<Record<string, string>>({});

  async function createTicket() {
    setError("");
    const response = await fetch("/api/portal/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || "No se pudo crear el ticket.");
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
      setError(payload?.error || "No se pudo enviar el mensaje.");
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
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

          <Button type="submit" className="h-10 bg-blue-700 hover:bg-blue-800" disabled={pending}>
            {pending ? "Creando..." : "Crear ticket"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Historial de tickets</h3>
        <div className="mt-4 space-y-3">
          {tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{ticket.title}</p>
                  <p className="text-xs text-slate-500">
                    {ticket.category || "General"} · {ticket.priority} · {ticket.status}
                  </p>
                </div>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {ticket.status}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {ticket.messages.map((msg) => (
                  <div key={msg.id} className={`rounded-lg px-3 py-2 text-sm ${msg.authorRole === "CLIENT" ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-blue-800"}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-widest">
                      {msg.authorRole === "CLIENT" ? "Tú" : "Zyteron"}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{msg.message}</p>
                  </div>
                ))}
              </div>

              <form
                className="mt-3 flex gap-2"
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
                  placeholder="Agregar mensaje al ticket..."
                />
                <Button type="submit" variant="secondary" disabled={replyPending}>
                  Enviar
                </Button>
              </form>
            </article>
          ))}
          {tickets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-3 py-10 text-center text-sm text-slate-500">
              No tienes tickets de soporte aún.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

