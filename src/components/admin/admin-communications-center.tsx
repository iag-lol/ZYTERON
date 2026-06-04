"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { ArrowUp, Mail, MessageCircle, RefreshCw, Send, User, Zap } from "lucide-react";

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

export function AdminCommunicationsCenter({
  userId,
  initialCommunications,
}: {
  userId: string;
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
      const response = await fetch(`/api/portal/admin/users/${userId}/communications`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.communications)) {
          setCommunications(data.communications);
        }
      }
    } catch {
      // Silent fail
    }
  }, [userId]);

  useEffect(() => {
    const interval = setInterval(refreshComms, 15000);
    return () => clearInterval(interval);
  }, [refreshComms]);

  // Group communications by subject (threading)
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

    const response = await fetch(`/api/portal/admin/users/${userId}/communications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message, direction: "OUTBOUND", channel: "PORTAL" }),
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

  // Auto scroll
  useEffect(() => {
    if (activeThread && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThread?.messages.length]);

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] min-h-[500px]">
      {/* ── Thread List ── */}
      <div className="flex flex-col space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Bandeja del cliente</h3>
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800"
            >
              <Send className="h-3 w-3" />
              Nuevo
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
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5 animate-slide-in-up"
          >
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Asunto"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={3}
              placeholder="Mensaje para el cliente..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            {error ? <p className="text-[11px] font-semibold text-rose-600">{error}</p> : null}
            {success ? <p className="text-[11px] font-semibold text-emerald-600">{success}</p> : null}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="h-8 flex-1 rounded-lg bg-blue-700 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
              >
                {pending ? "Enviando..." : "Enviar nuevo hilo"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {threads.length === 0 ? (
            <div className="p-6 text-center">
              <MessageCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Sin mensajes</p>
              <p className="text-xs text-slate-500">No hay comunicaciones con este cliente.</p>
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.key}
                type="button"
                onClick={() => setSelectedThread(thread.key)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedThread === thread.key
                    ? "border-blue-300 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{thread.subject}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{thread.lastMessage.message}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-slate-400">{timeAgo(thread.lastMessage.createdAt)}</p>
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <span className={`inline-block h-2 w-2 rounded-full ${
                        thread.lastMessage.direction === "INBOUND" ? "bg-amber-400" : "bg-blue-500"
                      }`} title={thread.lastMessage.direction} />
                      <span className="text-[10px] font-medium text-slate-400">{thread.messages.length}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Thread Detail ── */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {activeThread ? (
          <>
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-bold text-slate-900">{activeThread.subject}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeThread.messages.length} mensajes en este hilo
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              {activeThread.messages.map((msg, idx) => {
                const isClient = msg.direction === "INBOUND";
                // Admin point of view: 
                // Client = INBOUND (left, gray)
                // Admin = OUTBOUND (right, blue)
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isClient ? "justify-start" : "justify-end"}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      isClient 
                        ? "rounded-tl-sm bg-white border border-slate-200 text-slate-700" 
                        : "rounded-tr-sm bg-blue-600 text-white"
                    }`}>
                      <div className="mb-1 flex items-center gap-1.5 opacity-80">
                        {isClient ? <User className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {isClient ? "Cliente" : "Zyteron (Tú)"}
                        </span>
                      </div>
                      <p className="whitespace-pre-line leading-relaxed">
                        {msg.message}
                      </p>
                      <p className={`mt-1.5 text-[10px] text-right ${isClient ? "text-slate-400" : "text-blue-200"}`}>
                        {formatFullDate(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setNewSubject(activeThread.subject);
                startTransition(sendMessage);
              }}
              className="border-t border-slate-100 bg-white p-3"
            >
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    setNewSubject(activeThread.subject);
                  }}
                  placeholder="Responder al cliente..."
                  className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button
                  type="submit"
                  disabled={pending || newMessage.trim().length < 5}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-500">
            <Mail className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm font-semibold">Bandeja de entrada</p>
            <p className="text-xs">Selecciona un mensaje para responder al cliente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
