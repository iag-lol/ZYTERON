export interface SiiCaseSource {
  id: string;
  type: number;
  section: string;
  raw: string;
  referenceCaseId: string | null;
}
export interface SiiSetView {
  sha256: string;
  encoding: string;
  cases: SiiCaseSource[];
  sections: Array<{ name: string; attention: string; raw: string; caseIds: string[] }>;
  requiredFolios: Record<string, number>;
  candidates: Array<{ caseId: string; folio: number }>;
  folioError: string | null;
  reserved: false;
}
export interface SiiParty {
  rut: string;
  legalName: string;
  businessActivity: string;
  address: string;
  commune: string;
  city?: string;
  foreignId?: string;
  nationality?: number;
}
export interface SiiLine {
  description: string;
  quantity?: number;
  unitPrice?: number;
  unit?: string;
  exempt?: boolean;
  discountPct?: number;
  surchargePct?: number;
  liquidationAmount?: number;
  liquidatedType?: number;
}
export interface SiiCaseDraft {
  caseId: string;
  receiver: SiiParty;
  lines: SiiLine[];
  referenceCode?: 1 | 2 | 3;
  referenceReason?: string;
  adjustments?: Array<{
    movement: "D" | "R";
    kind: "%" | "$";
    value: number;
    exempt?: boolean;
    description: string;
  }>;
  commissions?: Array<{ description: string; net: number; exempt: number }>;
  retention?: { code: number; rate: number };
  dispatch?: {
    transfer: number;
    responsibility: number;
    destinationAddress: string;
    destinationCommune: string;
  };
  export?: {
    currency: string;
    receiverCountry: number;
    destinationCountry: number;
    [key: string]: string | number | undefined;
  };
  additionalReferences?: Array<{ type: number; folio: string; date: string; reason: string }>;
}
export interface SiiBookEntry {
  type: number;
  folio: number;
  date: string;
  counterpartyRut: string;
  counterpartyName: string;
  net: number;
  exempt: number;
  vat: number;
  retained?: number;
  commonVat?: number;
  nonRecoverableVat?: { code: 1 | 2 | 3 | 4 | 9; amount: number };
  reference?: { type: number; folio: number };
}
export interface SiiRunDetail {
  run: {
    id: string;
    createdAt: string;
    setSha256: string;
    plan: {
      cases: Array<{ caseId: string; type: number; folio: number; totals: { total: number } }>;
    };
  };
  cases: Array<{ caseId: string; folio: number; documentTypeCode: number }>;
  artifacts: Array<{ id: string; name: string; kind: string; sha256: string }>;
  submissions: Array<{
    id: string;
    artifactId: string;
    status: string;
    trackId: string | null;
    response: unknown;
  }>;
}
export const emptySiiParty = (): SiiParty => ({
  rut: "",
  legalName: "",
  businessActivity: "",
  address: "",
  commune: "",
});
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
/** Ayuda de captura: cada partida conserva su texto y exige revisión antes de reservar folios. */
export function initialSiiCase(source: SiiCaseSource, target?: SiiCaseDraft): SiiCaseDraft {
  const raw = source.raw,
    normalized = normalize(raw),
    code: 1 | 2 | 3 = normalized.includes("CORRIGE") ? 2 : normalized.includes("ANULA") ? 1 : 3;
  const lines: SiiLine[] = [],
    rows = raw.split("\n");
  let header = "";
  for (const row of rows) {
    if (/^ITEM\b/.test(row.trim()) && /CANTIDAD|PRECIO|VALOR/.test(normalize(row))) {
      header = normalize(row);
      continue;
    }
    if (!header || !row.trim()) continue;
    if (
      /^(REFERENCIA|RAZON|DESCUENTO GLOBAL|COMISIONES|MONEDA|EL PRECIO|LOS PRECIOS|INSTRUCCIONES|---)/.test(
        normalize(row.trim()),
      )
    )
      break;
    const cells = row
        .trim()
        .split(/\t+|\s{2,}/)
        .map((s) => s.trim())
        .filter(Boolean),
      description = cells[0] ?? "",
      values = cells.slice(1);
    const unitColumn = header.includes("UNIDAD MEDIDA") ? 1 : -1;
    if (
      !values.length ||
      !values.every((v, index) => index === unitColumn || /^-?\d+(?:\.\d+)?%?$/.test(v))
    )
      continue;
    const inherited = target?.lines.find(
      (l) => normalize(l.description) === normalize(description),
    );
    if (source.type === 43) {
      lines.push({
        description,
        quantity: Number(values[0]),
        liquidationAmount: Number(values[1]),
        liquidatedType: 0,
        exempt: normalize(description).startsWith("EXENTO"),
      });
      continue;
    }
    const hasQuantity = header.includes("CANTIDAD"),
      quantity = hasQuantity ? Number(values[0]) : (inherited?.quantity ?? 1);
    const priceIndex = hasQuantity ? 1 : 0,
      hasPrice = /PRECIO|VALOR/.test(header);
    const unit = header.includes("UNIDAD MEDIDA") ? cells[hasQuantity ? 2 : 1] : undefined;
    const price = hasPrice
      ? Number(values[priceIndex + (unit ? 1 : 0)])
      : (inherited?.unitPrice ?? 0);
    lines.push({
      description,
      quantity,
      unitPrice: Number.isFinite(price) ? price : 0,
      ...(unit ? { unit } : {}),
      exempt:
        [34, 41, 110, 111, 112].includes(source.type) ||
        /EXENTO/.test(normalize(description)) ||
        Boolean(inherited?.exempt),
      ...(values.find((v) => v.endsWith("%"))
        ? { discountPct: Number(values.find((v) => v.endsWith("%"))!.slice(0, -1)) }
        : inherited?.discountPct
          ? { discountPct: inherited.discountPct }
          : {}),
    });
  }
  if (!lines.length) {
    if (code === 1 && target) lines.push(...target.lines.map((l) => ({ ...l })));
    else
      lines.push({
        description: "",
        quantity: 1,
        unitPrice: 0,
        exempt:
          target?.lines.every((l) => l.exempt) ?? [34, 41, 110, 111, 112].includes(source.type),
      });
  }
  const reason = /^RAZON REFERENCIA\s+([^\n]+)/im.exec(raw)?.[1]?.trim();
  const global = /DESCUENTO GLOBAL[^\n]*?(\d+(?:\.\d+)?)%/i.exec(raw);
  return {
    caseId: source.id,
    receiver: target ? { ...target.receiver } : emptySiiParty(),
    lines,
    ...(source.referenceCaseId ? { referenceCode: code, referenceReason: reason ?? "" } : {}),
    ...(global
      ? {
          adjustments: [
            {
              movement: "D",
              kind: "%",
              value: Number(global[1]),
              description: "Descuento global afecto",
            },
          ],
        }
      : code === 1 && target?.adjustments
        ? { adjustments: target.adjustments.map((a) => ({ ...a })) }
        : {}),
    ...(source.type === 46
      ? { retention: { code: 15, rate: 19 } }
      : target?.retention
        ? { retention: { ...target.retention } }
        : {}),
    ...(source.type === 52
      ? {
          dispatch: {
            transfer: normalized.includes("ENTRE BODEGAS") ? 5 : 1,
            responsibility: normalized.includes("LOCAL DEL CLIENTE") ? 2 : 1,
            destinationAddress: "",
            destinationCommune: "",
          },
        }
      : {}),
    ...(source.type >= 110
      ? {
          export: {
            ...(target?.export ?? {}),
            currency:
              /MONEDA DE LA OPERACION:\s+([^\n]+)/i.exec(raw)?.[1]?.trim() ??
              target?.export?.currency ??
              "",
            receiverCountry: target?.export?.receiverCountry ?? 0,
            destinationCountry: target?.export?.destinationCountry ?? 0,
          },
        }
      : {}),
  };
}
export function initialSiiCases(set: SiiSetView) {
  const drafts: SiiCaseDraft[] = [];
  for (const source of set.cases)
    drafts.push(
      initialSiiCase(
        source,
        drafts.find((d) => d.caseId === source.referenceCaseId),
      ),
    );
  return drafts;
}
