import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BANDS,
  MAX_GAP_MINUTES,
  MIN_GAP_MINUTES,
  bandForMinute,
  computeNextSendAt,
  effectiveDailyLimit,
  minutesOfDayInZone,
  pickBand,
  rescheduleBacklog,
  warmupDailyLimit,
} from "./scheduler";

/** Generador determinista, para que las pruebas no dependan del azar. */
function seeded(values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("programación · separación entre envíos", () => {
  const now = new Date("2026-08-18T14:00:00.000Z");

  it("nunca programa dos correos en el mismo minuto", () => {
    const dates = rescheduleBacklog(20, { now, random: Math.random });
    const minutes = dates.map((date) => Math.floor(date.getTime() / 60_000));
    assert.equal(new Set(minutes).size, minutes.length);
  });

  it("respeta la separación mínima de 35 minutos", () => {
    const dates = rescheduleBacklog(15, { now, random: Math.random });
    for (let i = 1; i < dates.length; i += 1) {
      const gapMinutes = (dates[i].getTime() - dates[i - 1].getTime()) / 60_000;
      assert.ok(
        gapMinutes >= MIN_GAP_MINUTES,
        `separación ${gapMinutes} menor al mínimo de ${MIN_GAP_MINUTES}`,
      );
    }
  });

  it("nunca programa en el pasado", () => {
    for (let i = 0; i < 30; i += 1) {
      const next = computeNextSendAt({ now, random: Math.random });
      assert.ok(next.getTime() > now.getTime());
    }
  });

  it("encadena a partir del último programado", () => {
    const last = new Date(now.getTime() + 6 * 60 * 60_000);
    const next = computeNextSendAt({ now, lastScheduledAt: last, random: Math.random });
    assert.ok(next.getTime() >= last.getTime() + MIN_GAP_MINUTES * 60_000);
  });

  it("una separación cae dentro del rango declarado", () => {
    // random fijo en 0 => separación mínima; banda laboral.
    const next = computeNextSendAt({ now, random: seeded([0, 0, 0]) });
    const gap = (next.getTime() - now.getTime()) / 60_000;
    assert.ok(gap >= MIN_GAP_MINUTES && gap <= MAX_GAP_MINUTES + 24 * 60);
  });
});

describe("programación · bandas horarias", () => {
  it("clasifica correctamente cada franja", () => {
    assert.equal(bandForMinute(9 * 60).id, "LABORAL");
    assert.equal(bandForMinute(20 * 60).id, "TARDE");
    assert.equal(bandForMinute(3 * 60).id, "MADRUGADA");
  });

  it("los pesos suman 1", () => {
    const total = BANDS.reduce((sum, band) => sum + band.weight, 0);
    assert.ok(Math.abs(total - 1) < 0.0001);
  });

  it("elige la banda según el peso configurado", () => {
    assert.equal(pickBand(() => 0.1).id, "LABORAL");
    assert.equal(pickBand(() => 0.7).id, "TARDE");
    assert.equal(pickBand(() => 0.95).id, "MADRUGADA");
  });

  it("reparte aproximadamente 60/25/15 en volumen", () => {
    const counts: Record<string, number> = { LABORAL: 0, TARDE: 0, MADRUGADA: 0 };
    for (let i = 0; i < 3000; i += 1) counts[pickBand().id] += 1;

    assert.ok(Math.abs(counts.LABORAL / 3000 - 0.6) < 0.05, `laboral ${counts.LABORAL / 3000}`);
    assert.ok(Math.abs(counts.TARDE / 3000 - 0.25) < 0.05, `tarde ${counts.TARDE / 3000}`);
    assert.ok(Math.abs(counts.MADRUGADA / 3000 - 0.15) < 0.05, `madrugada ${counts.MADRUGADA / 3000}`);
  });

  it("interpreta la hora en la zona de Santiago", () => {
    // 14:00 UTC son las 10:00 en Santiago (UTC-4).
    const minute = minutesOfDayInZone(new Date("2026-08-18T14:00:00.000Z"));
    assert.ok(minute >= 9 * 60 && minute <= 11 * 60, `minuto ${minute}`);
  });
});

describe("programación · el reinicio no altera las horas", () => {
  it("una fecha ya calculada no cambia al releerla", () => {
    // La hora se persiste como texto ISO: releerla debe dar el mismo instante.
    const scheduled = computeNextSendAt({ now: new Date("2026-08-18T14:00:00.000Z") });
    const stored = scheduled.toISOString();
    const reloaded = new Date(stored);
    assert.equal(reloaded.getTime(), scheduled.getTime());
    assert.equal(reloaded.toISOString(), stored);
  });

  it("reprogramar el atraso reparte en vez de agrupar", () => {
    const dates = rescheduleBacklog(10, { now: new Date("2026-08-18T14:00:00.000Z") });
    const first = dates[0].getTime();
    const last = dates[dates.length - 1].getTime();
    const spanHours = (last - first) / 3_600_000;
    // Diez envíos con separación mínima de 35 minutos ocupan al menos 5 horas.
    assert.ok(spanHours >= 5, `se repartieron en ${spanHours} horas`);
  });
});

describe("calentamiento del buzón", () => {
  it("sigue la rampa por días", () => {
    assert.equal(warmupDailyLimit(1), 10);
    assert.equal(warmupDailyLimit(2), 10);
    assert.equal(warmupDailyLimit(3), 15);
    assert.equal(warmupDailyLimit(4), 15);
    assert.equal(warmupDailyLimit(6), 20);
    assert.equal(warmupDailyLimit(9), 30);
  });

  it("sin fecha de inicio parte en 10 diarios", () => {
    const result = effectiveDailyLimit({ warmupStartedOn: null, configuredDailyLimit: 30 });
    assert.equal(result.limit, 10);
  });

  it("no sube solo por encima de 15 diarios", () => {
    // Día 9: la rampa diría 30, pero sin aprobación manual el tope es 15.
    const result = effectiveDailyLimit({
      warmupStartedOn: "2026-08-01T00:00:00.000Z",
      configuredDailyLimit: 30,
      now: new Date("2026-08-18T00:00:00.000Z"),
    });
    assert.equal(result.limit, 15);
    assert.equal(result.automatic, true);
  });

  it("respeta el aumento manual del administrador", () => {
    const result = effectiveDailyLimit({
      warmupStartedOn: "2026-08-01T00:00:00.000Z",
      manualOverride: 25,
      configuredDailyLimit: 30,
      now: new Date("2026-08-18T00:00:00.000Z"),
    });
    assert.equal(result.limit, 25);
    assert.equal(result.automatic, false);
  });

  it("nunca supera el límite configurado", () => {
    const result = effectiveDailyLimit({
      warmupStartedOn: "2026-08-01T00:00:00.000Z",
      manualOverride: 100,
      configuredDailyLimit: 20,
      now: new Date("2026-08-18T00:00:00.000Z"),
    });
    assert.equal(result.limit, 20);
  });
});
