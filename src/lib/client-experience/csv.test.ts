import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell } from "./csv";
test("account exports cannot activate formulas through leading whitespace", () => {
  for (const value of [
    '=HYPERLINK("https://attacker.example")',
    "  =1+1",
    "\t+123",
    "\r@SUM(1)",
    "\n-10",
  ])
    assert.ok(csvCell(value).startsWith("\"'"));
});
test("account exports preserve amounts and escape quote delimiters", () => {
  assert.equal(csvCell(11900), '"11900"');
  assert.equal(csvCell('Informe "Octubre"'), '"Informe ""Octubre"""');
  assert.equal(csvCell(null), '""');
});
