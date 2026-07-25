"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnchorHTMLAttributes, HTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string };

const QUICK_PROMPTS = [
  "Genera una cotización para una pyme que quiere ecommerce con carrito, pagos y gestión de stock.",
  "Cotiza un asistente IA de ventas para una clínica, con panel de prospectos.",
  "¿Qué precio competitivo propondrías para un sistema web con reservas y panel completo?",
  "Arma una propuesta para un cliente que quiere web profesional + SEO + mantención mensual.",
];

const WELCOME =
  "Soy Zyra Admin, tu asistente de inteligencia comercial. Puedo generar propuestas de cotización con precios competitivos, analizar requerimientos y crear borradores en el sistema. ¿Qué necesitas cotizar o analizar?";

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Estilos explícitos para el markdown (no dependemos del plugin typography).
const MARKDOWN_COMPONENTS = {
  h1: (p: HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-2 mb-1 text-[15px] font-bold text-slate-900" {...p} />
  ),
  h2: (p: HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-2 mb-1 text-[15px] font-bold text-slate-900" {...p} />
  ),
  h3: (p: HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className="mt-2 mb-1 text-[14px] font-bold text-slate-900" {...p} />
  ),
  p: (p: HTMLAttributes<HTMLParagraphElement>) => <p className="my-1.5" {...p} />,
  ul: (p: HTMLAttributes<HTMLUListElement>) => <ul className="my-1.5 list-disc space-y-1 pl-5" {...p} />,
  ol: (p: HTMLAttributes<HTMLOListElement>) => <ol className="my-1.5 list-decimal space-y-1 pl-5" {...p} />,
  li: (p: HTMLAttributes<HTMLLIElement>) => <li className="marker:text-slate-400" {...p} />,
  strong: (p: HTMLAttributes<HTMLElement>) => <strong className="font-bold text-slate-900" {...p} />,
  a: (p: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="font-medium text-blue-600 underline" {...p} />
  ),
  code: (p: HTMLAttributes<HTMLElement>) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px] text-slate-800" {...p} />
  ),
};

export function AdminAiConsole() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([{ id: "welcome", role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: Msg = { id: makeId(), role: "user", content: trimmed };
      const assistantId = makeId();
      const history = [...messages, userMsg];
      setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
      setInput("");
      setIsStreaming(true);

      try {
        const res = await fetch("/api/admin/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history
              .filter((m) => m.id !== "welcome")
              .map((m) => ({ role: m.role, content: m.content })),
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
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)));
        }
        if (!acc.trim()) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: "No pude generar una respuesta. Intenta nuevamente." } : m,
            ),
          );
        }
        // Si creó una cotización, refrescamos para que aparezca en el panel.
        if (/cotizaci[oó]n cread|aparece en \/admin\/cotizaciones/i.test(acc)) {
          router.refresh();
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Hubo un problema de conexión. Intenta nuevamente en unos segundos." }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
        setTimeout(() => inputRef.current?.focus(), 60);
      }
    },
    [isStreaming, messages, router],
  );

  const showQuick = messages.filter((m) => m.role === "user").length === 0;

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-3 text-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Zyra Admin · Inteligencia comercial</p>
          <p className="text-[11px] text-blue-100">Genera propuestas, analiza y crea borradores de cotización</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6">
        {messages.map((m) => (
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
        {isStreaming && messages[messages.length - 1]?.content === "" && (
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
                type="button"
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
        className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6"
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
            placeholder="Pídeme una cotización, un análisis o una recomendación de precio…"
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
          Uso interno · Zyra Admin puede crear borradores de cotización en el sistema
        </p>
      </form>
    </div>
  );
}
