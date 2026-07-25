"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { siteConfig } from "@/config/site";
import { HANDOFF_SIGNAL } from "@/lib/ai/handoff-signal";
import {
  ZYTERON_QUICK_PROMPTS,
  ZYTERON_WELCOME_MESSAGE,
} from "@/lib/ai/zyteron-knowledge";

const WHATSAPP_DIGITS = siteConfig.contact.phone.replace(/\D/g, "");

type ChatRole = "user" | "assistant";
type ChatMessage = { id: string; role: ChatRole; content: string };

const STORAGE_KEY = "zyteron_chat_history_v1";
const TEASER_DISMISSED_KEY = "zyteron_chat_teaser_dismissed_v1";

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function welcomeMessage(): ChatMessage {
  return { id: "welcome", role: "assistant", content: ZYTERON_WELCOME_MESSAGE };
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [readyForWhatsApp, setReadyForWhatsApp] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restaurar historial de la sesión.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      /* noop */
    }
  }, []);

  // Persistir historial de la sesión.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* noop */
    }
  }, [messages]);

  // Burbuja proactiva SIEMPRE visible (aparece de inmediato) mientras el chat
  // esté cerrado, salvo que el visitante la cierre manualmente en la sesión.
  useEffect(() => {
    if (open) {
      setShowTeaser(false);
      return;
    }
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(TEASER_DISMISSED_KEY) === "1";
    } catch {
      /* noop */
    }
    if (dismissed) return;
    // Pequeño retraso mínimo solo para el montaje del cliente.
    const timer = setTimeout(() => setShowTeaser(true), 300);
    return () => clearTimeout(timer);
  }, [open]);

  // Auto-scroll al final.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  // Auto-ajuste de altura del textarea para que se vea todo lo escrito.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input, open]);

  const dismissTeaser = useCallback(() => {
    setShowTeaser(false);
    try {
      sessionStorage.setItem(TEASER_DISMISSED_KEY, "1");
    } catch {
      /* noop */
    }
  }, []);

  const openPanel = useCallback(() => {
    setOpen(true);
    dismissTeaser();
    setTimeout(() => inputRef.current?.focus(), 120);
  }, [dismissTeaser]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: ChatMessage = { id: makeId(), role: "user", content: trimmed };
      const assistantId = makeId();

      const history = [...messages, userMsg];
      setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
      setInput("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            // Incluimos el saludo de bienvenida como primer turno del asistente
            // para que la IA sepa que YA saludó y no vuelva a presentarse.
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.body) throw new Error("no-body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          // La señal indica que el cliente ya está listo → mostrar botón WhatsApp.
          if (acc.includes(HANDOFF_SIGNAL)) setReadyForWhatsApp(true);
          const display = acc.split(HANDOFF_SIGNAL).join("");
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: display } : m)),
          );
        }

        if (!acc.trim()) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      "Disculpa, no pude generar una respuesta. ¿Puedes intentarlo nuevamente?",
                  }
                : m,
            ),
          );
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "Tuvimos un problema de conexión. Inténtalo otra vez en unos segundos, por favor.",
                }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, messages],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void sendMessage(input);
    },
    [input, sendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage(input);
      }
    },
    [input, sendMessage],
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const goToWhatsApp = useCallback(async () => {
    if (handoffLoading) return;
    setHandoffLoading(true);
    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));
    let text = "Hola, vengo del sitio web de Zyteron. Quiero cotizar un proyecto para mi empresa.";
    try {
      if (history.length > 0) {
        const res = await fetch("/api/chat/handoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });
        const data = (await res.json().catch(() => null)) as { text?: string } | null;
        if (data?.text) text = data.text;
      }
    } catch {
      /* usa el texto por defecto */
    } finally {
      setHandoffLoading(false);
    }
    const url = `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [handoffLoading, messages]);

  const showQuickPrompts = messages.filter((m) => m.role === "user").length === 0;

  return (
    <>
      {/* Panel de chat */}
      {open && (
        <div
          role="dialog"
          aria-label="Asistente virtual de Zyteron"
          className="fixed inset-x-3 bottom-3 z-50 flex h-[70vh] max-h-[620px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[600px] sm:w-[400px]"
        >
          {/* Encabezado */}
          <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold">Zara · Asistente Zyteron</p>
                <span className="flex items-center gap-1.5 text-[11px] text-blue-100">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  En línea ahora
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {isStreaming && messages[messages.length - 1]?.content === "" && (
              <div className="flex items-center gap-2 pl-1 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Escribiendo…</span>
              </div>
            )}

            {showQuickPrompts && (
              <div className="flex flex-wrap gap-2 pt-1">
                {ZYTERON_QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-left text-[12px] font-medium text-blue-700 transition-colors hover:border-blue-400 hover:bg-blue-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Entrada */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-slate-200 bg-white px-3 py-3"
          >
            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                placeholder="Escribe tu mensaje…"
                className="max-h-32 flex-1 resize-none overflow-y-auto bg-transparent text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                aria-label="Enviar mensaje"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            {readyForWhatsApp && (
              <button
                type="button"
                onClick={() => void goToWhatsApp()}
                disabled={handoffLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25d366] px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1ebe5b] disabled:opacity-70"
              >
                {handoffLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <WhatsAppIcon className="h-4 w-4 text-white" />
                )}
                {handoffLoading ? "Preparando tu mensaje…" : "Continuar por WhatsApp"}
              </button>
            )}
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Asistente con IA · Respuestas orientativas de Zyteron SpA
            </p>
          </form>
        </div>
      )}

      {/* Burbuja proactiva (siempre visible mientras el chat esté cerrado) */}
      {!open && showTeaser && (
        <div className="fixed bottom-[92px] right-4 z-40 w-[300px] max-w-[calc(100vw-2rem)] sm:bottom-28 sm:right-6 sm:w-[330px]">
          <button
            type="button"
            onClick={openPanel}
            className="group relative block w-full rounded-2xl rounded-br-md border border-slate-200 bg-white p-4 text-left shadow-2xl shadow-slate-900/15 transition-transform hover:scale-[1.01]"
          >
            <span
              role="button"
              tabIndex={0}
              aria-label="Cerrar mensaje"
              onClick={(e) => {
                e.stopPropagation();
                dismissTeaser();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  dismissTeaser();
                }
              }}
              className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </span>
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <Bot className="h-5 w-5" />
              </span>
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-blue-700">
                <Sparkles className="h-4 w-4" />
                Zara · Asistente Zyteron
              </span>
            </span>
            <span className="mt-2.5 block text-[15px] font-semibold leading-snug text-slate-800">
              Hola, ¿en qué te puedo ayudar hoy?
            </span>
            <span className="mt-1 block text-[13px] leading-snug text-slate-500">
              Cuéntame tu proyecto y te oriento con planes y precios al instante.
            </span>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white">
              <MessageCircle className="h-3.5 w-3.5" />
              Conversar ahora
            </span>
          </button>
        </div>
      )}

      {/* Botón lanzador */}
      {!open && (
        <button
          type="button"
          onClick={openPanel}
          aria-label="Abrir asistente virtual"
          className={cn(
            "fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full",
            "bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-all duration-200",
            "hover:scale-105 hover:bg-blue-700 sm:bottom-6 sm:right-6",
          )}
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </span>
        </button>
      )}
    </>
  );
}

function MessageBubble({ role, content }: { role: ChatRole; content: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <Bot className="h-4 w-4" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
          isUser
            ? "rounded-br-sm bg-blue-600 text-white"
            : "rounded-bl-sm border border-slate-200 bg-white text-slate-700",
        )}
      >
        {content}
      </div>
    </div>
  );
}
