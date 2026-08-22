/**
 * Programación de envíos 24/7.
 *
 * Módulo puro: sin base de datos, sin red y sin `server-only`, para poder
 * probar el reparto horario de forma aislada. La hora se calcula UNA vez y se
 * persiste en la cola, de modo que reiniciar el servidor no la altera.
 */

export const SCHEDULER_TIMEZONE = "America/Santiago";

/**
 * Separación por defecto entre dos envíos consecutivos, en minutos. Se usa
 * cuando no se declara un objetivo diario; equivale a repartir unos 20 correos
 * a lo largo del día.
 */
export const MIN_GAP_MINUTES = 35;
export const MAX_GAP_MINUTES = 110;

/**
 * Piso duro de separación. Por debajo de esto el patrón deja de parecer humano
 * y se acerca a una ráfaga, que es justo lo que hace que un dominio termine
 * marcado como spam. Ningún objetivo diario puede saltárselo.
 */
export const ABSOLUTE_MIN_GAP_MINUTES = 12;

const DAY_MINUTES = 24 * 60;

/**
 * Deriva la separación entre envíos a partir de cuántos correos se quieren
 * repartir en el día.
 *
 * La media es simplemente el día dividido por el objetivo, y alrededor de esa
 * media se abre una ventana de ±50 % para que la separación real siempre sea
 * irregular: nunca dos envíos al mismo ritmo, que es lo que delata a un robot.
 *
 * Con 20 correos diarios devuelve 36-108 minutos, prácticamente la separación
 * fija que había antes; con 30 baja a 24-72, que es lo que permite completar el
 * objetivo sin agrupar envíos.
 */
export function gapRangeForDailyLimit(dailyLimit?: number | null): {
  min: number;
  max: number;
} {
  if (!dailyLimit || !Number.isFinite(dailyLimit) || dailyLimit <= 0) {
    return { min: MIN_GAP_MINUTES, max: MAX_GAP_MINUTES };
  }

  const average = DAY_MINUTES / dailyLimit;
  const min = Math.max(ABSOLUTE_MIN_GAP_MINUTES, Math.round(average * 0.5));
  const max = Math.max(min + 1, Math.round(average * 1.5));
  return { min, max };
}

/**
 * Reparto del día. Los porcentajes son los solicitados: la mayoría en horario
 * laboral, algo de tarde-noche y una fracción menor de madrugada, para que el
 * patrón no parezca automatizado.
 */
export type Band = {
  id: "LABORAL" | "TARDE" | "MADRUGADA";
  weight: number;
  startMinute: number;
  endMinute: number;
};

export const BANDS: Band[] = [
  { id: "LABORAL", weight: 0.6, startMinute: 8 * 60 + 30, endMinute: 18 * 60 + 30 },
  { id: "TARDE", weight: 0.25, startMinute: 18 * 60 + 31, endMinute: 23 * 60 + 30 },
  { id: "MADRUGADA", weight: 0.15, startMinute: 0, endMinute: 8 * 60 + 29 },
];

/** Minutos transcurridos del día en la zona horaria de operación. */
export function minutesOfDayInZone(date: Date, timeZone = SCHEDULER_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return (hour % 24) * 60 + minute;
}

export function bandForMinute(minuteOfDay: number): Band {
  return (
    BANDS.find((band) => minuteOfDay >= band.startMinute && minuteOfDay <= band.endMinute) ?? BANDS[0]
  );
}

/** Elige una banda respetando los pesos configurados. */
export function pickBand(random: () => number = Math.random): Band {
  const roll = random();
  let cumulative = 0;
  for (const band of BANDS) {
    cumulative += band.weight;
    if (roll < cumulative) return band;
  }
  return BANDS[BANDS.length - 1];
}

function randomBetween(min: number, max: number, random: () => number): number {
  return Math.floor(min + random() * (max - min + 1));
}

/** Desplaza una fecha hasta un minuto concreto del día en la zona de operación. */
function withMinuteOfDay(reference: Date, targetMinute: number, timeZone: string): Date {
  const current = minutesOfDayInZone(reference, timeZone);
  const delta = targetMinute - current;
  return new Date(reference.getTime() + delta * 60_000);
}

export type ScheduleOptions = {
  /** Última hora ya programada en la cola; el nuevo envío va después. */
  lastScheduledAt?: Date | null;
  /** Momento actual. Se inyecta para poder probar. */
  now?: Date;
  random?: () => number;
  timeZone?: string;
  /**
   * Correos que se quieren repartir en el día. La separación se calcula a
   * partir de este número; si se omite se usa el rango por defecto.
   */
  dailyLimit?: number | null;
};

/**
 * Calcula cuándo debe salir el siguiente correo.
 *
 * 1. Parte del último programado (o de ahora) y suma una separación aleatoria
 *    de 35 a 110 minutos, para que nunca coincidan dos en el mismo minuto.
 * 2. Sortea una banda horaria según los pesos. Si el candidato no cae en esa
 *    banda, lo empuja a la siguiente ocurrencia de la banda elegida.
 *
 * El resultado nunca queda en el pasado.
 */
export function computeNextSendAt(options: ScheduleOptions = {}): Date {
  const random = options.random ?? Math.random;
  const timeZone = options.timeZone ?? SCHEDULER_TIMEZONE;
  const now = options.now ?? new Date();

  const base =
    options.lastScheduledAt && options.lastScheduledAt.getTime() > now.getTime()
      ? options.lastScheduledAt
      : now;

  const range = gapRangeForDailyLimit(options.dailyLimit);
  const gap = randomBetween(range.min, range.max, random);
  let candidate = new Date(base.getTime() + gap * 60_000);

  const targetBand = pickBand(random);
  const candidateMinute = minutesOfDayInZone(candidate, timeZone);
  const candidateBand = bandForMinute(candidateMinute);

  if (candidateBand.id !== targetBand.id) {
    // Se mueve dentro de la banda elegida, en un minuto aleatorio de ella.
    const targetMinute = randomBetween(targetBand.startMinute, targetBand.endMinute, random);
    let moved = withMinuteOfDay(candidate, targetMinute, timeZone);

    // Si al mover quedó antes del candidato, se pasa al día siguiente.
    if (moved.getTime() <= candidate.getTime()) {
      moved = new Date(moved.getTime() + 24 * 60 * 60_000);
    }
    candidate = moved;
  }

  // Nunca en el pasado ni antes de la separación mínima.
  const earliest = new Date(base.getTime() + range.min * 60_000);
  return candidate.getTime() < earliest.getTime() ? earliest : candidate;
}

/**
 * Reprograma de forma escalonada los envíos que quedaron atrasados.
 *
 * Si Zara estuvo detenida, despacharlos todos juntos al reactivarse sería
 * exactamente la ráfaga que se quiere evitar: se les asignan horas nuevas y
 * espaciadas a partir de ahora.
 */
export function rescheduleBacklog(
  count: number,
  options: {
    now?: Date;
    random?: () => number;
    timeZone?: string;
    dailyLimit?: number | null;
  } = {},
): Date[] {
  const dates: Date[] = [];
  let last: Date | null = null;

  for (let index = 0; index < count; index += 1) {
    const next = computeNextSendAt({
      lastScheduledAt: last,
      now: options.now,
      random: options.random,
      timeZone: options.timeZone,
      dailyLimit: options.dailyLimit,
    });
    dates.push(next);
    last = next;
  }

  return dates;
}

// ---------------------------------------------------------------------------
// Calentamiento del buzón
// ---------------------------------------------------------------------------

/**
 * Rampa de calentamiento. Un buzón nuevo que envía decenas de correos de golpe
 * es justamente lo que gatilla el bloqueo por reputación.
 *
 * Por encima de 15 diarios el aumento NO es automático: requiere que el
 * administrador fije el límite a mano.
 */
export const WARMUP_AUTOMATIC_CEILING = 15;

/**
 * Rampa automática: solo llega hasta 15 diarios.
 * Los tramos de 20 y 30 son RECOMENDACIONES que el panel muestra, pero exigen
 * que el administrador fije el límite a mano.
 */
export function warmupDailyLimit(daysSinceStart: number): number {
  if (daysSinceStart <= 2) return 10;
  return 15;
}

/** Lo que el panel puede sugerir, sin aplicarlo solo. */
export function warmupRecommendation(daysSinceStart: number): number | null {
  if (daysSinceStart >= 8) return 30;
  if (daysSinceStart >= 5) return 20;
  return null;
}

export type EffectiveLimitInput = {
  warmupStartedOn?: string | null;
  manualOverride?: number | null;
  configuredDailyLimit: number;
  now?: Date;
};

/**
 * Límite diario efectivo: el menor entre la rampa, el configurado y el tope
 * automático. Solo un override manual puede superar los 15 diarios.
 */
export function effectiveDailyLimit(input: EffectiveLimitInput): {
  limit: number;
  stage: string;
  automatic: boolean;
  recommendation: number | null;
} {
  const now = input.now ?? new Date();

  if (!input.warmupStartedOn) {
    return {
      limit: Math.min(10, input.configuredDailyLimit),
      stage: "Sin iniciar · parte con el primer envío real",
      automatic: true,
      recommendation: null,
    };
  }

  const started = new Date(input.warmupStartedOn);
  const days = Math.floor((now.getTime() - started.getTime()) / (24 * 60 * 60_000)) + 1;
  const ramp = warmupDailyLimit(days);

  const recommendation = warmupRecommendation(days);

  if (typeof input.manualOverride === "number" && input.manualOverride > 0) {
    return {
      limit: Math.min(input.manualOverride, input.configuredDailyLimit),
      stage: `Día ${days} · límite aprobado a mano`,
      automatic: false,
      recommendation,
    };
  }

  // Sin aprobación manual, el automatismo nunca pasa de 15 diarios.
  const capped = Math.min(ramp, WARMUP_AUTOMATIC_CEILING, input.configuredDailyLimit);
  return {
    limit: capped,
    stage:
      recommendation !== null
        ? `Día ${days} · automático ${capped}/día · puedes aprobar ${recommendation}/día`
        : `Día ${days} · automático ${capped}/día`,
    automatic: true,
    recommendation,
  };
}
