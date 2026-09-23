import { Readable } from "node:stream";

import { Workbook, type Cell, type Worksheet } from "exceljs";

export type SpreadsheetRows = {
  headers: string[];
  rows: Record<string, string>[];
};

const XLSX_SIGNATURE = [0x50, 0x4b, 0x03, 0x04] as const;
const LEGACY_XLS_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;
const CSV_DELIMITERS = [",", ";", "\t", "|"] as const;

function startsWithSignature(bytes: Buffer, signature: readonly number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function countDelimiter(line: string, delimiter: string) {
  let count = 0;
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === delimiter) {
      count += 1;
    }
  }

  return count;
}

function detectCsvDelimiter(bytes: Buffer) {
  const lines = bytes
    .toString("utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 10);

  let selected: (typeof CSV_DELIMITERS)[number] = ",";
  let selectedScore = -1;

  for (const delimiter of CSV_DELIMITERS) {
    const counts = lines.map((line) => countDelimiter(line, delimiter));
    const rowsWithDelimiter = counts.filter((count) => count > 0).length;
    const score = rowsWithDelimiter * 100 + counts.reduce((total, count) => total + count, 0);

    if (score > selectedScore) {
      selected = delimiter;
      selectedScore = score;
    }
  }

  return selected;
}

function cleanCellText(cell: Cell, stripBom = false) {
  const text = cell.text.trim();
  return stripBom ? text.replace(/^\uFEFF/, "") : text;
}

function uniqueHeader(base: string, counts: Map<string, number>) {
  const occurrence = counts.get(base) ?? 0;
  counts.set(base, occurrence + 1);
  return occurrence === 0 ? base : `${base}_${occurrence}`;
}

function worksheetRows(worksheet: Worksheet): SpreadsheetRows {
  const headerRow = worksheet.getRow(1);
  const columnCount = Math.max(headerRow.cellCount, worksheet.columnCount);
  const counts = new Map<string, number>();
  const columns = Array.from({ length: columnCount }, (_, offset) => {
    const column = offset + 1;
    const rawHeader = cleanCellText(headerRow.getCell(column), column === 1);
    const header = uniqueHeader(rawHeader || "__EMPTY", counts);
    return { column, header };
  });

  const rows: Record<string, string>[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = columns.map(({ column }) => cleanCellText(row.getCell(column)));
    if (values.every((value) => value === "")) continue;

    rows.push(Object.fromEntries(columns.map(({ header }, index) => [header, values[index]])));
  }

  if (rows.length === 0) throw new Error("La hoja está vacía.");

  return { headers: columns.map(({ header }) => header), rows };
}

/** Lee la primera hoja de un archivo XLSX o CSV y normaliza todas sus celdas a texto. */
export async function parseSpreadsheetRows(buffer: ArrayBuffer): Promise<SpreadsheetRows> {
  const bytes = Buffer.from(buffer);
  if (bytes.length === 0) throw new Error("La hoja está vacía.");

  if (startsWithSignature(bytes, LEGACY_XLS_SIGNATURE)) {
    throw new Error("El formato XLS antiguo no es compatible. Guarda el archivo como XLSX o CSV.");
  }

  const workbook = new Workbook();
  let worksheet: Worksheet | undefined;

  if (startsWithSignature(bytes, XLSX_SIGNATURE)) {
    await workbook.xlsx.load(buffer);
    worksheet = workbook.worksheets[0];
  } else {
    worksheet = await workbook.csv.read(Readable.from([bytes]), {
      parserOptions: {
        delimiter: detectCsvDelimiter(bytes),
        ignoreEmpty: true,
      },
    });
  }

  if (!worksheet) throw new Error("El archivo no contiene hojas de cálculo.");
  return worksheetRows(worksheet);
}
