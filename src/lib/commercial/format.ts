/** Formateadores compartidos por el portal comercial y el admin (es-CL). */

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
}

/** "hace 3 días" / "en 2 horas" — para seguimientos y bitácoras. */
export function relativeTime(value: string | null | undefined, now = Date.now()): string {
  if (!value) return "—";
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return "—";
  const diff = target - now;
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const format = (amount: number, unit: Intl.RelativeTimeFormatUnit) =>
    new Intl.RelativeTimeFormat("es-CL", { numeric: "auto" }).format(Math.round(amount), unit);

  if (abs < minute) return "recién";
  if (abs < hour) return format(diff / minute, "minute");
  if (abs < day) return format(diff / hour, "hour");
  if (abs < 30 * day) return format(diff / day, "day");
  if (abs < 365 * day) return format(diff / (30 * day), "month");
  return format(diff / (365 * day), "year");
}

/** Valor para <input type="datetime-local"> en hora local. */
export function localDateTimeValue(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

/** Iniciales para los avatares (máximo dos letras). */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toLocaleUpperCase("es");
}

/** Lee la respuesta JSON de una API y lanza el mensaje de error del backend. */
export async function readJson(res: Response): Promise<Record<string, unknown>> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(data.error || "No se pudo completar la acción."));
  return data;
}

/** Enmascara una cuenta bancaria dejando solo los últimos 4 dígitos. */
export function maskAccount(value: string | null | undefined): string {
  if (!value) return "—";
  const clean = value.replace(/\s/g, "");
  if (clean.length <= 4) return clean;
  return `${"•".repeat(Math.min(clean.length - 4, 8))}${clean.slice(-4)}`;
}
