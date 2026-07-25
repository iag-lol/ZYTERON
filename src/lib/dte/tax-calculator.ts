import { IVA_RATE } from "@/lib/dte/constants";

/**
 * Calculadora de totales DTE. Trabaja en pesos chilenos ENTEROS (el SII no
 * admite decimales en CLP). Redondeo por línea y luego suma, con IVA sobre el
 * neto afecto. Determinística y sin efectos secundarios.
 */

export type DteLineInput = {
  quantity: number;
  unitPrice: number; // neto unitario en CLP
  discountPct?: number; // 0..100
  surchargePct?: number; // 0..100
  isExempt?: boolean;
};

export type DteLineResult = DteLineInput & { lineTotal: number };

export type DteTotals = {
  lines: DteLineResult[];
  netAmount: number; // neto afecto (base de IVA)
  exemptAmount: number; // total exento
  taxAmount: number; // IVA
  totalAmount: number; // neto + IVA + exento
};

function round(n: number): number {
  return Math.round(n);
}

function computeLineTotal(line: DteLineInput): number {
  const qty = Number(line.quantity) || 0;
  const price = Number(line.unitPrice) || 0;
  const disc = Math.min(Math.max(Number(line.discountPct) || 0, 0), 100);
  const surch = Math.max(Number(line.surchargePct) || 0, 0);
  const base = qty * price;
  const afterDiscount = base * (1 - disc / 100);
  const afterSurcharge = afterDiscount * (1 + surch / 100);
  return round(afterSurcharge);
}

/**
 * Calcula los totales de un documento.
 * @param lines líneas del detalle
 * @param opts.globalDiscount descuento global en CLP (se aplica al neto afecto)
 * @param opts.ivaRate tasa IVA (por defecto 0.19)
 */
export function computeDteTotals(
  lines: DteLineInput[],
  opts?: { globalDiscount?: number; ivaRate?: number },
): DteTotals {
  const ivaRate = opts?.ivaRate ?? IVA_RATE;
  const globalDiscount = Math.max(Number(opts?.globalDiscount) || 0, 0);

  const results: DteLineResult[] = lines.map((line) => ({
    ...line,
    lineTotal: computeLineTotal(line),
  }));

  let netAmount = 0;
  let exemptAmount = 0;
  for (const r of results) {
    if (r.isExempt) exemptAmount += r.lineTotal;
    else netAmount += r.lineTotal;
  }

  netAmount = Math.max(netAmount - globalDiscount, 0);
  const taxAmount = round(netAmount * ivaRate);
  const totalAmount = netAmount + taxAmount + exemptAmount;

  return { lines: results, netAmount, exemptAmount, taxAmount, totalAmount };
}
