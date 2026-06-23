"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import {
  ArrowUp,
  Mail,
  MessageCircle,
  RefreshCw,
  Send,
  User,
  Zap,
} from "lucide-react";

type CommunicationItem = {
  id: string;
  subject: string;
  message: string;
  direction: string;
  channel: string;
  createdAt: string;
};

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Justo ahora";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CommunicationsCenter({
  initialCommunications,
}: {
  initialCommunications: CommunicationItem[];
}) {
  const [communications, setCommunications] = useState(initialCommunications);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-refresh every 15 seconds
  const refreshComms = useCallback(async () => {
    try {
      const response = await fetch("/api/portal/communications");
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.communications)) {
          setCommunications(data.communications);
        }
      }
    } catch {
      // Silent fail on polling
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshComms, 15000);
    return () => clearInterval(interval);
  }, [refreshComms]);

  // Group communications as "threads" by subject
  const threadMap = new Map<string, CommunicationItem[]>();
  for (const comm of communications) {
    const key = comm.subject.toLowerCase().trim();
    if (!threadMap.has(key)) {
      threadMap.set(key, []);
    }
    threadMap.get(key)!.push(comm);
  }
  const threads = Array.from(threadMap.entries()).map(([key, items]) => ({
    key,
    subject: items[0].subject,
    messages: items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    lastMessage: items[items.length - 1],
    hasInbound: items.some((i) => i.direction === "INBOUND"),
    hasOutbound: items.some((i) => i.direction === "OUTBOUND"),
  }));
  threads.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const activeThread = selectedThread ? threads.find((t) => t.key === selectedThread) : null;

  async function sendMessage() {
    setError("");
    setSuccess("");
    const subject = newSubject.trim();
    const message = newMessage.trim();
    if (subject.length < 3) {
      setError("El asunto debe tener al menos 3 caracteres.");
      return;
    }
    if (message.length < 5) {
      setError("El mensaje debe tener al menos 5 caracteres.");
      return;
    }

    const response = await fetch("/api/portal/communications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || "No se pudo enviar el mensaje.");
      return;
    }

    setSuccess("Mensaje enviado correctamente.");
    setNewSubject("");
    setNewMessage("");
    setShowForm(false);
    refreshComms();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      {/* ── Thread List ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Conversaciones</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshComms}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              title="Actualizar"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 btn-primary-glow"
            >
              <Send className="h-3.5 w-3.5" />
              Nuevo mensaje
            </button>
          </div>
        </div>

        {/* New Message Form */}
        {showForm ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(sendMessage);
            }}
            className="portal-card-premium space-y-3 p-4 animate-slide-in-up"
          >
            <div>
              <label htmlFor="comm-subject" className="text-xs font-semibold text-slate-700">
                Asunto
              </label>
              <input
                id="comm-subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Ej: Consulta sobre mi proyecto"
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label htmlFor="comm-message" className="text-xs font-semibold text-slate-700">
                Mensaje
              </label>
              <textarea
                id="comm-message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={4}
                placeholder="Escribe tu mensaje al equipo Zyteron..."
                className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            ) : null}
            {success ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="h-10 flex-1 rounded-xl bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
              >
                {pending ? "Enviando..." : "Enviar mensaje"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {/* Thread List */}
        <div className="space-y-2">
          {threads.length === 0 ? (
            <div className="portal-card-premium p-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Sin conversaciones</p>
              <p className="mt-1 text-xs text-slate-500">
                Envía tu primer mensaje al equipo de Zyteron
              </p>
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.key}
                type="button"
                onClick={() => setSelectedThread(thread.key)}
                className={`w-full rounded-xl border p-3.5 text-left transition ${
                  selectedThread === thread.key
                    ? "border-blue-300 bg-blue-50/80 shadow-sm"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{thread.subject}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      {thread.lastMessage.message}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-slate-400">{timeAgo(thread.lastMessage.createdAt)}</p>
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <span className={`inline-block h-2 w-2 rounded-full ${
                        thread.lastMessage.direction === "OUTBOUND" ? "bg-blue-500" : "bg-emerald-500"
                      }`} />
                      <span className="text-[10px] text-slate-400">{thread.messages.length}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Thread Detail ── */}
      <div className="portal-card-premium overflow-hidden">
        {activeThread ? (
          <>
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <p className="text-sm font-bold text-slate-900">{activeThread.subject}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeThread.messages.length} mensajes en esta conversación
              </p>
            </div>
            <div className="max-h-[460px] overflow-y-auto p-5 space-y-3">
              {activeThread.messages.map((msg, idx) => {
                const isClient = msg.direction === "INBOUND";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isClient ? "justify-end" : "justify-start"} animate-slide-in-up`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className={`max-w-[85%] ${isClient ? "chat-bubble-client" : "chat-bubble-admin"}`}>
                      <div className="mb-1 flex items-center gap-1.5">
                        {isClient ? (
                          <User className="h-3 w-3 text-blue-500" />
                        ) : (
                          <Zap className="h-3 w-3 text-slate-500" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {isClient ? "Tú" : "Zyteron"}
                        </span>
                      </div>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                        {msg.message}
                      </p>
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        {formatFullDate(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            {/* Quick Reply */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setNewSubject(activeThread.subject);
                startTransition(sendMessage);
              }}
              className="border-t border-slate-100 bg-slate-50/50 p-4"
            >
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    setNewSubject(activeThread.subject);
                  }}
                  placeholder="Responder al hilo..."
                  className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  disabled={pending || newMessage.trim().length < 5}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
              <Mail className="h-7 w-7 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Selecciona una conversación</p>
            <p className="mt-1 max-w-xs text-xs text-slate-500">
              Elige un hilo del panel izquierdo para ver los mensajes, o inicia una nueva conversación.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
