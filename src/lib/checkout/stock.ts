import { safeSelectSingle, type ProductRecord, updateRows } from "@/lib/admin/repository";
import type { CheckoutMeta } from "@/lib/checkout/orders";

type StockDeductionResult = {
  deductedUnits: number;
  updatedProducts: number;
  warnings: string[];
};

function toInt(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

export async function deductStockFromCheckout(meta: CheckoutMeta): Promise<StockDeductionResult> {
  let deductedUnits = 0;
  let updatedProducts = 0;
  const warnings: string[] = [];

  for (const item of meta.items) {
    const qty = toInt(item.quantity);
    if (qty <= 0) continue;

    const product = await safeSelectSingle<ProductRecord>(
      "Product",
      "id, name, stock, soldUnits",
      { id: item.productId },
    );

    if (!product?.id) {
      warnings.push(`Producto no encontrado (${item.productId}).`);
      continue;
    }

    const currentStock = toInt(product.stock);
    const currentSold = toInt(product.soldUnits);
    const nextStock = Math.max(0, currentStock - qty);
    const nextSold = currentSold + qty;

    await updateRows(
      "Product",
      {
        stock: nextStock,
        soldUnits: nextSold,
        updatedAt: new Date().toISOString(),
      },
      { id: product.id },
    );

    deductedUnits += qty;
    updatedProducts += 1;

    if (currentStock < qty) {
      warnings.push(`Stock insuficiente al momento de confirmar para ${product.name || product.id}.`);
    }
  }

  return {
    deductedUnits,
    updatedProducts,
    warnings,
  };
}

