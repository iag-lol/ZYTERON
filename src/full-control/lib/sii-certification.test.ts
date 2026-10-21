import assert from "node:assert/strict";
import test from "node:test";
import { initialSiiCase, type SiiCaseSource } from "./sii-certification";
const source = (raw: string, type = 33, referenceCaseId: string | null = null): SiiCaseSource => ({
  id: "1234567-1",
  type,
  raw,
  referenceCaseId,
  section: "SET SINTÉTICO",
});
test("boletas captura encabezado Item, precio con IVA, exento y unidad Kg de la instrucción",()=>{
  const result=initialSiiCase({...source('Item\tCantidad\tPrecio Unitario con IVA\nArroz\t5\t700\n\nOBSERVACION: "Se debe informar en el XML Unidad de medida en Kg."',39),id:"CASO-5"});
  assert.deepEqual(result.lines,[{description:"Arroz",quantity:5,unitPrice:700,unit:"Kg",exempt:false}]);
  const mixed=initialSiiCase({...source('Item\tCantidad\tPrecio Unitario con IVA\nitem afecto 1\t8\t1590\nitem exento 2\t2\t1000\nOBSERVACION: texto',39),id:"CASO-4"});
  assert.equal(mixed.lines.length,2);assert.equal(mixed.lines[0]?.exempt,false);assert.equal(mixed.lines[1]?.exempt,true);
});
test("captura preserva partidas ITEM 2, tildes y descuentos sin confundirlas con encabezados", () => {
  const result = initialSiiCase(
    source(
      "ITEM\tCANTIDAD\tPRECIO UNITARIO\tDESCUENTO ITEM\nPañuelo QA\t2\t1001\t3%\nITEM 2 AFECTO\t3\t654\t4%\n",
    ),
  );
  assert.equal(result.lines.length, 2);
  assert.equal(result.lines[0]!.description, "Pañuelo QA");
  assert.equal(result.lines[1]!.quantity, 3);
  assert.equal(result.lines[1]!.unitPrice, 654);
  assert.equal(result.lines[1]!.discountPct, 4);
});
test("captura separa unidad de medida, cantidad y precio", () => {
  const result = initialSiiCase(
    source("ITEM\tCANTIDAD\tUNIDAD MEDIDA\tVALOR UNITARIO\nHoras QA\t9\tHora\t5762\n", 34),
  );
  assert.deepEqual(result.lines, [
    { description: "Horas QA", quantity: 9, unitPrice: 5762, unit: "Hora", exempt: true },
  ]);
});
test("devolución usa precios del caso vinculado y no modifica el original", () => {
  const original = initialSiiCase(
    source("ITEM\tCANTIDAD\tPRECIO UNITARIO\nProducto QA\t12\t2000\n"),
  );
  const snapshot = JSON.stringify(original),
    note = initialSiiCase(
      source("RAZON REFERENCIA\tDEVOLUCION\nITEM\tCANTIDAD\nProducto QA\t3\n", 61, original.caseId),
      original,
    );
  assert.equal(note.lines[0]!.unitPrice, 2000);
  assert.equal(note.lines[0]!.quantity, 3);
  assert.equal(JSON.stringify(original), snapshot);
});
test("texto no reconocido queda pendiente de captura y no inventa partidas", () => {
  const result = initialSiiCase(source("RAZON REFERENCIA\tCORRIGE GIRO\n", 61, "1234567-2"));
  assert.equal(result.lines[0]!.description, "");
  assert.equal(result.referenceCode, 2);
});

test("notas vinculadas a compra conservan retención sin alterar el caso original", () => {
  const target = initialSiiCase({
    id: "1234567-1",
    type: 46,
    section: "SET",
    referenceCaseId: null,
    raw: "CASO 1234567-1\nDOCUMENTO FACTURA DE COMPRA ELECTRONICA\nITEM\tCANTIDAD\tPRECIO UNITARIO\nProducto sintético\t2\t1000",
  });
  const note = initialSiiCase(
    {
      id: "1234567-2",
      type: 61,
      section: "SET",
      referenceCaseId: target.caseId,
      raw: "CASO 1234567-2\nDOCUMENTO NOTA DE CREDITO ELECTRONICA\nRAZON REFERENCIA ANULA DOCUMENTO",
    },
    target,
  );
  assert.deepEqual(note.retention, { code: 15, rate: 19 });
  assert.notEqual(note.retention, target.retention);
});

test("lector de archivos conserva los octetos ISO-8859-1 del set", async () => {
  const { fileToUpload } = await import("./finance-api");
  const bytes = Uint8Array.from([0x43, 0x41, 0x53, 0x4f, 0x20, 0xd1, 0x0a]);
  const result = await fileToUpload(new File([bytes], "set-sintetico.txt", { type: "text/plain" }));
  assert.deepEqual(Buffer.from(result.contentBase64, "base64"), Buffer.from(bytes));
  assert.equal(result.fileName, "set-sintetico.txt");
});
