"use client";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  CalendarPlus,
  CornerDownLeft,
  Mail,
  MessageCircle,
  NotebookPen,
  Phone,
  Search,
} from "lucide-react";
import { useAccess } from "../access-context";
import { Drawer, Feedback, Field, useAction } from "../finance/fx-ui";
import {
  stageLabels,
  workApi,
  type Stage,
  type WorkProposal,
  type WorkRecord,
} from "@control/lib/sales-workspace-api";
import {
  googleCalendarLink,
  mailLink,
  manualStages,
  matches,
  priority,
  priorityLabels,
  sharedProposalStatuses,
  telLink,
  whatsappLink,
} from "@control/lib/sales-insights";

// ───────────────────────── Gráficos (una sola serie, tono de marca) ─────────────────────────

export interface Point {
  label: string;
  value: number;
  detail?: string;
}

/** Línea compacta para tarjetas de indicador, con lectura del punto bajo el cursor. */
export function Sparkline({
  points,
  format = String,
  label,
}: {
  points: Point[];
  format?: (v: number) => string;
  label: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const w = 120,
    h = 36,
    pad = 3;
  const max = Math.max(1, ...points.map((p) => p.value));
  const xy = points.map((p, i) => [
    pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1),
    h - pad - (p.value / max) * (h - pad * 2),
  ]);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  const shown = active ?? points.length - 1;
  return (
    <div className="swx-spark">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label}: ${points.map((p) => `${p.label} ${format(p.value)}`).join(", ")}`}
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - box.left) / box.width) * (points.length - 1));
          setActive(Math.max(0, Math.min(points.length - 1, i)));
        }}
        onPointerLeave={() => setActive(null)}
      >
        <polygon points={area} className="swx-spark-area" />
        <polyline points={line} className="swx-spark-line" />
        {xy[shown] ? (
          <circle cx={xy[shown][0]} cy={xy[shown][1]} r="3" className="swx-spark-dot" />
        ) : null}
      </svg>
      {points[shown] ? (
        <small aria-hidden="true">
          {points[shown].label} · <b>{format(points[shown].value)}</b>
        </small>
      ) : null}
    </div>
  );
}

/** Columnas verticales con tooltip por barra y tabla equivalente para lectores de pantalla. */
export function Columns({
  points,
  format = String,
  label,
  height = 132,
}: {
  points: Point[];
  format?: (v: number) => string;
  label: string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((t, p) => t + p.value, 0);
  return (
    <figure className="swx-columns" aria-label={label}>
      <div className="swx-columns-plot" style={{ "--plot-h": `${height}px` } as CSSProperties} onPointerLeave={() => setActive(null)}>
        <span className="swx-grid" style={{ bottom: "50%" }} aria-hidden="true" />
        {points.map((p, i) => (
          <button
            type="button"
            key={p.label + i}
            className={`swx-col${active === i ? " active" : ""}`}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`${p.label}: ${format(p.value)}`}
          >
            <span style={{ height: `${Math.max(p.value ? 4 : 0, (p.value / max) * 100)}%` }} />
            {active === i ? (
              <span className="swx-tip" role="tooltip">
                <b>{format(p.value)}</b>
                {p.detail ?? p.label}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="swx-columns-axis" aria-hidden="true">
        {points.map((p, i) => (
          <span key={p.label + i}>{i === 0 || i === points.length - 1 || points.length <= 6 ? p.label : ""}</span>
        ))}
      </div>
      <figcaption>
        {label} · Total {format(total)}
      </figcaption>
      <table className="sw-sr-only">
        <caption>{label}</caption>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{p.detail ?? p.label}</th>
              <td>{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Barras horizontales: embudos y rankings. El texto nunca usa el color de la barra. */
export function HBars({
  rows,
  format = String,
  label,
  onSelect,
  accentLast = false,
}: {
  rows: Array<{ key: string; label: string; value: number; note?: string }>;
  accentLast?: boolean;
  format?: (v: number) => string;
  label: string;
  onSelect?: (key: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className={`swx-hbars${accentLast ? " accent-last" : ""}`} aria-label={label}>
      {rows.map((r) => {
        const content = (
          <>
            <span className="swx-hbar-label">{r.label}</span>
            <span className="swx-hbar-track" aria-hidden="true">
              <span style={{ width: `${Math.max(r.value ? 2 : 0, (r.value / max) * 100)}%` }} />
            </span>
            <span className="swx-hbar-value">
              <b>{format(r.value)}</b>
              {r.note ? <small>{r.note}</small> : null}
            </span>
          </>
        );
        return (
          <li key={r.key} title={`${r.label}: ${format(r.value)}${r.note ? ` · ${r.note}` : ""}`}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(r.key)}>
                {content}
              </button>
            ) : (
              <div>{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function Ring({ value, label }: { value: number | null; label: string }) {
  const pct = value === null ? 0 : Math.round(value * 100);
  const r = 26,
    c = 2 * Math.PI * r;
  return (
    <div className="swx-ring" role="img" aria-label={`${label}: ${value === null ? "sin datos" : `${pct}%`}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} className="track" />
        <circle
          cx="32"
          cy="32"
          r={r}
          className="value"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <b>{value === null ? "—" : `${pct}%`}</b>
    </div>
  );
}

// ───────────────────────── Prioridad y acciones de contacto ─────────────────────────

export function PriorityBadge({
  record,
  proposals,
  now,
}: {
  record: WorkRecord;
  proposals: WorkProposal[];
  now: number;
}) {
  const p = priority(record, proposals, now);
  return (
    <span className={`swx-priority ${p.level}`} title={p.reasons.join(" · ")}>
      <i aria-hidden="true" />
      {priorityLabels[p.level]}
      {p.level !== "closed" ? <small>{p.score}</small> : null}
    </span>
  );
}

export type LogIntent = { record: WorkRecord; kind?: string; stage?: Stage };

/** WhatsApp, llamada, correo y calendario sin credenciales; cada contacto ofrece registrar la gestión. */
export function ContactActions({
  record: r,
  onLog,
  compact = false,
}: {
  record: WorkRecord;
  onLog: (intent: LogIntent) => void;
  compact?: boolean;
}) {
  const first = r.contact_name.split(/\s+/)[0] ?? "";
  const wa = whatsappLink(
    r.phone,
    `Hola ${first}, te escribo de Zyteron para dar seguimiento a ${r.interest.toLocaleLowerCase("es-CL")}.`,
  );
  const tel = telLink(r.phone);
  const mail = mailLink(r.email, `Zyteron · ${r.company_name}`, `Hola ${first},\n\n`);
  const cal = googleCalendarLink(r);
  const closed = ["COMPLETED", "LOST"].includes(r.stage);
  return (
    <div className={`swx-actions${compact ? " compact" : ""}`} onClick={(e) => e.stopPropagation()}>
      {wa ? (
        <a
          className="swx-act wa"
          href={wa}
          target="_blank"
          rel="noreferrer"
          title="Abrir WhatsApp"
          aria-label={`WhatsApp a ${r.contact_name}`}
          onClick={() => !closed && onLog({ record: r, kind: "WHATSAPP" })}
        >
          <MessageCircle size={15} />
          {compact ? null : <span>WhatsApp</span>}
        </a>
      ) : null}
      {tel ? (
        <a
          className="swx-act"
          href={tel}
          title="Llamar"
          aria-label={`Llamar a ${r.contact_name}`}
          onClick={() => !closed && onLog({ record: r, kind: "CALL" })}
        >
          <Phone size={15} />
          {compact ? null : <span>Llamar</span>}
        </a>
      ) : null}
      {mail ? (
        <a
          className="swx-act"
          href={mail}
          title="Escribir correo"
          aria-label={`Correo a ${r.contact_name}`}
          onClick={() => !closed && onLog({ record: r, kind: "EMAIL" })}
        >
          <Mail size={15} />
          {compact ? null : <span>Correo</span>}
        </a>
      ) : null}
      {cal ? (
        <a
          className="swx-act"
          href={cal}
          target="_blank"
          rel="noreferrer"
          title="Agregar a Google Calendar"
          aria-label={`Agendar seguimiento de ${r.company_name} en Google Calendar`}
        >
          <CalendarPlus size={15} />
          {compact ? null : <span>Calendario</span>}
        </a>
      ) : null}
      {!closed ? (
        <button
          type="button"
          className="swx-act log"
          title="Registrar gestión"
          aria-label={`Registrar gestión con ${r.company_name}`}
          onClick={() => onLog({ record: r })}
        >
          <NotebookPen size={15} />
          {compact ? null : <span>Registrar</span>}
        </button>
      ) : null}
    </div>
  );
}

// ───────────────────────── Registro rápido de gestión ─────────────────────────

const kinds = [
  { id: "CALL", label: "Llamada" },
  { id: "WHATSAPP", label: "WhatsApp" },
  { id: "EMAIL", label: "Correo" },
  { id: "MEETING", label: "Reunión" },
  { id: "NOTE", label: "Nota" },
];
const templates: Record<string, string[]> = {
  CALL: [
    "Llamé y no contestó; reintento programado.",
    "Conversamos la necesidad y quedó de revisar internamente.",
    "Confirmó interés y solicitó propuesta.",
  ],
  WHATSAPP: [
    "Envié mensaje de seguimiento por WhatsApp.",
    "Respondió por WhatsApp y pidió más información.",
    "Compartí enlaces de casos y planes.",
  ],
  EMAIL: [
    "Envié correo con la presentación de Zyteron.",
    "Respondió el correo con dudas sobre alcance y plazos.",
  ],
  MEETING: [
    "Reunión de levantamiento realizada; próximos pasos acordados.",
    "Reunión de presentación de propuesta.",
  ],
  NOTE: ["Actualización interna de la gestión."],
};
const pad2 = (n: number) => String(n).padStart(2, "0");
const localInput = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const at = (days: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return localInput(d);
};

export function QuickLog({
  intent,
  proposals,
  onClose,
  onSaved,
}: {
  intent: LogIntent;
  proposals: WorkProposal[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { role } = useAccess();
  const r = intent.record;
  const action = useAction();
  const [requestId] = useState(() => crypto.randomUUID());
  const [kind, setKind] = useState(intent.kind ?? "CALL");
  const [stage, setStage] = useState<Stage>(
    intent.stage && manualStages.includes(intent.stage) ? intent.stage : r.stage,
  );
  const [body, setBody] = useState("");
  const [next, setNext] = useState(() =>
    r.next_action_at && Date.parse(r.next_action_at) > Date.now()
      ? localInput(new Date(r.next_action_at))
      : at(2),
  );
  const canAccept = proposals.some(
    (p) => p.record_id === r.id && sharedProposalStatuses.includes(p.status),
  );
  const closed = r.stage === "COMPLETED";
  const save = async () => {
    const saved = await action.run(() =>
      workApi.post(role, `/records/${r.id}/events`, {
        requestId,
        kind,
        body,
        stage,
        next_action_at: next && stage !== "LOST" ? new Date(next).toISOString() : null,
      }),
    );
    if (saved) onSaved();
  };
  return (
    <Drawer
      open
      title={`Registrar gestión · ${r.company_name}`}
      subtitle={`${r.contact_name} · Etapa actual: ${stageLabels[r.stage]}`}
      onClose={onClose}
      className="sw-drawer swx-quicklog"
    >
      {closed ? (
        <Feedback error="La venta ya fue validada; inicia una nueva oportunidad desde la ficha del cliente." />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset className="swx-segment">
            <legend>Tipo de gestión</legend>
            {kinds.map((k) => (
              <label key={k.id} className={kind === k.id ? "on" : ""}>
                <input
                  type="radio"
                  name="kind"
                  value={k.id}
                  checked={kind === k.id}
                  onChange={() => setKind(k.id)}
                />
                {k.label}
              </label>
            ))}
          </fieldset>
          <Field label="Etapa después de esta gestión">
            <select value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
              {manualStages.map((s) => (
                <option key={s} value={s} disabled={s === "ACCEPTED" && !canAccept}>
                  {stageLabels[s]}
                  {s === "ACCEPTED" && !canAccept ? " · requiere propuesta compartida" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qué pasó">
            <textarea
              required
              autoFocus
              maxLength={4000}
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Resumen de la conversación, acuerdos y próximos pasos."
            />
          </Field>
          <div className="swx-templates" aria-label="Textos sugeridos">
            {(templates[kind] ?? []).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setBody((b) => (b.trim() ? `${b.trim()}\n${t}` : t))}
              >
                {t}
              </button>
            ))}
          </div>
          {stage !== "LOST" ? (
            <Field label="Próximo seguimiento">
              <input type="datetime-local" value={next} onChange={(e) => setNext(e.target.value)} />
            </Field>
          ) : null}
          {stage !== "LOST" ? (
            <div className="swx-quick-dates">
              <button type="button" onClick={() => setNext(at(1))}>
                Mañana 10:00
              </button>
              <button type="button" onClick={() => setNext(at(3))}>
                En 3 días
              </button>
              <button type="button" onClick={() => setNext(at(7))}>
                En 1 semana
              </button>
              <button type="button" onClick={() => setNext(at(14))}>
                En 2 semanas
              </button>
              <button type="button" onClick={() => setNext("")}>
                Sin fecha
              </button>
            </div>
          ) : null}
          <p className="sw-help">
            {role === "EJECUTIVA_VENTAS"
              ? "La gestión queda visible para administración y pasa a revisión."
              : "La gestión queda registrada en el historial del contacto."}
          </p>
          <Feedback error={action.error} />
          <div className="sw-form-footer">
            <button type="button" className="fx-btn ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="fx-btn primary" disabled={action.busy || !body.trim()}>
              {action.busy ? "Guardando…" : "Guardar gestión"}
            </button>
          </div>
        </form>
      )}
    </Drawer>
  );
}

// ───────────────────────── Paleta de comandos (⌘K / Ctrl+K) ─────────────────────────

export interface PaletteItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon?: ReactNode;
  run: () => void;
}

export function CommandPalette({
  open,
  items,
  onClose,
}: {
  open: boolean;
  items: PaletteItem[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const results = useMemo(
    () => items.filter((i) => matches(query, i.label, i.hint, i.keywords, i.group)).slice(0, 50),
    [items, query],
  );
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);
  if (!open) return null;
  const run = (item?: PaletteItem) => {
    if (!item) return;
    onClose();
    item.run();
  };
  let lastGroup = "";
  return (
    <div className="swx-palette-overlay" onClick={onClose}>
      <div
        className="swx-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Buscar y ejecutar acciones"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="swx-palette-search">
          <Search size={18} />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[index] ? `${listId}-${index}` : undefined}
            value={query}
            placeholder="Busca contactos, propuestas, planes o acciones…"
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                run(results[index]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <kbd>Esc</kbd>
        </label>
        <div className="swx-palette-list" id={listId} role="listbox" ref={listRef}>
          {results.length ? (
            results.map((item, i) => {
              const header = item.group !== lastGroup ? item.group : null;
              lastGroup = item.group;
              return (
                <div key={item.id}>
                  {header ? <span className="swx-palette-group">{header}</span> : null}
                  <button
                    type="button"
                    role="option"
                    id={`${listId}-${i}`}
                    data-index={i}
                    aria-selected={i === index}
                    className={i === index ? "active" : ""}
                    onPointerMove={() => setIndex(i)}
                    onClick={() => run(item)}
                  >
                    <span className="swx-palette-icon">{item.icon}</span>
                    <span>
                      <b>{item.label}</b>
                      {item.hint ? <small>{item.hint}</small> : null}
                    </span>
                    {i === index ? <CornerDownLeft size={14} /> : null}
                  </button>
                </div>
              );
            })
          ) : (
            <p className="swx-palette-empty">Sin resultados para “{query}”.</p>
          )}
        </div>
        <footer>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navegar
          </span>
          <span>
            <kbd>Enter</kbd> abrir
          </span>
          <span>
            <kbd>N</kbd> nuevo contacto
          </span>
          <span>
            <kbd>1</kbd>–<kbd>6</kbd> secciones
          </span>
        </footer>
      </div>
    </div>
  );
}
