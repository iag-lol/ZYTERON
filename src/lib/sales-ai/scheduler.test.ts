import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ABSOLUTE_MIN_GAP_MINUTES,
  BANDS,
  MAX_GAP_MINUTES,
  MIN_GAP_MINUTES,
  bandForMinute,
  computeNextSendAt,
  effectiveDailyLimit,
  gapRangeForDailyLimit,
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

describe("calentamiento · tope automático corregido", () => {
  const started = "2026-08-01T00:00:00.000Z";

  it("días 1 y 2 permiten 10 diarios", () => {
    assert.equal(warmupDailyLimit(1), 10);
    assert.equal(warmupDailyLimit(2), 10);
  });

  it("desde el día 3 el automatismo llega a 15 y no sube más", () => {
    assert.equal(warmupDailyLimit(3), 15);
    assert.equal(warmupDailyLimit(5), 15);
    assert.equal(warmupDailyLimit(8), 15);
    assert.equal(warmupDailyLimit(30), 15);
  });

  it("el día 5 recomienda 20 sin aplicarlo", () => {
    const result = effectiveDailyLimit({
      warmupStartedOn: started,
      configuredDailyLimit: 30,
      now: new Date("2026-08-05T00:00:00.000Z"),
    });
    assert.equal(result.limit, 15, "no debe aplicarse solo");
    assert.equal(result.recommendation, 20);
    assert.equal(result.automatic, true);
  });

  it("el día 8 recomienda 30 sin aplicarlo", () => {
    const result = effectiveDailyLimit({
      warmupStartedOn: started,
      configuredDailyLimit: 30,
      now: new Date("2026-08-10T00:00:00.000Z"),
    });
    assert.equal(result.limit, 15);
    assert.equal(result.recommendation, 30);
  });

  it("solo la aprobación manual supera los 15", () => {
    const result = effectiveDailyLimit({
      warmupStartedOn: started,
      manualOverride: 30,
      configuredDailyLimit: 30,
      now: new Date("2026-08-10T00:00:00.000Z"),
    });
    assert.equal(result.limit, 30);
    assert.equal(result.automatic, false);
  });

  it("sin fecha de inicio el calentamiento no ha comenzado", () => {
    const result = effectiveDailyLimit({ warmupStartedOn: null, configuredDailyLimit: 30 });
    assert.equal(result.limit, 10);
    assert.match(result.stage, /primer envío real/);
  });
});

describe("cadencia · la separación se deriva del objetivo diario", () => {
  it("sin objetivo declarado conserva el rango histórico", () => {
    const range = gapRangeForDailyLimit(undefined);
    assert.equal(range.min, MIN_GAP_MINUTES);
    assert.equal(range.max, MAX_GAP_MINUTES);
  });

  it("con 30 diarios acorta la separación lo suficiente para completarlos", () => {
    const range = gapRangeForDailyLimit(30);
    // Con la separación media el día tiene que dar para los 30 envíos.
    const media = (range.min + range.max) / 2;
    assert.ok(
      (24 * 60) / media >= 30,
      `con separación media de ${media} min solo caben ${Math.floor((24 * 60) / media)} envíos`,
    );
  });

  it("con 20 diarios se mantiene cerca de la cadencia previa", () => {
    const range = gapRangeForDailyLimit(20);
    assert.ok(range.min >= 30 && range.min <= 40, `mínimo inesperado: ${range.min}`);
    assert.ok(range.max >= 100 && range.max <= 115, `máximo inesperado: ${range.max}`);
  });

  it("nunca baja del piso de seguridad, por alto que sea el objetivo", () => {
    for (const objetivo of [60, 200, 1000]) {
      const range = gapRangeForDailyLimit(objetivo);
      assert.ok(
        range.min >= ABSOLUTE_MIN_GAP_MINUTES,
        `${objetivo} diarios produjo una separación de ${range.min} min`,
      );
    }
  });

  it("reparte 30 envíos sin agrupar dos en el mismo minuto", () => {
    const now = new Date("2026-08-22T12:00:00.000Z");
    const dates = rescheduleBacklog(30, { now, random: Math.random, dailyLimit: 30 });
    const minutos = dates.map((date) => Math.floor(date.getTime() / 60_000));
    assert.equal(new Set(minutos).size, 30, "hay envíos programados en el mismo minuto");

    for (let index = 1; index < dates.length; index += 1) {
      const gap = (dates[index].getTime() - dates[index - 1].getTime()) / 60_000;
      assert.ok(
        gap >= ABSOLUTE_MIN_GAP_MINUTES,
        `separación de ${gap} min por debajo del piso de seguridad`,
      );
    }
  });

  it("la separación es irregular: no repite el mismo intervalo", () => {
    const now = new Date("2026-08-22T12:00:00.000Z");
    const dates = rescheduleBacklog(20, { now, random: Math.random, dailyLimit: 30 });
    const gaps = dates
      .slice(1)
      .map((date, index) => (date.getTime() - dates[index].getTime()) / 60_000);

    // Un patrón fijo delataría automatización: se exige variedad real.
    assert.ok(new Set(gaps).size > 5, `sólo ${new Set(gaps).size} separaciones distintas`);
  });
});
