import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { checkOutreachQuality, decideImportRow, type ImportRowStatus } from "./rules";

/**
 * Flujo "Importar y comenzar".
 *
 * Lo que se puede comprobar en proceso son las reglas puras y las invariantes
 * del código. Lo que depende de PostgreSQL (reserva atómica bajo bloqueo y el
 * reinicio operativo) se valida contra una base real con
 * supabase/sales_ai_zara_fase4_concurrency_test.sql y
 * supabase/sales_ai_zara_reset_operativo.sql; aquí se verifica que esas piezas
 * existan y que el código siga usándolas.
 */

const SALES_DIR = path.join(process.cwd(), "src", "lib", "sales-ai");
const SUPABASE_DIR = path.join(process.cwd(), "supabase");
const leer = (file: string) => readFileSync(path.join(SALES_DIR, file), "utf8");

/** Código sin comentarios: evita que una mención en una nota falsee la prueba. */
function codigo(file: string) {
  return leer(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
    .join("\n");
}

/** Una planilla de 100 empresas nuevas con correo. */
function planillaValida(n: number): ImportRowStatus[] {
  return Array.from({ length: n }, () => "VALIDO" as ImportRowStatus);
}

describe("importación · una sola confirmación pone a trabajar a Zara", () => {
  it("100 empresas válidas generan 100 trabajos sin selección manual", () => {
    const decisiones = planillaValida(100).map(decideImportRow);

    assert.equal(decisiones.filter((d) => d.shouldImport).length, 100);
    assert.equal(
      decisiones.filter((d) => d.shouldQueue).length,
      100,
      "las 100 deben quedar encoladas por la sola confirmación de la importación",
    );
  });

  it("la importación no envía correo: no toca el módulo de envío", () => {
    const importer = leer("importer.ts");

    for (const prohibido of ["mailer", "sendCommercialEmail", "graph-client"]) {
      assert.ok(
        !importer.includes(prohibido),
        `importer.ts referencia ${prohibido}: la importación no puede enviar correo`,
      );
    }
  });

  it("la importación no llama a la IA: no toca el redactor", () => {
    const importer = leer("importer.ts");
    for (const prohibido of ["composer", "openai", "OPENAI"]) {
      assert.ok(
        !importer.includes(prohibido),
        `importer.ts referencia ${prohibido}: redactar dentro de la petición HTTP la haría caer por tiempo`,
      );
    }
  });

  it("encola en PENDIENTE_ANALISIS, no listo para enviar", () => {
    const importer = leer("importer.ts");
    assert.ok(
      /readyToSchedule:\s*false/.test(importer),
      "debe encolar sin marcar listo para programar, para que el cron analice después",
    );
  });

  it("no usa Promise.all para redactar ni enviar", () => {
    for (const file of ["importer.ts", "queue-worker.ts", "outreach.ts"]) {
      assert.ok(
        !codigo(file).includes("Promise.all"),
        `${file} usa Promise.all: el despacho en paralelo fue lo que provocó la ráfaga rechazada`,
      );
    }
  });
});

describe("importación · deduplicación", () => {
  it("volver a subir la misma planilla no crea empresas ni trabajos", () => {
    // La segunda subida clasifica todo como duplicado.
    const decisiones = Array.from({ length: 100 }, () => decideImportRow("DUPLICADO"));

    assert.equal(decisiones.filter((d) => d.shouldImport).length, 0);
    assert.equal(decisiones.filter((d) => d.shouldQueue).length, 0);
  });

  it("revalida duplicados y opt-outs dentro de la propia importación", () => {
    const importer = leer("importer.ts");
    const cuerpo = importer.slice(importer.indexOf("export async function executeImport"));

    assert.ok(
      cuerpo.includes("findDuplicate"),
      "sin una segunda verificación, dos importaciones simultáneas crean la misma empresa dos veces",
    );
    assert.ok(cuerpo.includes("isOptedOut"), "un opt-out registrado entre la vista previa y la importación debe respetarse");
  });

  it("una violación de clave única se cuenta como duplicado, no como error", () => {
    const importer = leer("importer.ts");
    assert.ok(
      /duplicate key\|already exists\|23505/.test(importer),
      "la carrera perdida contra otra importación es un duplicado esperado",
    );
  });
});

describe("importación · a quién se le escribe", () => {
  it("una empresa sin correo entra al CRM pero nunca a la cola", () => {
    const decision = decideImportRow("SIN_EMAIL");
    assert.equal(decision.shouldImport, true);
    assert.equal(decision.shouldQueue, false);
  });

  it("una dirección que pidió exclusión no se importa", () => {
    const decision = decideImportRow("OPT_OUT");
    assert.equal(decision.shouldImport, false);
    assert.equal(decision.shouldQueue, false);
  });

  it("una fila sin nombre de empresa se descarta", () => {
    const decision = decideImportRow("INVALIDO");
    assert.equal(decision.shouldImport, false);
    assert.equal(decision.shouldQueue, false);
  });
});

describe("importación · la configuración manda", () => {
  it("con Zara pausada se importa, pero el análisis no avanza", () => {
    const worker = leer("queue-worker.ts");
    assert.ok(
      /if \(settings\.zara_paused\) return/.test(worker),
      "el trabajador debe cortar antes de analizar cuando Zara está pausada",
    );

    // La importación no consulta la pausa: encolar es seguro incluso pausada.
    assert.ok(
      !leer("importer.ts").includes("zara_paused"),
      "importar debe seguir permitido con Zara pausada: solo crea trabajo pendiente",
    );
  });

  it("la pausa también corta el envío", () => {
    const mailer = leer("mailer.ts");
    assert.ok(
      mailer.includes("Zara está pausada por el administrador."),
      "checkSendGuards debe rechazar el envío con Zara pausada",
    );
  });

  it("en modo prueba todo se redirige al destinatario autorizado", () => {
    const mailer = leer("mailer.ts");
    const guardas = mailer.slice(mailer.indexOf("if (settings.test_mode)"));

    assert.ok(
      guardas.includes("recipient: testRecipient") && guardas.includes("redirected: true"),
      "con test_mode el destinatario real debe sustituirse por el de pruebas",
    );
    assert.ok(
      guardas.includes("Modo prueba activo pero sin destinatario de pruebas configurado."),
      "sin destinatario de pruebas configurado no puede enviarse nada",
    );
  });

  it("la importación no altera ningún ajuste de operación", () => {
    const importer = leer("importer.ts");
    for (const ajuste of [
      "zara_paused",
      "test_mode",
      "daily_send_limit",
      "hourly_send_limit",
      "updateSalesSetting",
    ]) {
      assert.ok(!importer.includes(ajuste), `importer.ts toca ${ajuste}: la importación no debe cambiar la configuración`);
    }
  });
});

describe("envío · ritmo y exclusividad", () => {
  it("la reserva del siguiente envío es atómica en la base", () => {
    const queue = leer("queue.ts");
    assert.ok(
      queue.includes("sales_claim_next_send"),
      "la reserva debe delegarse en la función SQL con bloqueo, no resolverse en la aplicación",
    );
  });

  it("existe la prueba de concurrencia contra la base real", () => {
    const sql = readFileSync(
      path.join(SUPABASE_DIR, "sales_ai_zara_fase4_concurrency_test.sql"),
      "utf8",
    );
    assert.ok(sql.length > 0);
  });

  it("cada ejecución del cron despacha como máximo un correo", () => {
    const worker = leer("queue-worker.ts");
    assert.ok(
      worker.includes("processOneSend"),
      "el ciclo debe llamar al despachador de a uno",
    );
    assert.ok(
      !/processOneSend\(\)[\s\S]{0,80}for \(/.test(worker),
      "no debe haber un bucle de despacho dentro del ciclo",
    );
  });
});

describe("calidad del correo · sin línea de baja", () => {
  const base = {
    subject: "Propuesta de sitio web para Transportes del Maule",
    confidence: 0.9,
    requires_review: false,
    review_reason: "",
  };

  /** Cuerpo válido de 150 palabras que menciona a la empresa. */
  function cuerpo(extra = "") {
    const relleno = Array.from({ length: 140 }, (_, i) => `palabra${i}`).join(" ");
    return `Hola Marcela,\n\nEn Transportes del Maule ${relleno}\n\n¿Les sirve que se la envíe?${extra}`;
  }

  it("un correo sin línea de baja pasa el control", () => {
    const issues = checkOutreachQuality(
      { ...base, body_text: cuerpo() } as never,
      { name: "Transportes del Maule", contactName: "Marcela" },
    );
    assert.deepEqual(
      issues.filter((i) => i.reason.includes("baja o exclusión")),
      [],
    );
  });

  it("rechaza la frase eliminada si el modelo la reintroduce", () => {
    const issues = checkOutreachQuality(
      {
        ...base,
        body_text: cuerpo("\n\nSi prefieren no recibir más correos, háganmelo saber."),
      } as never,
      { name: "Transportes del Maule", contactName: "Marcela" },
    );
    assert.ok(
      issues.some((i) => i.reason.includes("baja o exclusión")),
      "la frase retirada no puede volver por la vía del modelo",
    );
  });

  it("rechaza también variantes de la misma idea", () => {
    const variantes = [
      "Si no desean recibir más correos, avísenme.",
      "Pueden darse de baja respondiendo este mensaje.",
      "Avíseme si no desea que le escriba nuevamente.",
    ];

    for (const variante of variantes) {
      const issues = checkOutreachQuality(
        { ...base, body_text: cuerpo(`\n\n${variante}`) } as never,
        { name: "Transportes del Maule", contactName: "Marcela" },
      );
      assert.ok(
        issues.some((i) => i.reason.includes("baja o exclusión")),
        `no detectó la variante: ${variante}`,
      );
    }
  });

  it("el prompt ya no pide esa línea", () => {
    const composer = leer("composer.ts");
    assert.ok(!composer.includes("pedir no recibir más correos"));
    assert.ok(
      composer.includes("Con esto termina el correo."),
      "el cierre del correo debe ser la pregunta final",
    );
  });

  it("conserva la protección de entrada de los opt-out", () => {
    const inbound = leer("inbound.ts");
    assert.ok(
      inbound.includes("markDoNotContact"),
      "quitar la frase visible no puede desactivar el registro del opt-out entrante",
    );
  });

  it("un texto insuficiente queda marcado para revisión", () => {
    const issues = checkOutreachQuality(
      { ...base, body_text: "Hola, les escribo de Zyteron. ¿Conversamos?" } as never,
      { name: "Transportes del Maule", contactName: "Marcela" },
    );
    assert.ok(
      issues.some((i) => i.field === "body_text"),
      "un correo demasiado corto no puede salir sin revisión",
    );
  });
});

describe("reinicio operativo · alcance del script", () => {
  const reset = readFileSync(path.join(SUPABASE_DIR, "sales_ai_zara_reset_operativo.sql"), "utf8");

  const OPERATIVAS = [
    "sales_send_queue",
    "sales_campaign_targets",
    "sales_drafts",
    "sales_followups",
    "sales_messages",
    "sales_threads",
    "sales_events",
    "sales_proposals",
    "sales_campaigns",
    "sales_import_batches",
    "sales_webhook_log",
    "sales_companies",
  ];

  const CONSERVADAS = [
    "sales_settings",
    "sales_mail_account",
    "sales_opt_outs",
    "sales_ai_activity",
    "sales_ai_budget_usage",
  ];

  it("declara exactamente las doce tablas operativas", () => {
    const lista = reset.slice(reset.indexOf("v_operativas"), reset.indexOf("v_conservadas"));
    for (const tabla of OPERATIVAS) {
      assert.ok(lista.includes(`'${tabla}'`), `falta ${tabla} en el borrado`);
    }
    for (const tabla of CONSERVADAS) {
      assert.ok(!lista.includes(`'${tabla}'`), `${tabla} no debe borrarse`);
    }
  });

  it("protege configuración, Microsoft, opt-outs y costos", () => {
    const guardadas = reset.slice(reset.indexOf("v_conservadas"));
    for (const tabla of CONSERVADAS) {
      assert.ok(guardadas.includes(`'${tabla}'`), `${tabla} debe estar en la guarda`);
    }
  });

  it("exige la confirmación antes de borrar nada", () => {
    assert.ok(reset.includes("REINICIAR ZARA"));
    const confirmacion = reset.indexOf("is distinct from 'REINICIAR ZARA'");
    const primerBorrado = reset.indexOf("delete from public.%I");
    assert.ok(confirmacion > 0 && confirmacion < primerBorrado, "la confirmación debe evaluarse antes del borrado");
  });

  it("no toca la estructura de la base", () => {
    const sinComentarios = reset
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");

    for (const peligro of ["drop table", "drop index", "truncate", "drop policy", "drop function"]) {
      assert.ok(
        !sinComentarios.toLowerCase().includes(peligro),
        `el reinicio no puede ejecutar ${peligro}`,
      );
    }
  });

  it("revierte por completo si una tabla conservada pierde filas", () => {
    assert.ok(
      reset.includes("REINICIO REVERTIDO"),
      "debe existir una guarda que lance excepción y deshaga la transacción",
    );
  });
});
