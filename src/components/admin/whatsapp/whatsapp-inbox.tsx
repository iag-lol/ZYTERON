"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CircleAlert,
  ArrowLeft,
  Bot,
  Check,
  CheckCheck,
  CircleCheck,
  Clock,
  Copy,
  FileText,
  Hand,
  Info,
  Loader2,
  MessageCircle,
  Play,
  Search,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// -- Tipos (espejo del store del backend) -----------------------------------

type Conversation = {
  id: string;
  phone: string;
  customer_name: string | null;
  profile_name: string | null;
  last_message: string | null;
  last_message_type: string | null;
  last_message_at: string | null;
  unread_count: number;
  status: string;
  mode: string;
  assigned_user_id: string | null;
  lead_status: string;
  priority: string;
  email: string | null;
  company: string | null;
  industry: string | null;
  requested_service: string | null;
  estimated_budget: number | null;
  deadline: string | null;
  notes: string | null;
  tags: string[];
  window_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  direction: "in" | "out";
  sender_type: "customer" | "ai" | "human";
  message_type: string;
  content: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

type Note = { id: string; note: string; user_id: string | null; created_at: string };

type Filter = "todas" | "sin_leer" | "ai" | "human" | "assisted" | "cerradas" | "archivadas";

const LEAD_STATUSES = [
  ["nuevo", "Nuevo"],
  ["contactado", "Contactado"],
  ["calificado", "Calificado"],
  ["cotizacion_enviada", "Cotización enviada"],
  ["negociacion", "Negociación"],
  ["ganado", "Ganado"],
  ["perdido", "Perdido"],
] as const;

// -- Helpers ----------------------------------------------------------------

function initials(name?: string | null, phone?: string) {
  const base = (name || "").trim();
  if (base) return base.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (phone || "?").slice(-2);
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });
}

function StatusTicks({ status }: { status: string }) {
  if (status === "sending") return <Clock className="h-3 w-3 text-slate-300" />;
  if (status === "failed") return <CircleAlert className="h-3 w-3 text-rose-400" />;
  if (status === "read") return <CheckCheck className="h-3 w-3 text-sky-300" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-blue-100/70" />;
  if (status === "draft") return <Sparkles className="h-3 w-3 text-amber-300" />;
  return <Check className="h-3 w-3 text-blue-100/70" />;
}

function modeBadge(mode: string) {
  if (mode === "human") return { label: "Humano", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  if (mode === "assisted") return { label: "Asistido", cls: "bg-amber-50 text-amber-700 ring-amber-200" };
  return { label: "IA", cls: "bg-blue-50 text-blue-700 ring-blue-200" };
}

// -- Componente principal ----------------------------------------------------

export function WhatsappInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat" | "ficha">("list");
  const [realtimeOk, setRealtimeOk] = useState(true);
  const [usingRealtime, setUsingRealtime] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);

  // -- Carga inicial ---------------------------------------------------------
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp/conversations", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { conversations?: Conversation[] } | null;
      if (data?.conversations) setConversations(data.conversations);
    } catch {
      /* noop */
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  // -- Realtime + polling de respaldo ---------------------------------------
  useEffect(() => {
    let client;
    try {
      client = createSupabaseBrowserClient();
    } catch {
      // Sin credenciales públicas de Supabase en el navegador: usamos polling
      // (sin mostrar "Reconectando", porque el respaldo mantiene todo al día).
      setRealtimeOk(true);
      setUsingRealtime(false);
      const t = setInterval(() => void fetchConversations(), 10000);
      return () => clearInterval(t);
    }
    setUsingRealtime(true);

    const upsertConv = (row: Conversation) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === row.id);
        const next = idx >= 0 ? prev.map((c) => (c.id === row.id ? { ...c, ...row } : c)) : [row, ...prev];
        return next.sort(
          (a, b) =>
            new Date(b.last_message_at || b.created_at).getTime() -
            new Date(a.last_message_at || a.created_at).getTime(),
        );
      });
    };

    const channel = client
      .channel("whatsapp-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" }, (payload) => {
        if (payload.new && typeof payload.new === "object") upsertConv(payload.new as Conversation);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" }, (payload) => {
        const msg = payload.new as Message;
        if (msg.conversation_id === activeIdRef.current) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            // Reemplaza un temporal equivalente (optimista) si existe.
            const tempIdx = prev.findIndex(
              (m) => m.id.startsWith("temp-") && m.direction === msg.direction && m.content === msg.content,
            );
            if (tempIdx >= 0) {
              const copy = [...prev];
              copy[tempIdx] = msg;
              return copy;
            }
            return [...prev, msg];
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "whatsapp_messages" }, (payload) => {
        const msg = payload.new as Message;
        if (msg.conversation_id === activeIdRef.current) {
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
        }
      })
      .subscribe((status) => {
        setRealtimeOk(status === "SUBSCRIBED");
      });

    // Respaldo por polling (por si Realtime no está habilitado).
    const poll = setInterval(() => void fetchConversations(), 12000);

    return () => {
      clearInterval(poll);
      client.removeChannel(channel).catch(() => {});
    };
  }, [fetchConversations]);

  // -- Polling de la conversación activa (respaldo de Realtime) -------------
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;

    const refreshMessages = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/admin/whatsapp/conversations/${activeId}`, { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as { messages?: Message[] } | null;
        if (cancelled || !data?.messages) return;
        const server = data.messages;
        setMessages((prev) => {
          // Conserva mensajes optimistas (temp-) que el servidor aún no refleja.
          const temps = prev.filter(
            (m) => m.id.startsWith("temp-") && !server.some((s) => s.direction === m.direction && s.content === m.content),
          );
          return [...server, ...temps];
        });
      } catch {
        /* noop */
      }
    };

    const interval = setInterval(refreshMessages, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeId]);

  // -- Al abrir una conversación --------------------------------------------
  const openConversation = useCallback(async (id: string) => {
    setActiveId(id);
    setMobileView("chat");
    setLoadingChat(true);
    setMessages([]);
    setNotes([]);
    try {
      const [convRes, notesRes] = await Promise.all([
        fetch(`/api/admin/whatsapp/conversations/${id}`, { cache: "no-store" }),
        fetch(`/api/admin/whatsapp/conversations/${id}/notes`, { cache: "no-store" }),
      ]);
      const convData = (await convRes.json().catch(() => null)) as { messages?: Message[] } | null;
      const notesData = (await notesRes.json().catch(() => null)) as { notes?: Note[] } | null;
      if (convData?.messages) setMessages(convData.messages);
      if (notesData?.notes) setNotes(notesData.notes);
    } finally {
      setLoadingChat(false);
    }
    // Marcar como leída.
    fetch(`/api/admin/whatsapp/conversations/${id}/read`, { method: "POST" }).catch(() => {});
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Auto-scroll al último mensaje.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Auto-grow del textarea.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  // -- Enviar mensaje --------------------------------------------------------
  const windowOpen = active?.window_expires_at ? new Date(active.window_expires_at).getTime() > Date.now() : false;

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !active || sending) return;
    if (!windowOpen) return;

    const tempId = `temp-${Date.now()}`;
    const temp: Message = {
      id: tempId,
      conversation_id: active.id,
      direction: "out",
      sender_type: "human",
      message_type: "text",
      content: text,
      status: "sending",
      error_message: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/admin/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: active.id, message: text, type: "text" }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: data?.ok ? "sent" : "failed", error_message: data?.error ?? null } : m,
        ),
      );
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
    } finally {
      setSending(false);
    }
  }, [input, active, sending, windowOpen]);

  // -- Cambiar modo / estado -------------------------------------------------
  const patchConversation = useCallback(async (patch: Record<string, unknown>) => {
    const id = activeIdRef.current;
    if (!id) return;
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json().catch(() => null)) as { conversation?: Conversation } | null;
      if (data?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...data.conversation! } : c)));
      }
    } catch {
      /* noop */
    }
  }, []);

  // -- Filtro + búsqueda -----------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === "sin_leer" && c.unread_count <= 0) return false;
      if (filter === "ai" && c.mode !== "ai") return false;
      if (filter === "human" && c.mode !== "human") return false;
      if (filter === "assisted" && c.mode !== "assisted") return false;
      if (filter === "cerradas" && c.status !== "closed") return false;
      if (filter === "archivadas" && c.status !== "archived") return false;
      if (filter !== "cerradas" && filter !== "archivadas" && (c.status === "closed" || c.status === "archived")) {
        if (filter !== "todas") return false;
      }
      if (q) {
        const hay = `${c.customer_name ?? ""} ${c.profile_name ?? ""} ${c.phone} ${c.company ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [conversations, filter, search]);

  const totalUnread = useMemo(() => conversations.reduce((a, c) => a + (c.unread_count || 0), 0), [conversations]);

  return (
    <div className="flex h-[calc(100vh-9.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ===== Columna 1: Lista ===== */}
      <section
        className={cn(
          "flex w-full flex-col border-r border-slate-200 lg:w-[320px] xl:w-[360px]",
          mobileView === "list" ? "flex" : "hidden lg:flex",
        )}
      >
        <header className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              WhatsApp
              {totalUnread > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{totalUnread}</span>
              )}
            </h2>
            {usingRealtime && !realtimeOk && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600" title="Reconectando…">
                <Loader2 className="h-3 w-3 animate-spin" /> Reconectando
              </span>
            )}
          </div>
          <div className="relative mt-2.5">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="mt-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
            {(
              [
                ["todas", "Todas"],
                ["sin_leer", "Sin leer"],
                ["ai", "IA"],
                ["human", "Humano"],
                ["assisted", "Asistido"],
                ["cerradas", "Cerradas"],
              ] as [Filter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  filter === key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <ListSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState icon={<MessageCircle className="h-6 w-6" />} text="No hay conversaciones aquí." />
          ) : (
            filtered.map((c) => (
              <ConversationItem
                key={c.id}
                conv={c}
                active={c.id === activeId}
                onClick={() => void openConversation(c.id)}
              />
            ))
          )}
        </div>
      </section>

      {/* ===== Columna 2: Chat ===== */}
      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          mobileView === "chat" ? "flex" : "hidden lg:flex",
        )}
      >
        {!active ? (
          <EmptyState
            icon={<MessageCircle className="h-8 w-8" />}
            text="Selecciona una conversación para comenzar."
            big
          />
        ) : (
          <>
            <ChatHeader
              conv={active}
              onBack={() => setMobileView("list")}
              onOpenFicha={() => setMobileView("ficha")}
              onSetMode={(mode) => void patchConversation({ mode })}
              onClose={() => void patchConversation({ status: active.status === "closed" ? "open" : "closed" })}
            />

            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-5">
              {loadingChat ? (
                <ChatSkeleton />
              ) : messages.length === 0 ? (
                <EmptyState icon={<MessageCircle className="h-6 w-6" />} text="Sin mensajes todavía." />
              ) : (
                messages.map((m) => <MessageBubble key={m.id} msg={m} />)
              )}
            </div>

            <Composer
              disabled={!windowOpen}
              windowOpen={windowOpen}
              value={input}
              onChange={setInput}
              onSend={() => void sendMessage()}
              sending={sending}
              inputRef={inputRef}
            />
          </>
        )}
      </section>

      {/* ===== Columna 3: Ficha ===== */}
      <section
        className={cn(
          "w-full flex-col border-l border-slate-200 lg:flex lg:w-[300px] xl:w-[340px]",
          mobileView === "ficha" ? "flex" : "hidden",
        )}
      >
        {active ? (
          <FichaPanel
            conv={active}
            notes={notes}
            onBack={() => setMobileView("chat")}
            onPatch={(patch) => void patchConversation(patch)}
            onAddNote={async (note) => {
              const res = await fetch(`/api/admin/whatsapp/conversations/${active.id}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note }),
              });
              const data = (await res.json().catch(() => null)) as { note?: Note } | null;
              if (data?.note) setNotes((prev) => [data.note!, ...prev]);
            }}
          />
        ) : (
          <EmptyState icon={<Info className="h-6 w-6" />} text="Ficha del cliente" />
        )}
      </section>
    </div>
  );
}

// -- Subcomponentes ----------------------------------------------------------

function ConversationItem({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  const badge = modeBadge(conv.mode);
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 border-b border-slate-100 px-3 py-3 text-left transition-colors",
        active ? "bg-blue-50" : "hover:bg-slate-50",
      )}
    >
      <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[13px] font-bold text-white">
        {initials(conv.customer_name || conv.profile_name, conv.phone)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[13.5px] font-semibold text-slate-800">
            {conv.customer_name || conv.profile_name || `+${conv.phone}`}
          </span>
          <span className="shrink-0 text-[11px] text-slate-400">{formatTime(conv.last_message_at)}</span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-[12px] text-slate-500">{conv.last_message || "—"}</span>
          {conv.unread_count > 0 && (
            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
              {conv.unread_count}
            </span>
          )}
        </span>
        <span className="mt-1 flex items-center gap-1.5">
          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold ring-1", badge.cls)}>{badge.label}</span>
          {conv.status === "closed" && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">Cerrada</span>
          )}
        </span>
      </span>
    </button>
  );
}

function ChatHeader({
  conv,
  onBack,
  onOpenFicha,
  onSetMode,
  onClose,
}: {
  conv: Conversation;
  onBack: () => void;
  onOpenFicha: () => void;
  onSetMode: (mode: string) => void;
  onClose: () => void;
}) {
  const windowOpen = conv.window_expires_at ? new Date(conv.window_expires_at).getTime() > Date.now() : false;
  return (
    <header className="flex flex-col gap-2 border-b border-slate-200 px-3 py-2.5 sm:px-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[12px] font-bold text-white">
          {initials(conv.customer_name || conv.profile_name, conv.phone)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-slate-800">
            {conv.customer_name || conv.profile_name || `+${conv.phone}`}
          </p>
          <p className="text-[11px] text-slate-400">
            +{conv.phone} ·{" "}
            {windowOpen ? (
              <span className="text-emerald-600">Ventana abierta</span>
            ) : (
              <span className="text-amber-600">Ventana cerrada (24h)</span>
            )}
          </p>
        </div>
        <button onClick={onOpenFicha} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden">
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Control de IA */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          ["ai", "IA activa", Bot],
          ["assisted", "Asistido", Sparkles],
          ["human", "Humano", Hand],
        ].map(([mode, label, Icon]) => {
          const IconC = Icon as typeof Bot;
          const activeMode = conv.mode === mode;
          return (
            <button
              key={mode as string}
              onClick={() => onSetMode(mode as string)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
                activeMode ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              <IconC className="h-3.5 w-3.5" />
              {label as string}
            </button>
          );
        })}
        <div className="mx-1 h-4 w-px bg-slate-200" />
        <button
          onClick={onClose}
          className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-200"
        >
          {conv.status === "closed" ? <Play className="h-3.5 w-3.5" /> : <CircleCheck className="h-3.5 w-3.5" />}
          {conv.status === "closed" ? "Reabrir" : "Cerrar"}
        </button>
      </div>
    </header>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isOut = msg.direction === "out";
  const senderLabel = msg.sender_type === "ai" ? "IA" : msg.sender_type === "human" ? "Ejecutivo" : "";
  return (
    <div className={cn("flex", isOut ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-[13.5px] leading-relaxed shadow-sm",
          isOut
            ? msg.sender_type === "ai"
              ? "rounded-br-sm bg-blue-500 text-white"
              : "rounded-br-sm bg-emerald-600 text-white"
            : "rounded-bl-sm border border-slate-200 bg-white text-slate-700",
        )}
      >
        {isOut && senderLabel && (
          <span className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold opacity-80">
            {msg.sender_type === "ai" ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
            {senderLabel}
            {msg.status === "draft" && " · borrador"}
          </span>
        )}
        {msg.message_type !== "text" && (
          <span className="mb-0.5 block text-[11px] font-semibold uppercase opacity-70">[{msg.message_type}]</span>
        )}
        <span className="whitespace-pre-wrap break-words">{msg.content}</span>
        <span className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10px]", isOut ? "text-white/80" : "text-slate-400")}>
          {formatTime(msg.created_at)}
          {isOut && <StatusTicks status={msg.status} />}
        </span>
        {msg.status === "failed" && msg.error_message && (
          <span className="mt-0.5 block text-[10px] text-rose-200">{msg.error_message}</span>
        )}
      </div>
    </div>
  );
}

function Composer({
  disabled,
  windowOpen,
  value,
  onChange,
  onSend,
  sending,
  inputRef,
}: {
  disabled: boolean;
  windowOpen: boolean;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="border-t border-slate-200 bg-white px-3 py-2.5 sm:px-4">
      {!windowOpen && (
        <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
          <Clock className="h-3.5 w-3.5" />
          Ventana de 24h cerrada. Solo se pueden enviar plantillas aprobadas hasta que el cliente escriba.
        </p>
      )}
      <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          disabled={disabled}
          maxLength={4000}
          placeholder={disabled ? "Mensaje libre no disponible (ventana cerrada)" : "Escribe un mensaje…"}
          className="max-h-36 flex-1 resize-none overflow-y-auto bg-transparent text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
        />
        <button
          onClick={onSend}
          disabled={disabled || sending || !value.trim()}
          aria-label="Enviar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function FichaPanel({
  conv,
  notes,
  onBack,
  onPatch,
  onAddNote,
}: {
  conv: Conversation;
  notes: Note[];
  onBack: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onAddNote: (note: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
    customer_name: conv.customer_name ?? "",
    email: conv.email ?? "",
    company: conv.company ?? "",
    industry: conv.industry ?? "",
    requested_service: conv.requested_service ?? "",
    estimated_budget: conv.estimated_budget?.toString() ?? "",
    deadline: conv.deadline ?? "",
  });
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    setForm({
      customer_name: conv.customer_name ?? "",
      email: conv.email ?? "",
      company: conv.company ?? "",
      industry: conv.industry ?? "",
      requested_service: conv.requested_service ?? "",
      estimated_budget: conv.estimated_budget?.toString() ?? "",
      deadline: conv.deadline ?? "",
    });
  }, [conv.id, conv.customer_name, conv.email, conv.company, conv.industry, conv.requested_service, conv.estimated_budget, conv.deadline]);

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <label className="block">
      <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        onBlur={() => {
          const value = key === "estimated_budget" ? Number(form[key]) || null : form[key] || null;
          onPatch({ [key]: value });
        }}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-bold text-slate-900">Ficha del cliente</h3>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {/* Acciones rápidas */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => navigator.clipboard?.writeText(`+${conv.phone}`).catch(() => {})}
            className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar teléfono
          </button>
          <Link
            href={`/admin/cotizaciones/nueva?phone=${conv.phone}&name=${encodeURIComponent(conv.customer_name || conv.profile_name || "")}`}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
          >
            <FileText className="h-3.5 w-3.5" /> Crear cotización
          </Link>
        </div>

        {/* Estado del lead + prioridad */}
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-500">Estado del lead</span>
            <select
              value={conv.lead_status}
              onChange={(e) => onPatch({ lead_status: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] font-medium text-slate-700 focus:border-blue-400 focus:outline-none"
            >
              {LEAD_STATUSES.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-500">Prioridad</span>
            <select
              value={conv.priority}
              onChange={(e) => onPatch({ priority: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] font-medium text-slate-700 focus:border-blue-400 focus:outline-none"
            >
              <option value="baja">Baja</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </label>
        </div>

        {/* Campos editables */}
        <div className="space-y-2.5">
          {field("Nombre", "customer_name")}
          <div className="block">
            <span className="text-[11px] font-semibold text-slate-500">Teléfono</span>
            <p className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[13px] text-slate-600">+{conv.phone}</p>
          </div>
          {field("Correo", "email", "email")}
          {field("Empresa", "company")}
          {field("Rubro", "industry")}
          {field("Servicio solicitado", "requested_service")}
          {field("Presupuesto estimado (CLP)", "estimated_budget", "number")}
          {field("Plazo", "deadline")}
        </div>

        {/* Notas internas */}
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Notas internas</p>
          <div className="flex gap-1.5">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Agregar nota…"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              onClick={async () => {
                if (!noteText.trim() || savingNote) return;
                setSavingNote(true);
                await onAddNote(noteText.trim());
                setNoteText("");
                setSavingNote(false);
              }}
              disabled={savingNote || !noteText.trim()}
              className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Agregar"}
            </button>
          </div>
          <div className="mt-2 space-y-1.5">
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                <p className="text-[12px] text-slate-700">{n.note}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{formatTime(n.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Estados de carga / vacío ------------------------------------------------

function ListSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-slate-200" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-2.5 w-full animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="space-y-3 p-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
          <div className={cn("h-10 animate-pulse rounded-2xl bg-slate-200", i % 2 ? "w-40" : "w-52")} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, text, big }: { icon: React.ReactNode; text: string; big?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 text-center text-slate-400", big ? "h-full" : "py-14")}>
      <span className="text-slate-300">{icon}</span>
      <p className="text-[13px]">{text}</p>
    </div>
  );
}
