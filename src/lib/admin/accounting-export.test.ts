import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Workbook } from "exceljs";

import type { AccountingDashboardData } from "./accounting";
import { buildAccountingWorkbook } from "./accounting-export";

describe("exportación contable XLSX", () => {
  it("genera las seis hojas con sus encabezados y datos", async () => {
    const data: AccountingDashboardData = {
      selectedPeriod: "2026-09",
      availablePeriods: ["2026-09"],
      schemaReady: true,
      periods: [],
      companies: [],
      transactions: [],
      documents: [],
      projectTraceability: [],
      alerts: [],
      summary: {
        period: "2026-09",
        declared_in_sii: false,
        locked: false,
        income_neto: 1000,
      },
    };

    const output = await buildAccountingWorkbook(data);
    const workbook = new Workbook();
    await workbook.xlsx.load(output);

    assert.deepEqual(
      workbook.worksheets.map((worksheet) => worksheet.name),
      ["Resumen", "Periodos", "Transacciones", "Documentos", "Proyectos", "Alertas"],
    );

    const summary = workbook.getWorksheet("Resumen");
    assert.ok(summary);
    assert.equal(summary.getCell("A1").text, "indicador");
    assert.equal(summary.getCell("B1").text, "valor");
    assert.equal(summary.getCell("A2").text, "Periodo");
    assert.equal(summary.getCell("B2").text, "2026-09");
  });
});
