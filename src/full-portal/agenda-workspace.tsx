"use client";
import { useState } from "react";
import { CalendarDays, Clock3, Plus } from "lucide-react";
import type { PortalData } from "@/lib/client-experience/snapshot";
import {
  agendaEventDate,
  calendarReference,
  monthKey,
} from "@/lib/client-experience/month-calendar";
import { meetingRequestStatus, requestedMeetingDate } from "@/lib/portal/meeting-request";
import MonthCalendar, {
  CalendarDayDetail,
  calendarStyles as c,
  type CalendarItem,
} from "./month-calendar";
import { civil } from "./production-model";
import s from "./agenda-workspace.module.css";
export default function AgendaWorkspace({
  data,
  onRequest,
  onEvent,
}: {
  data: PortalData;
  onRequest: (date?: string) => void;
  onEvent: (id: string) => void;
}) {
  const ref = calendarReference(data.asOf);
  const [view, setView] = useState({ year: ref.year, month: ref.month });
  const [selected, setSelected] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const requests = data.requests.filter((r) => r.type === "MEETING");
  const items: CalendarItem[] = [
    ...data.events.map((e) => ({
      id: e.id,
      date: agendaEventDate(e.date),
      label: e.title,
      detail: "Compromiso publicado",
      tone: "meeting" as const,
    })),
    ...requests
      .filter((r) => ["PENDING", "IN_PROGRESS"].includes(r.status))
      .map((r) => ({
        id: r.id,
        date: requestedMeetingDate(r.details),
        label: r.title,
        detail: meetingRequestStatus(r.status),
        tone: "forecast" as const,
      })),
  ];
  const dayItems = items.filter((i) => i.date === selected);
  const monthItems = items
    .filter((i) => i.date?.startsWith(monthKey(view.year, view.month)))
    .sort((a, b) => a.date!.localeCompare(b.date!));
  const request = requests.find((r) => r.id === requestId);
  return (
    <div className={s.root}>
      <MonthCalendar
        title="Tu agenda"
        description="Reuniones publicadas y solicitudes en coordinación."
        {...view}
        today={ref.date}
        items={items}
        selected={selected}
        onMonth={(year, month) => {
          setView({ year, month });
          setSelected(null);
        }}
        onSelect={setSelected}
      >
        <div className={c.legend}>
          <span>
            <i className={c.meetingDot} />
            Compromiso publicado
          </span>
          <span>
            <i className={c.forecastDot} />
            Solicitud por confirmar
          </span>
        </div>
      </MonthCalendar>
      {selected && (
        <CalendarDayDetail date={selected} empty={false}>
          {dayItems.map((i) => (
            <button
              className={s.row}
              key={i.id}
              onClick={() =>
                data.events.some((e) => e.id === i.id) ? onEvent(i.id) : setRequestId(i.id)
              }
            >
              <CalendarDays size={18} />
              <span>
                <strong>{i.label}</strong>
                <small>{i.detail}</small>
              </span>
            </button>
          ))}
          {!dayItems.length && <p>No tienes compromisos para este día.</p>}
          {selected >= ref.date && (
            <button className={s.action} onClick={() => onRequest(selected)}>
              <Plus size={16} />
              Solicitar reunión para este día
            </button>
          )}
        </CalendarDayDetail>
      )}
      <div className={s.columns}>
        <section className={s.panel}>
          <header>
            <CalendarDays size={18} />
            <h3>Compromisos del mes</h3>
            <span>{monthItems.length}</span>
          </header>
          {monthItems.length ? (
            monthItems.map((i) => (
              <button
                className={s.row}
                key={i.id}
                onClick={() => {
                  setSelected(i.date);
                  if (data.events.some((e) => e.id === i.id)) onEvent(i.id);
                  else setRequestId(i.id);
                }}
              >
                <time>{civil(i.date)}</time>
                <span>
                  <strong>{i.label}</strong>
                  <small>{i.detail}</small>
                </span>
              </button>
            ))
          ) : (
            <p>
              Este mes no tiene compromisos publicados. Puedes solicitar una reunión y seguir su
              estado aquí.
            </p>
          )}
        </section>
        <section className={s.panel}>
          <header>
            <Clock3 size={18} />
            <h3>Mis solicitudes de reunión</h3>
            <span>{requests.length}</span>
          </header>
          {requests.length ? (
            requests.map((r) => (
              <button className={s.row} key={r.id} onClick={() => setRequestId(r.id)}>
                <span>
                  <strong>{r.title}</strong>
                  <small>
                    {requestedMeetingDate(r.details)
                      ? civil(requestedMeetingDate(r.details))
                      : `Enviada el ${civil(r.date)}`}
                  </small>
                </span>
                <b className={s.badge}>{meetingRequestStatus(r.status)}</b>
              </button>
            ))
          ) : (
            <p>
              Aún no has solicitado reuniones. No necesitas tener un servicio activo para coordinar
              una.
            </p>
          )}
        </section>
      </div>
      {request && (
        <section className={s.panel} aria-live="polite">
          <header>
            <h3>{request.title}</h3>
            <button className={s.action} onClick={() => setRequestId(null)}>
              Cerrar detalle
            </button>
          </header>
          <span className={s.badge}>{meetingRequestStatus(request.status)}</span>
          <p>{request.details}</p>
          <small>
            Solicitud enviada el {civil(request.date)}. La fecha preferida queda sujeta a
            confirmación del equipo.
          </small>
        </section>
      )}
    </div>
  );
}
export function MeetingRequest({
  data,
  initialDate,
  onDone,
}: {
  data: PortalData;
  initialDate?: string;
  onDone: () => void;
}) {
  const [date, setDate] = useState(initialDate || "");
  const [time, setTime] = useState("");
  const [context, setContext] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="support-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          const r = await fetch("/api/portal/requests", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              requestId,
              type: "MEETING",
              title,
              details,
              preferredDate: date,
              preferredTime: time,
              context,
            }),
          });
          const value = await r.json();
          if (!r.ok) throw new Error(value.error || "No pudimos enviar la solicitud.");
          onDone();
        } catch (e) {
          setError(e instanceof Error ? e.message : "No pudimos conectar. Intenta nuevamente.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Propón un día y una hora. Verificaremos la disponibilidad y podrás seguir la solicitud en tu
        agenda.
      </p>
      <div className={s.fields}>
        <label>
          Fecha preferida
          <input
            type="date"
            required
            min={calendarReference(data.asOf).date}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Hora preferida
          <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <small>Horario de Chile continental · America/Santiago</small>
      <label>
        Proyecto o servicio
        <select value={context} onChange={(e) => setContext(e.target.value)}>
          <option value="">Consulta general</option>
          {data.projects.map((p) => (
            <option key={p.id} value={`${p.number || "Proyecto"} · ${p.title}`.slice(0, 200)}>
              {p.title}
              {p.number ? ` · ${p.number}` : ""}
            </option>
          ))}
          {data.services.map((v) => (
            <option key={v.id} value={v.name.slice(0, 200)}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Asunto
        <input
          required
          minLength={4}
          maxLength={140}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Por ejemplo: revisar los avances del proyecto"
        />
      </label>
      <label>
        ¿Qué necesitas revisar?
        <textarea
          required
          minLength={10}
          maxLength={4000}
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe los temas que quieres conversar."
        />
      </label>
      <div className="info-note">
        <CalendarDays size={17} />
        La solicitud no reserva un horario hasta que el equipo confirme disponibilidad.
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="button primary" disabled={busy}>
        {busy ? "Enviando solicitud…" : "Solicitar reunión"}
      </button>
    </form>
  );
}
