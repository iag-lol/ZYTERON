"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnchorHTMLAttributes, HTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string };
type Thread = { id: string; title: string; messages: Msg[]; updatedAt: number };

const STORAGE_KEY = "zyteron_admin_ai_threads_v2";
const ACTIVE_KEY = "zyteron_admin_ai_active_v2";
const DEFAULT_TITLE = "Nueva conversación";

const QUICK_PROMPTS = [
  "¿Cómo va el negocio este mes?",
  "Genera una cotización de ecommerce con carrito, pagos y stock para una pyme.",
  "Muéstrame las cotizaciones pendientes.",
  "Busca los últimos leads que llegaron.",
];

const WELCOME =
  "Soy Zyra Admin, tu asistente de inteligencia comercial. Puedo generar propuestas con precios competitivos, crear borradores de cotización y consultar datos reales del sistema (leads, cotizaciones, ventas, clientes y WhatsApp). ¿En qué te ayudo?";

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function newThread(): Thread {
  return {
    id: makeId(),
    title: DEFAULT_TITLE,
    messages: [{ id: "welcome", role: "assistant", content: WELCOME }],
    updatedAt: Date.now(),
  };
}

const MARKDOWN_COMPONENTS = {
  h1: (p: HTMLAttributes<HTMLHeadingElement>) => <h3 className="mt-2 mb-1 text-[15px] font-bold text-slate-900" {...p} />,
  h2: (p: HTMLAttributes<HTMLHeadingElement>) => <h3 className="mt-2 mb-1 text-[15px] font-bold text-slate-900" {...p} />,
  h3: (p: HTMLAttributes<HTMLHeadingElement>) => <h4 className="mt-2 mb-1 text-[14px] font-bold text-slate-900" {...p} />,
  p: (p: HTMLAttributes<HTMLParagraphElement>) => <p className="my-1.5" {...p} />,
  ul: (p: HTMLAttributes<HTMLUListElement>) => <ul className="my-1.5 list-disc space-y-1 pl-5" {...p} />,
  ol: (p: HTMLAttributes<HTMLOListElement>) => <ol className="my-1.5 list-decimal space-y-1 pl-5" {...p} />,
  li: (p: HTMLAttributes<HTMLLIElement>) => <li className="marker:text-slate-400" {...p} />,
  strong: (p: HTMLAttributes<HTMLElement>) => <strong className="font-bold text-slate-900" {...p} />,
  a: (p: AnchorHTMLAttributes<HTMLAnchorElement>) => <a className="font-medium text-blue-600 underline" {...p} />,
  code: (p: HTMLAttributes<HTMLElement>) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px] text-slate-800" {...p} />
  ),
};

export function AdminAiConsole() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hydrated = useRef(false);

  const active = threads.find((t) => t.id === activeId) ?? null;

  // Cargar historial desde localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Thread[]) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setThreads(parsed);
        const savedActive = localStorage.getItem(ACTIVE_KEY);
        setActiveId(savedActive && parsed.some((t) => t.id === savedActive) ? savedActive : parsed[0]!.id);
      } else {
        const t = newThread();
        setThreads([t]);
        setActiveId(t.id);
      }
    } catch {
      const t = newThread();
      setThreads([t]);
      setActiveId(t.id);
    }
    hydrated.current = true;
  }, []);

  // Persistir.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads.slice(0, 50)));
      if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {
      /* noop */
    }
  }, [threads, activeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const patchThread = useCallback((id: string, updater: (t: Thread) => Thread) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  }, []);

  const createThread = useCallback(() => {
    const t = newThread();
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const deleteThread = useCallback(
    (id: string) => {
      if (!window.confirm("¿Eliminar esta conversación del historial?")) return;
      setThreads((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (next.length === 0) {
          const t = newThread();
          setActiveId(t.id);
          return [t];
        }
        if (id === activeId) setActiveId(next[0]!.id);
        return next;
      });
    },
    [activeId],
  );

  const renameThread = useCallback(
    (id: string) => {
      const current = threads.find((t) => t.id === id);
      const name = window.prompt("Nombre de la conversación (ej: cliente o proyecto):", current?.title ?? "");
      if (name === null) return;
      patchThread(id, (t) => ({ ...t, title: name.trim() || DEFAULT_TITLE }));
    },
    [threads, patchThread],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || !active) return;

      const threadId = active.id;
      const userMsg: Msg = { id: makeId(), role: "user", content: trimmed };
      const assistantId = makeId();
      const isFirstUser = active.messages.filter((m) => m.role === "user").length === 0;

      patchThread(threadId, (t) => ({
        ...t,
        title: isFirstUser && t.title === DEFAULT_TITLE ? trimmed.slice(0, 42) : t.title,
        messages: [...t.messages, userMsg, { id: assistantId, role: "assistant", content: "" }],
        updatedAt: Date.now(),
      }));
      setInput("");
      setIsStreaming(true);

      const history = [...active.messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch("/api/admin/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });
        if (!res.body) throw new Error("no-body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          patchThread(threadId, (t) => ({
            ...t,
            messages: t.messages.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
          }));
        }
        if (!acc.trim()) {
          patchThread(threadId, (t) => ({
            ...t,
            messages: t.messages.map((m) =>
              m.id === assistantId ? { ...m, content: "No pude generar una respuesta. Intenta nuevamente." } : m,
            ),
          }));
        }
        if (/cotizaci[oó]n cread|aparece en \/admin\/cotizaciones/i.test(acc)) router.refresh();
      } catch {
        patchThread(threadId, (t) => ({
          ...t,
          messages: t.messages.map((m) =>
            m.id === assistantId ? { ...m, content: "Hubo un problema de conexión. Intenta nuevamente." } : m,
          ),
        }));
      } finally {
        setIsStreaming(false);
        patchThread(threadId, (t) => ({ ...t, updatedAt: Date.now() }));
        setTimeout(() => inputRef.current?.focus(), 60);
      }
    },
    [active, isStreaming, patchThread, router],
  );

  const showQuick = !!active && active.messages.filter((m) => m.role === "user").length === 0;
  const filteredThreads = threads.filter((t) => t.title.toLowerCase().includes(threadSearch.trim().toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-11rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Backdrop móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== Sidebar de conversaciones ===== */}
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-slate-50 transition-transform lg:static lg:z-auto lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-3">
          <button
            onClick={createThread}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nueva conversación
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative px-3 pt-3">
          <Search className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={threadSearch}
            onChange={(e) => setThreadSearch(e.target.value)}
            placeholder="Buscar en el historial…"
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {filteredThreads.map((t) => (
            <div
              key={t.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors",
                t.id === activeId ? "bg-white shadow-sm ring-1 ring-slate-200" : "hover:bg-white/70",
              )}
            >
              <button
                onClick={() => {
                  setActiveId(t.id);
                  setSidebarOpen(false);
                }}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <MessageSquare className={cn("h-4 w-4 shrink-0", t.id === activeId ? "text-blue-600" : "text-slate-400")} />
                <span className="truncate text-[13px] font-medium text-slate-700">{t.title}</span>
              </button>
              <button
                onClick={() => renameThread(t.id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-300 opacity-0 transition-opacity hover:text-slate-600 group-hover:opacity-100"
                title="Renombrar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => deleteThread(t.id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-300 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100"
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {filteredThreads.length === 0 && (
            <p className="px-2 py-6 text-center text-[12px] text-slate-400">Sin conversaciones.</p>
          )}
        </div>
      </aside>

      {/* ===== Chat ===== */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 text-white">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 lg:hidden"
            aria-label="Historial"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">{active?.title || "Zyra Admin"}</p>
            <p className="text-[11px] text-blue-100">Inteligencia comercial · conectado a tus datos</p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-3 py-5 sm:px-6">
          {active?.messages.map((m) => (
            <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed",
                  m.role === "user"
                    ? "rounded-br-sm bg-blue-600 text-white"
                    : "rounded-bl-sm border border-slate-200 bg-white text-slate-700",
                )}
              >
                {m.role === "assistant" ? (
                  <div className="space-y-2">
                    <ReactMarkdown components={MARKDOWN_COMPONENTS}>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
              </div>
              {m.role === "user" && (
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                  <User className="h-4 w-4" />
                </span>
              )}
            </div>
          ))}
          {isStreaming && active?.messages[active.messages.length - 1]?.content === "" && (
            <div className="flex items-center gap-2 pl-11 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Analizando…</span>
            </div>
          )}

          {showQuick && (
            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => void send(p)}
                  className="rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-left text-[13px] font-medium text-blue-700 transition-colors hover:border-blue-400 hover:bg-blue-50"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="border-t border-slate-200 bg-white px-3 py-3 sm:px-6"
        >
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              maxLength={6000}
              placeholder="Pide una cotización, un análisis o un dato del negocio…"
              className="max-h-40 flex-1 resize-none overflow-y-auto bg-transparent text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              aria-label="Enviar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-400">
            Uso interno · consulta datos reales y crea borradores de cotización
          </p>
        </form>
      </section>
    </div>
  );
}
