import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Workbook } from "exceljs";

import { parseSpreadsheetRows } from "./spreadsheet-parser";

function toArrayBuffer(bytes: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (bytes instanceof ArrayBuffer) return bytes;

  const copy = new Uint8Array(bytes.byteLength);
  copy.set(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  return copy.buffer;
}

describe("lector de planillas de prospectos", () => {
  it("lee la primera hoja XLSX y normaliza sus valores", async () => {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet("Prospectos");
    worksheet.addRow(["Nombre empresa", "Correo", "Monto"]);
    worksheet.addRow(["  Acme SpA  ", " ventas@acme.cl ", 1250]);

    const output = await workbook.xlsx.writeBuffer();
    const parsed = await parseSpreadsheetRows(toArrayBuffer(output));

    assert.deepEqual(parsed.headers, ["Nombre empresa", "Correo", "Monto"]);
    assert.deepEqual(parsed.rows, [
      { "Nombre empresa": "Acme SpA", Correo: "ventas@acme.cl", Monto: "1250" },
    ]);
  });

  it("detecta CSV separado por punto y coma, BOM y campos entre comillas", async () => {
    const csv = Buffer.from(
      '\uFEFFNombre empresa;Correo;Notas\r\n Acme SpA ; ventas@acme.cl ;"hola, equipo"\r\n',
      "utf8",
    );

    const parsed = await parseSpreadsheetRows(toArrayBuffer(csv));

    assert.deepEqual(parsed.headers, ["Nombre empresa", "Correo", "Notas"]);
    assert.deepEqual(parsed.rows, [
      { "Nombre empresa": "Acme SpA", Correo: "ventas@acme.cl", Notas: "hola, equipo" },
    ]);
  });

  it("rechaza una hoja que solo contiene encabezados", async () => {
    const csv = Buffer.from("Nombre,Correo\n", "utf8");
    await assert.rejects(parseSpreadsheetRows(toArrayBuffer(csv)), /La hoja está vacía/);
  });
});
