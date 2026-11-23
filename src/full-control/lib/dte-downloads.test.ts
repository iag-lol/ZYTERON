import assert from "node:assert/strict";
import test from "node:test";
import { dtePdfAvailable } from "./dte-downloads";

const signed = { provider: "SII_DIRECT" as const, folio: 17, pdfPath: null, xmlSignedPath: "dte/production/33/17/signed.xml", xmlSignedSha256: "a".repeat(64) };

test("la descarga ofrece PDF de SII directo sin exigir un PDF almacenado", () => {
  assert.equal(dtePdfAvailable(signed), true);
});

test("no ofrece generación sin folio, XML firmado o huella ni a otro proveedor", () => {
  for (const patch of [{ folio: null }, { folio: 0 }, { xmlSignedPath: null }, { xmlSignedSha256: null }, { provider: "EXTERNAL" as const }]) {
    assert.equal(dtePdfAvailable({ ...signed, ...patch }), false);
  }
});

test("conserva la descarga de PDF archivado por un proveedor externo", () => {
  assert.equal(dtePdfAvailable({ ...signed, provider: "EXTERNAL", xmlSignedPath: null, xmlSignedSha256: null, pdfPath: "dte/external/document.pdf" }), true);
});
