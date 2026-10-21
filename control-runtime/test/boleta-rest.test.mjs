import test from "node:test";
import assert from "node:assert/strict";
import {
  BoletaRestTransport,
  boletaReceipt,
  boletaDocumentStatus,
  boletaRestHost,
} from "../dist/finance/finance.boleta-rest.js";
const company = "11111111-1",
  sender = "22222222-2",
  trackId = "123456789012345";
const receipt = { rut_emisor: company, rut_envia: sender, trackid: Number(trackId), estado: "REC" };
const expected = { companyRut: company, trackId, type: 39, folio: 7 };
const result = (patch = {}) => ({
  ...receipt,
  estado: "EPR",
  estadistica: [{ tipo: 39, informados: 1, aceptados: 1, rechazados: 0, reparos: 0 }],
  ...patch,
});
const document = {
  emitterRut: company,
  environment: "CERTIFICATION",
  trackId,
  documentTypeCode: 39,
  folio: 7,
};
const json = (data) =>
  new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
test("REST mantiene ambientes y plataformas de envío separados", () => {
  assert.equal(boletaRestHost("CERTIFICATION"), "apicert.sii.cl");
  assert.equal(boletaRestHost("CERTIFICATION", true), "pangal.sii.cl");
  assert.equal(boletaRestHost("PRODUCTION"), "api.sii.cl");
  assert.equal(boletaRestHost("PRODUCTION", true), "rahue.sii.cl");
  assert.throws(() => boletaRestHost("other"));
});
test("recepción exige emisor, firmante, estado y Track ID oficiales compatibles", () => {
  assert.equal(boletaReceipt(receipt, company, sender), trackId);
  for (const patch of [
    { rut_emisor: sender },
    { rut_envia: company },
    { estado: "EPR" },
    { trackid: 0 },
    { trackid: 1e16 },
    { trackid: "../x" },
    { trackid: null },
  ])
    assert.throws(() => boletaReceipt({ ...receipt, ...patch }, company, sender));
});
test("estado distingue aceptación, rechazo, reparos y evidencia incompleta", () => {
  assert.equal(boletaDocumentStatus(result(), expected).status, "ACCEPTED");
  assert.equal(
    boletaDocumentStatus(
      result({
        estadistica: [{ tipo: 39, informados: 1, aceptados: 0, rechazados: 1, reparos: 0 }],
      }),
      expected,
    ).status,
    "REJECTED",
  );
  assert.equal(
    boletaDocumentStatus(
      result({
        estado: "RPR",
        estadistica: [{ tipo: 39, informados: 1, aceptados: 0, rechazados: 0, reparos: 1 }],
      }),
      expected,
    ).status,
    "ACCEPTED_WITH_REPAIRS",
  );
  for (const estado of ["REC", "PRD", "CRT", "FOK", "SOK", "VOF", "RPT", "unknown"])
    assert.equal(boletaDocumentStatus(result({ estado }), expected).status, "RECEIVED_BY_SII");
  for (const estado of ["RCH", "RCO", "RFR", "RSC", "RCT"])
    assert.equal(boletaDocumentStatus(result({ estado }), expected).status, "REJECTED");
  assert.equal(
    boletaDocumentStatus(result({ estadistica: [] }), expected).status,
    "RECEIVED_BY_SII",
  );
  assert.equal(
    boletaDocumentStatus(
      result({
        estado: "RPR",
        estadistica: [{ tipo: 39, informados: 1, aceptados: 0, rechazados: 0, reparos: 0 }],
      }),
      expected,
    ).status,
    "RECEIVED_BY_SII",
  );
});
test("diagnósticos o estadísticas de otro documento nunca aceptan esta boleta", () => {
  for (const patch of [
    { rut_emisor: sender },
    { trackid: 123 },
    { estadistica: [{ tipo: 41, informados: 1, aceptados: 1, rechazados: 0, reparos: 0 }] },
    { estadistica: [{ tipo: 39, informados: 1, aceptados: 1, rechazados: 1, reparos: 0 }] },
    { detalle_rep_rech: [{ tipo: 39, folio: 8, estado: "RPR" }] },
    { detalle_rep_rech: [{ tipo: 41, folio: 7, estado: "RPR" }] },
    { detalle_rep_rech: [{ tipo: 39, folio: 7, estado: "RCH" }] },
    { detalle_rep_rech: {} },
  ])
    assert.throws(() => boletaDocumentStatus(result(patch), expected));
});
test("carga REST archiva antes del único POST y valida el recibo JSON", async () => {
  const original = global.fetch,
    events = [];
  global.fetch = async (url, options) => {
    events.push("POST");
    assert.equal(url, "https://pangal.sii.cl/recursos/v1/boleta.electronica.envio");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers.Cookie, "TOKEN=synthetic-token");
    assert.equal(options.headers["Content-Type"], undefined);
    assert.equal(options.body.get("rutCompany"), "11111111");
    assert.equal(options.body.get("dvCompany"), "1");
    assert.equal(options.body.get("archivo").name, "envio_7.xml");
    assert.equal(await options.body.get("archivo").text(), "<synthetic/>");
    return json(receipt);
  };
  try {
    const transport = new BoletaRestTransport(async () => {
      events.push("auth");
      return "synthetic-token";
    });
    assert.equal(
      await transport.send(
        "<synthetic/>",
        "CERTIFICATION",
        company,
        sender,
        "envio_7.xml",
        async () => events.push("archive"),
      ),
      trackId,
    );
    assert.deepEqual(events, ["auth", "archive", "POST"]);
  } finally {
    global.fetch = original;
  }
});
test("fallo del registro previo impide POST y timeout nunca retransmite", async () => {
  const original = global.fetch;
  let posts = 0;
  global.fetch = async () => {
    posts++;
    throw Error("synthetic timeout");
  };
  const transport = new BoletaRestTransport(async () => "synthetic-token");
  try {
    await assert.rejects(
      transport.send("<synthetic/>", "CERTIFICATION", company, sender, "envio_7.xml", async () => {
        throw Error("archive failed");
      }),
    );
    assert.equal(posts, 0);
    await assert.rejects(
      transport.send("<synthetic/>", "CERTIFICATION", company, sender, "envio_7.xml"),
    );
    assert.equal(posts, 1);
  } finally {
    global.fetch = original;
  }
});
test("consulta REST usa el Track ID persistente y rechaza rutas o respuestas inválidas", async () => {
  const original = global.fetch;
  let requests = 0;
  global.fetch = async (url, options) => {
    requests++;
    assert.equal(
      url,
      `https://apicert.sii.cl/recursos/v1/boleta.electronica.envio/${company}-${trackId}`,
    );
    assert.equal(options.redirect, "error");
    return json(result());
  };
  const transport = new BoletaRestTransport(async () => "synthetic-token");
  try {
    assert.equal((await transport.status(document, company)).status, "ACCEPTED");
    await assert.rejects(transport.status({ ...document, trackId: "../wrong" }, company));
    await assert.rejects(transport.status({ ...document, emitterRut: sender }, company));
    assert.equal(requests, 1);
    for (const response of [
      new Response("No existe recurso", { headers: { "Content-Type": "text/plain" } }),
      new Response("{}", { status: 401 }),
      new Response("{", { headers: { "Content-Type": "application/json" } }),
      new Response('"' + "x".repeat(1024 * 1024) + '"', {
        headers: { "Content-Type": "application/json" },
      }),
    ]) {
      global.fetch = async () => response;
      await assert.rejects(transport.status(document, company));
    }
  } finally {
    global.fetch = original;
  }
});
