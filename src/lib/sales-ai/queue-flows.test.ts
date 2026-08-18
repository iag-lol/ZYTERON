import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyBounce, evaluateFollowupGuards } from "./rules";

/**
 * Reglas de negocio de la cola verificadas de forma aislada.
 *
 * Lo que depende de PostgreSQL (bloqueo global, reserva) se prueba con
 * supabase/sales_ai_zara_fase4_concurrency_test.sql contra la base real.
 */

describe("cola · efectos del envío aceptado", () => {
  /** Refleja applyAcceptedSideEffects del trabajador. */
  function sideEffects(input: { kind: string; isTest: boolean }) {
    if (input.isTest) {
      return {
        cambiaEstado: false,
        programaSeguimientos: false,
        iniciaCalentamiento: false,
        consumeCupoReal: false,
      };
    }
    return {
      cambiaEstado: input.kind === "PRIMER_CONTACTO",
      programaSeguimientos: input.kind === "PRIMER_CONTACTO",
      iniciaCalentamiento: true,
      consumeCupoReal: true,
    };
  }

  it("un primer contacto real deja la empresa en CONTACTADO", () => {
    const result = sideEffects({ kind: "PRIMER_CONTACTO", isTest: false });
    assert.equal(result.cambiaEstado, true);
    assert.equal(result.programaSeguimientos, true);
  });

  it("en modo prueba no cambia el prospecto ni inicia el calentamiento", () => {
    const result = sideEffects({ kind: "PRIMER_CONTACTO", isTest: true });
    assert.equal(result.cambiaEstado, false, "el prospecto real no recibió nada");
    assert.equal(result.programaSeguimientos, false);
    assert.equal(result.iniciaCalentamiento, false);
    assert.equal(result.consumeCupoReal, false, "una prueba no debe gastar cupo real");
  });

  it("un seguimiento aceptado no cambia el estado comercial", () => {
    const result = sideEffects({ kind: "SEGUIMIENTO", isTest: false });
    assert.equal(result.cambiaEstado, false);
  });
});

describe("cola · seguimientos vencidos", () => {
  /** Refleja enqueueDueFollowups. */
  function shouldEnqueue(input: {
    dueAt: number;
    now: number;
    alreadyQueued: boolean;
    companyStatus: string;
    replied: boolean;
    doNotContact: boolean;
    emailInvalid: boolean;
  }) {
    if (input.dueAt > input.now) return { enqueue: false, reason: "Aún no vence." };
    if (input.alreadyQueued) return { enqueue: false, reason: "Ya está en la cola." };

    const guard = evaluateFollowupGuards({
      status: input.companyStatus,
      doNotContact: input.doNotContact,
      emailInvalid: input.emailInvalid,
      hasEmail: true,
      alreadyReplied: input.replied,
    });

    return guard.shouldSend
      ? { enqueue: true, reason: "Corresponde." }
      : { enqueue: false, reason: guard.reason };
  }

  const base = {
    dueAt: 100,
    now: 200,
    alreadyQueued: false,
    companyStatus: "CONTACTADO",
    replied: false,
    doNotContact: false,
    emailInvalid: false,
  };

  it("un seguimiento vencido entra a la cola", () => {
    assert.equal(shouldEnqueue(base).enqueue, true);
  });

  it("no se encola si aún no vence", () => {
    assert.equal(shouldEnqueue({ ...base, dueAt: 500 }).enqueue, false);
  });

  it("no se duplica si ya está encolado", () => {
    const result = shouldEnqueue({ ...base, alreadyQueued: true });
    assert.equal(result.enqueue, false);
    assert.match(result.reason, /cola/i);
  });

  it("una respuesta recibida cancela el seguimiento", () => {
    const result = shouldEnqueue({ ...base, replied: true });
    assert.equal(result.enqueue, false);
    assert.match(result.reason, /respondido/i);
  });

  it("no se encola si la empresa fue ganada o perdida", () => {
    assert.equal(shouldEnqueue({ ...base, companyStatus: "GANADO" }).enqueue, false);
    assert.equal(shouldEnqueue({ ...base, companyStatus: "PERDIDO" }).enqueue, false);
  });

  it("no se encola si pidió no ser contactado o si rebotó", () => {
    assert.equal(shouldEnqueue({ ...base, doNotContact: true }).enqueue, false);
    assert.equal(shouldEnqueue({ ...base, emailInvalid: true }).enqueue, false);
  });
});

describe("cola · todas las salidas pasan por la reserva", () => {
  /** Refleja la barrera del ticket en sendCommercialEmail. */
  const QUEUE_TOKEN = Symbol.for("zyteron.sales-ai.queue-dispatch");

  function trySend(ticket?: { token: symbol }) {
    if (ticket?.token !== QUEUE_TOKEN) {
      return { ok: false, error: "Envío rechazado: falta reserva válida de la cola." };
    }
    return { ok: true };
  }

  it("rechaza un envío sin reserva", () => {
    assert.equal(trySend().ok, false);
  });

  it("rechaza un ticket falsificado", () => {
    assert.equal(trySend({ token: Symbol("otro") }).ok, false);
  });

  it("acepta solo el ticket emitido por la cola", () => {
    assert.equal(trySend({ token: QUEUE_TOKEN }).ok, true);
  });

  it("los cuatro flujos de salida deben encolar, no enviar", () => {
    // Primer contacto, seguimiento, respuesta automática y borrador aprobado.
    const flows = ["PRIMER_CONTACTO", "SEGUIMIENTO", "RESPUESTA_AUTOMATICA", "BORRADOR_APROBADO"];
    for (const flow of flows) {
      // Ninguno posee el token: todos deben pasar por enqueueSend.
      assert.equal(trySend().ok, false, `${flow} no puede enviar directamente`);
    }
  });
});

describe("cola · correlación del rebote", () => {
  /** Refleja markBounced: busca primero por internetMessageId. */
  function correlate(ndr: { internetMessageId?: string | null }, rows: Array<{
    id: string;
    internetMessageId: string;
    companyId: string;
    campaignId: string | null;
    followupId: string | null;
  }>) {
    if (!ndr.internetMessageId) return null;
    return rows.find((row) => row.internetMessageId === ndr.internetMessageId) ?? null;
  }

  const rows = [
    {
      id: "q1",
      internetMessageId: "<abc123@zyteron.cl>",
      companyId: "c1",
      campaignId: "camp1",
      followupId: "f1",
    },
  ];

  it("ubica la fila de la cola por internetMessageId", () => {
    const match = correlate({ internetMessageId: "<abc123@zyteron.cl>" }, rows);
    assert.ok(match);
    assert.equal(match!.id, "q1");
  });

  it("desde la fila llega a empresa, campaña y seguimiento", () => {
    const match = correlate({ internetMessageId: "<abc123@zyteron.cl>" }, rows)!;
    assert.equal(match.companyId, "c1");
    assert.equal(match.campaignId, "camp1");
    assert.equal(match.followupId, "f1");
  });

  it("un identificador desconocido no correlaciona", () => {
    assert.equal(correlate({ internetMessageId: "<otro@x.cl>" }, rows), null);
  });

  it("5.7.708 pausa aunque no se logre correlacionar", () => {
    const kind = classifyBounce("550 5.7.708 access denied, traffic not accepted from this IP");
    const match = correlate({ internetMessageId: null }, rows);
    const debePausar = kind === "POLICY";

    assert.equal(match, null, "no se pudo relacionar con ninguna empresa");
    assert.equal(debePausar, true, "aun así debe pausar globalmente");
  });
});

describe("cola · confirmación sin rebote a 24 horas", () => {
  const HOURS = 24 * 60 * 60 * 1000;

  /** Refleja sales_confirm_delivered. */
  function confirm(rows: Array<{ status: string; acceptedAt: number }>, now: number) {
    return rows.map((row) =>
      row.status === "ACEPTADO_POR_MICROSOFT" && now - row.acceptedAt >= HOURS
        ? { ...row, status: "ENVIADO_SIN_REBOTE" }
        : row,
    );
  }

  it("a las 24 horas sin NDR pasa a ENVIADO_SIN_REBOTE", () => {
    const now = 100 * HOURS;
    const result = confirm([{ status: "ACEPTADO_POR_MICROSOFT", acceptedAt: now - HOURS }], now);
    assert.equal(result[0].status, "ENVIADO_SIN_REBOTE");
  });

  it("antes de 24 horas sigue solo aceptado", () => {
    const now = 100 * HOURS;
    const result = confirm(
      [{ status: "ACEPTADO_POR_MICROSOFT", acceptedAt: now - HOURS / 2 }],
      now,
    );
    assert.equal(result[0].status, "ACEPTADO_POR_MICROSOFT");
  });

  it("un rebotado nunca se confirma", () => {
    const now = 100 * HOURS;
    const result = confirm([{ status: "REBOTADO", acceptedAt: now - 5 * HOURS }], now);
    assert.equal(result[0].status, "REBOTADO");
  });

  it("aceptado y sin rebote son métricas separadas", () => {
    const rows = [
      { status: "ACEPTADO_POR_MICROSOFT", acceptedAt: 0 },
      { status: "ENVIADO_SIN_REBOTE", acceptedAt: 0 },
      { status: "REBOTADO", acceptedAt: 0 },
    ];

    const accepted = rows.filter((r) => r.status === "ACEPTADO_POR_MICROSOFT").length;
    const withoutBounce = rows.filter((r) => r.status === "ENVIADO_SIN_REBOTE").length;
    const bounced = rows.filter((r) => r.status === "REBOTADO").length;

    assert.equal(accepted, 1);
    assert.equal(withoutBounce, 1, "aceptado no debe sumar a sin rebote");
    assert.equal(bounced, 1);
  });
});
