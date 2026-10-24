"use client";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { monthDays, shiftMonth } from "@/lib/client-experience/month-calendar";
import { civil } from "./production-model";
import s from "./month-calendar.module.css";
export type CalendarItem = {
  id: string;
  date: string | null;
  label: string;
  detail: string;
  tone: "pending" | "paid" | "forecast" | "meeting";
  amount?: string;
};
export default function MonthCalendar({
  title,
  description,
  year,
  month,
  today,
  items,
  selected,
  onMonth,
  onSelect,
  children,
}: {
  title: string;
  description: string;
  year: number;
  month: number;
  today: string;
  items: CalendarItem[];
  selected: string | null;
  onMonth: (year: number, month: number) => void;
  onSelect: (date: string) => void;
  children?: React.ReactNode;
}) {
  const label = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  const move = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    onMonth(next.year, next.month);
  };
  return (
    <section className={s.root} aria-label={title}>
      <header className={s.heading}>
        <div>
          <span className={s.eyebrow}>
            <CalendarDays size={14} />
            {title}
          </span>
          <h3 aria-live="polite">{label}</h3>
          <p>{description}</p>
        </div>
        <div className={s.controls}>
          <button
            type="button"
            aria-label="Mes anterior"
            disabled={year === 2020 && month === 1}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <select
            aria-label="Mes del calendario"
            value={month}
            onChange={(e) => onMonth(year, Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>
                {new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "UTC" }).format(
                  new Date(Date.UTC(2026, i, 1)),
                )}
              </option>
            ))}
          </select>
          <select
            aria-label="Año del calendario"
            value={year}
            onChange={(e) => onMonth(Number(e.target.value), month)}
          >
            {Array.from({ length: 81 }, (_, i) => (
              <option key={i} value={2020 + i}>
                {2020 + i}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Mes siguiente"
            disabled={year === 2100 && month === 12}
            onClick={() => move(1)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className={s.todayButton}
            onClick={() => {
              onMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7)));
              onSelect(today);
            }}
          >
            Hoy
          </button>
        </div>
      </header>
      {children}
      <div className={s.week} aria-hidden="true">
        {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((d) => (
          <span key={d}>
            <b>{d.slice(0, 3)}</b>
            <span>{d.slice(3)}</span>
          </span>
        ))}
      </div>
      <div className={s.grid}>
        {monthDays(year, month).map((date, index) => {
          if (!date) return <div className={s.blank} key={`blank-${index}`} aria-hidden="true" />;
          const dayItems = items.filter((item) => item.date === date);
          return (
            <button
              type="button"
              key={date}
              className={`${s.day} ${date === today ? s.today : ""} ${date === selected ? s.selected : ""} ${dayItems.length ? s.hasItems : ""}`}
              aria-pressed={date === selected}
              aria-current={date === today ? "date" : undefined}
              aria-label={`${civil(date)}${dayItems.length ? `: ${dayItems.map((item) => [item.label, item.amount, item.detail].filter(Boolean).join(" · ")).join("; ")}` : ", sin movimientos"}`}
              onClick={() => onSelect(date)}
            >
              <span className={s.dayNumber}>
                {Number(date.slice(8))}
                {date === today && <small>Hoy</small>}
              </span>
              <span className={s.items}>
                {dayItems.slice(0, 2).map((item) => (
                  <span className={`${s.item} ${s[item.tone]}`} key={item.id}>
                    <span className={s.itemLabel}>{item.label}</span>
                    <strong>{item.amount || item.detail}</strong>
                  </span>
                ))}
                {dayItems.length > 2 && <span className={s.more}>+{dayItems.length - 2} más</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className={s.hint}>Selecciona un día para ver su detalle. Horario de Chile continental.</p>
    </section>
  );
}
export function CalendarDayDetail({
  date,
  empty,
  children,
}: {
  date: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={s.dayDetail} aria-label={`Detalle del ${civil(date)}`} aria-live="polite">
      <header>
        <CalendarDays size={18} />
        <h4>{civil(date)}</h4>
      </header>
      {empty ? <p>No hay movimientos para este día.</p> : children}
    </section>
  );
}
export { s as calendarStyles };
