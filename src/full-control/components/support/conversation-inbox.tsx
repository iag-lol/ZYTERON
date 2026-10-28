"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  CheckCheck,
  ChevronDown,
  Info,
  LoaderCircle,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  X,
} from "lucide-react";
import {
  inboxAttention,
  inboxChannel,
  inboxDate,
  inboxUnread,
  mergeInboxMessages,
  refreshInboxDetail,
  type InboxConversation,
  type InboxDetail,
} from "@/lib/inbox/model";
import { subscribeContactLive } from "@/lib/whatsapp/live-events";
import { useAccess } from "@control/components/access-context";
import { supportApi } from "@control/lib/support-api";
import styles from "./conversation-inbox.module.css";

type Filter = "all" | "web" | "unread" | "waiting" | "ai";
const filters: Array<[Filter, string]> = [
  ["all", "Todas"],
  ["web", "Chat web"],
  ["unread", "Sin leer"],
  ["waiting", "Por responder"],
  ["ai", "IA activa"],
];
async function request<T>(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || result.message || "No fue posible completar la acción.");
  return result as T;
}
const endpoint = (key: string) => `/api/admin/inbox/${key}`;
function Avatar({ row }: { row: InboxConversation }) {
  return (
    <span className={styles.avatar}>
      {row.name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}
export function ConversationInbox({ initialId }: { initialId?: string }) {
  const { role } = useAccess();
  const [items, setItems] = useState<InboxConversation[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [detail, setDetail] = useState<InboxDetail | null>(null);
  const [filter, setFilter] = useState<Filter>("all"),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true),
    [opening, setOpening] = useState(false),
    [older, setOlder] = useState(false),
    [sending, setSending] = useState(false),
    [error, setError] = useState(""),
    [listError, setListError] = useState(""),
    [info, setInfo] = useState(false),
    [note, setNote] = useState(false),
    [drafts, setDrafts] = useState<Record<string, string>>({}),
    [newMessages, setNewMessages] = useState(false);
  const cache = useRef(new Map<string, InboxDetail>()),
    current = useRef<string | null>(null),
    listAbort = useRef<AbortController | null>(null),
    detailAbort = useRef<AbortController | null>(null),
    sendLock = useRef(false),
    keys = useRef(new Map<string, { body: string; id: string }>()),
    scroll = useRef<HTMLDivElement>(null),
    follow = useRef(true),
    listLength = useRef(0),
    listVersion = useRef(0),
    initial = useRef(initialId);
  const selectConversation = useCallback((key: string | null) => {
    detailAbort.current?.abort();
    current.current = key;
    follow.current = true;
    setSelected(key);
    setDetail(key ? cache.current.get(key) || null : null);
    setOpening(Boolean(key && !cache.current.has(key)));
    setNewMessages(false);
    setInfo(false);
    setNote(false);
    setError("");
  }, []);
  useEffect(() => {
    if (query.trim() === search) return;
    const t = setTimeout(() => {
      setSearch(query.trim());
      setLoading(true);
      setItems([]);
      listLength.current = 0;
    }, 250);
    return () => clearTimeout(t);
  }, [query, search]);
  useEffect(() => {
    listLength.current = items.length;
  }, [items.length]);
  const loadList = useCallback(
    async (append = false) => {
      listAbort.current?.abort();
      const controller = new AbortController();
      listAbort.current = controller;
      const version = ++listVersion.current;
      try {
        const result = await request<{ items: InboxConversation[]; hasMore: boolean }>(
          `/api/admin/inbox?filter=${filter}&q=${encodeURIComponent(search)}&offset=${append ? listLength.current : 0}&limit=${append ? 50 : Math.min(500, Math.max(50, listLength.current))}`,
          { signal: controller.signal },
        );
        if (version !== listVersion.current) return;
        setItems((previous) => {
          const next = append
            ? [...previous, ...result.items.filter((r) => !previous.some((p) => p.key === r.key))]
            : result.items;
          return next;
        });
        setHasMore(result.hasMore);
        setListError("");
        if (initial.current) {
          const row = result.items.find((r) => r.publicId === initial.current);
          if (row) {
            selectConversation(row.key);
            initial.current = undefined;
          }
        }
      } catch (reason) {
        if (!controller.signal.aborted)
          setListError(
            reason instanceof Error ? reason.message : "No fue posible cargar la bandeja.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
      // The list does not depend on the selected customer or the full workspace.
    },
    [filter, search, selectConversation],
  );
  const listLoader = useRef(loadList);
  useEffect(() => {
    listLoader.current = loadList;
  }, [loadList]);
  useEffect(() => {
    void listLoader.current();
    return () => listAbort.current?.abort();
  }, [filter, search]);
  const read = useCallback(async (value: InboxDetail) => {
    if (
      !value.conversation.lastIncomingAt ||
      (value.conversation.readAt !== null &&
        value.conversation.readAt >= value.conversation.lastIncomingAt) ||
      document.visibilityState !== "visible" ||
      current.current !== value.conversation.key
    )
      return;
    try {
      await request(endpoint(value.conversation.key), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ readAt: value.conversation.lastIncomingAt }),
      });
      setItems((rows) =>
        rows.map((r) =>
          r.key === value.conversation.key
            ? { ...r, readAt: value.conversation.lastIncomingAt }
            : r,
        ),
      );
    } catch {
      /* A failed receipt leaves the conversation unread for the next refresh. */
    }
  }, []);
  const loadDetail = useCallback(
    async (key: string) => {
      detailAbort.current?.abort();
      const controller = new AbortController();
      detailAbort.current = controller;
      try {
        const value = await request<InboxDetail>(endpoint(key), { signal: controller.signal });
        if (controller.signal.aborted || current.current !== key) return;
        const previous = cache.current.get(key);
        const merged = refreshInboxDetail(previous, value);
        const changed = previous && value.messages.at(-1)?.id !== previous.messages.at(-1)?.id;
        cache.current.set(key, merged);
        setDetail(merged);
        setError("");
        void read(value);
        if (changed && !follow.current) setNewMessages(true);
        if (follow.current)
          requestAnimationFrame(() =>
            scroll.current?.scrollTo({ top: scroll.current.scrollHeight }),
          );
      } catch (reason) {
        if (!controller.signal.aborted && current.current === key)
          setError(reason instanceof Error ? reason.message : "No fue posible abrir el chat.");
      } finally {
        if (!controller.signal.aborted && current.current === key) setOpening(false);
      }
    },
    [read],
  );
  useEffect(() => {
    if (!selected) return;
    void loadDetail(selected);
    return () => detailAbort.current?.abort();
  }, [selected, loadDetail]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void listLoader.current();
      if (current.current) void loadDetail(current.current);
    };
    const unsubscribe = subscribeContactLive((event, data) => {
      if (event !== "inbox") return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.visibilityState !== "visible") return;
        void listLoader.current();
        const row = data as { source?: string; id?: string };
        if (current.current === `${row.source}/${row.id}`) void loadDetail(current.current);
      }, 300);
    });
    const interval = setInterval(refresh, 12000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      unsubscribe();
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadDetail]);
  useEffect(
    () => () => {
      listAbort.current?.abort();
      detailAbort.current?.abort();
    },
    [],
  );
  async function loadOlder() {
    if (!detail?.nextBefore || !selected || older) return;
    const key = selected,
      cursor = detail.nextBefore,
      element = scroll.current,
      oldHeight = element?.scrollHeight || 0,
      oldTop = element?.scrollTop || 0;
    setOlder(true);
    try {
      const value = await request<InboxDetail>(
        `${endpoint(key)}?before=${encodeURIComponent(cursor.date)}&beforeId=${encodeURIComponent(cursor.id)}`,
      );
      if (current.current !== key) return;
      const previous = cache.current.get(key)!;
      const merged = {
        ...previous,
        messages: mergeInboxMessages(value.messages, previous.messages),
        hasMore: value.hasMore,
        nextBefore: value.nextBefore,
      };
      cache.current.set(key, merged);
      setDetail(merged);
      requestAnimationFrame(() => {
        if (scroll.current)
          scroll.current.scrollTop = oldTop + scroll.current.scrollHeight - oldHeight;
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No fue posible cargar mensajes anteriores.",
      );
    } finally {
      setOlder(false);
    }
  }
  async function send() {
    if (
      !detail ||
      !selected ||
      detail.conversation.key !== selected ||
      sendLock.current ||
      detail.conversation.replyInProgress
    )
      return;
    const key = selected,
      body = (drafts[key] || "").trim(),
      row = detail.conversation,
      isNote = note;
    if (body.length < 2) return;
    sendLock.current = true;
    setSending(true);
    setError("");
    try {
      if (row.source === "web" || row.source === "request") {
        let attempt = keys.current.get(key);
        if (!attempt || attempt.body !== body) {
          attempt = { body, id: crypto.randomUUID() };
          keys.current.set(key, attempt);
        }
        await request(
          row.source === "web"
            ? `/api/admin/chat/${row.id}/reply`
            : `/api/portal/admin/requests/${row.id}`,
          {
            method: row.source === "web" ? "POST" : "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(
              row.source === "web"
                ? { message: body, requestId: attempt.id }
                : { status: row.status, reply: body, requestId: attempt.id },
            ),
          },
        );
      } else if (isNote) await supportApi.note(role, row.publicId, body);
      else await supportApi.reply(role, row.publicId, body);
      setDrafts((previous) =>
        previous[key]?.trim() === body ? { ...previous, [key]: "" } : previous,
      );
      keys.current.delete(key);
      if (current.current === key) {
        follow.current = true;
        await loadDetail(key);
      }
      void listLoader.current();
    } catch (reason) {
      if (current.current === key)
        setError(
          reason instanceof Error
            ? reason.message
            : "No fue posible enviar. Tu borrador sigue aquí.",
        );
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  }
  const row = detail?.conversation,
    draft = selected ? drafts[selected] || "" : "",
    attention = row ? inboxAttention(row) : null;
  return (
    <main className={styles.root}>
      <header className={styles.top}>
        <div>
          <span className={styles.eyebrow}>COMERCIAL · CONVERSACIONES</span>
          <h1>Bandeja de entrada</h1>
          <p>Clientes, equipo y Zara. Cada mensaje en su lugar.</p>
        </div>
        <div className={styles.topActions}>
          <Link href="/administracion/support">
            Gestión de soporte <ArrowUpRight size={15} />
          </Link>
          <button
            onClick={() => {
              void listLoader.current();
              if (selected) void loadDetail(selected);
            }}
            aria-label="Actualizar conversaciones"
          >
            <RefreshCw size={17} />
          </button>
          <Link className={styles.primary} href="/administracion/support/all?new=1">
            <Plus size={17} /> Nuevo ticket
          </Link>
        </div>
      </header>
      {listError && (
        <div className={styles.error} role="alert">
          {listError}
          <button onClick={() => void listLoader.current()}>Reintentar</button>
        </div>
      )}
      <section
        className={`${styles.shell} ${selected ? styles.hasSelection : ""}`}
        aria-label="Conversaciones de clientes"
      >
        <aside className={styles.sidebar}>
          <div className={styles.listHead}>
            <div>
              <h2>Conversaciones</h2>
              <span>Más recientes primero</span>
            </div>
            <MessageCircle size={21} />
          </div>
          <label className={styles.search}>
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={160}
              placeholder="Buscar cliente, correo o asunto"
              aria-label="Buscar conversaciones"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Limpiar búsqueda">
                <X size={15} />
              </button>
            )}
          </label>
          <div className={styles.filters} aria-label="Filtrar conversaciones">
            {filters.map(([value, label]) => (
              <button
                key={value}
                aria-pressed={filter === value}
                onClick={() => {
                  if (value === filter) return;
                  setFilter(value);
                  setItems([]);
                  setLoading(true);
                  listLength.current = 0;
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.list} aria-busy={loading}>
            {loading && !items.length ? (
              <div className={styles.emptySmall}>
                <LoaderCircle className={styles.spin} /> Cargando conversaciones…
              </div>
            ) : null}
            {!loading && !items.length ? (
              <div className={styles.emptySmall}>
                <MessageCircle />
                No hay conversaciones en este filtro.
              </div>
            ) : null}
            {items.map((item) => {
              const state = inboxAttention(item),
                unread = inboxUnread(item);
              return (
                <button
                  key={item.key}
                  className={`${styles.row} ${selected === item.key ? styles.selected : ""} ${unread ? styles.unread : ""}`}
                  onClick={() => selectConversation(item.key)}
                  aria-pressed={selected === item.key}
                >
                  <Avatar row={item} />
                  <div className={styles.rowContent}>
                    <div className={styles.rowTop}>
                      <strong>{item.name}</strong>
                      <time dateTime={item.updatedAt}>{inboxDate(item.updatedAt, true)}</time>
                    </div>
                    {item.company && item.company !== item.name && (
                      <span className={styles.company}>{item.company}</span>
                    )}
                    <p>
                      {item.lastActor === "AI"
                        ? "Zara: "
                        : item.lastActor === "TEAM"
                          ? "Equipo: "
                          : ""}
                      {item.preview || item.subject}
                    </p>
                    <div className={styles.rowBottom}>
                      <span>{inboxChannel(item)}</span>
                      <span className={styles[state.tone]}>{state.label}</span>
                      {unread && <i aria-label="Sin leer" />}
                    </div>
                  </div>
                </button>
              );
            })}
            {hasMore && (
              <button className={styles.more} onClick={() => void loadList(true)}>
                Cargar más conversaciones
              </button>
            )}
          </div>
          <div className={styles.listFoot}>
            <span className={styles.liveDot} /> Actualización automática
          </div>
        </aside>
        <section className={styles.chat} aria-label="Conversación seleccionada">
          {selected && row && row.key === selected ? (
            <>
              <header className={styles.chatHead}>
                <button
                  className={styles.back}
                  onClick={() => selectConversation(null)}
                  aria-label="Volver a conversaciones"
                >
                  <ArrowLeft size={20} />
                </button>
                <Avatar row={row} />
                <div className={styles.chatIdentity}>
                  <h2>{row.name}</h2>
                  <p>
                    {row.company && row.company !== row.name ? `${row.company} · ` : ""}
                    {inboxChannel(row)}
                  </p>
                  <span className={styles[attention!.tone]}>
                    {row.replyInProgress && <Bot size={13} />} {attention!.label}
                  </span>
                </div>
                <button
                  className={styles.iconButton}
                  onClick={() => setInfo(!info)}
                  aria-expanded={info}
                  aria-label="Datos de la conversación"
                >
                  <Info size={21} />
                </button>
              </header>
              {info && (
                <aside className={styles.details}>
                  <div>
                    <strong>Datos de contacto</strong>
                    <span>{row.email || "Correo aún no identificado"}</span>
                    <span>{row.phone || "Teléfono aún no identificado"}</span>
                  </div>
                  <div>
                    <strong>{row.reference}</strong>
                    <span>{row.subject}</span>
                    <span>Inicio: {inboxDate(row.createdAt, true)}</span>
                  </div>
                  <Link href={`/administracion/support/all/${row.publicId}`}>
                    Abrir gestión completa <ArrowUpRight size={15} />
                  </Link>
                </aside>
              )}
              <div
                className={styles.messages}
                ref={scroll}
                role="log"
                aria-label={`Mensajes con ${row.name}`}
                onScroll={() => {
                  const el = scroll.current;
                  if (el) {
                    follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
                    if (follow.current) setNewMessages(false);
                  }
                }}
              >
                <div className={styles.historyLabel}>
                  <Shield size={12} /> Conversación de {row.name}
                </div>
                {detail.hasMore && (
                  <button
                    className={styles.older}
                    disabled={older}
                    onClick={() => void loadOlder()}
                  >
                    {older ? "Cargando…" : "Ver mensajes anteriores"}
                  </button>
                )}
                {detail.messages.map((message, index) => {
                  const date = inboxDate(message.createdAt, true).split(",")[0],
                    previous = index
                      ? inboxDate(detail.messages[index - 1].createdAt, true).split(",")[0]
                      : null;
                  return (
                    <div key={message.id}>
                      {date !== previous && <div className={styles.date}>{date}</div>}
                      <article
                        className={`${styles.message} ${message.actor === "CLIENT" ? styles.incoming : styles.outgoing} ${message.internal ? styles.note : message.actor === "SYSTEM" ? styles.system : message.actor === "AI" ? styles.aiMessage : ""}`}
                      >
                        <div className={styles.sender}>
                          {message.actor === "AI" && <Bot size={13} />}{" "}
                          {message.internal ? "Nota interna · " : ""}
                          {message.sender}
                        </div>
                        <div className={styles.body}>{message.body}</div>
                        <footer>
                          <time dateTime={message.createdAt}>{inboxDate(message.createdAt)}</time>
                          {message.actor === "TEAM" && !message.internal && (
                            <CheckCheck size={13} aria-label="Registrado" />
                          )}
                        </footer>
                      </article>
                    </div>
                  );
                })}
                {!detail.messages.length && (
                  <div className={styles.emptySmall}>Todavía no hay mensajes.</div>
                )}
                {row.replyInProgress && (
                  <div className={styles.aiStatus}>
                    <Bot size={17} />
                    <span>Zara está preparando una respuesta…</span>
                    <LoaderCircle className={styles.spin} size={14} />
                  </div>
                )}
              </div>
              {newMessages && (
                <button
                  className={styles.newMessages}
                  onClick={() => {
                    follow.current = true;
                    scroll.current?.scrollTo({
                      top: scroll.current.scrollHeight,
                      behavior: "smooth",
                    });
                    setNewMessages(false);
                  }}
                >
                  Mensajes nuevos <ChevronDown size={14} />
                </button>
              )}
              {error && (
                <div className={styles.error} role="alert">
                  {error}
                  <button
                    onClick={() => {
                      void loadDetail(row.key);
                      void listLoader.current();
                    }}
                  >
                    Reintentar
                  </button>
                </div>
              )}
              <form
                className={styles.composer}
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <div className={styles.composerTop}>
                  <span>
                    {note ? "Nota visible solo para el equipo" : `Respuesta para ${row.name}`}
                  </span>
                  {["native", "ticket"].includes(row.source) && (
                    <button type="button" onClick={() => setNote(!note)}>
                      {note ? "Cambiar a respuesta" : "Escribir nota interna"}
                    </button>
                  )}
                </div>
                <div className={styles.composeBox}>
                  <textarea
                    aria-label={note ? "Escribir nota interna" : `Mensaje para ${row.name}`}
                    placeholder={
                      note ? "Escribe una nota para el equipo…" : "Escribe tu respuesta…"
                    }
                    value={draft}
                    maxLength={row.source === "request" ? 3000 : 5000}
                    rows={2}
                    onChange={(e) =>
                      setDrafts((previous) => ({ ...previous, [row.key]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sending || row.replyInProgress || draft.trim().length < 2}
                    aria-label={note ? "Guardar nota interna" : "Enviar respuesta"}
                  >
                    {sending ? (
                      <LoaderCircle size={19} className={styles.spin} />
                    ) : (
                      <Send size={19} />
                    )}
                  </button>
                </div>
                <div className={styles.composerFoot}>
                  <span>
                    {row.replyInProgress
                      ? "Puedes preparar tu mensaje. El envío se habilita cuando Zara termine."
                      : "Enter para enviar · Shift + Enter para una nueva línea"}
                  </span>
                  <span>
                    {draft.length}/{row.source === "request" ? 3000 : 5000}
                  </span>
                </div>
              </form>
            </>
          ) : (
            <div className={styles.welcome}>
              {opening ? (
                <LoaderCircle size={36} className={styles.spin} />
              ) : (
                <MessageCircle size={46} />
              )}
              <h2>{opening ? "Abriendo conversación…" : "Tu próxima conversación, aquí"}</h2>
              <p>
                Selecciona un cliente para leer y responder.
                <br />
                Las respuestas de Zara se identifican como IA.
              </p>
              {error && (
                <div className={styles.error} role="alert">
                  {error}
                  <button
                    onClick={() => {
                      void listLoader.current();
                      if (selected) void loadDetail(selected);
                    }}
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
