/** Quote every cell and keep spreadsheet formulas inert, including prefixed whitespace. */
export function csvCell(value: unknown) {
  let raw = String(value ?? "");
  if (/^\s*[=+@-]/.test(raw) || /^[\t\r\n]/.test(raw)) raw = "'" + raw;
  return '"' + raw.replace(/"/g, '""') + '"';
}
