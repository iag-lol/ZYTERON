import { ProductsCatalogManager } from "@/components/admin/products-catalog-manager";
import {
  getProductAdminMetaMap,
  getProductCategories,
  getProductPublicMetaMap,
  getPublicProducts,
} from "@/lib/admin/repository";

export const dynamic = "force-dynamic";

export default async function AdminProductosPage() {
  const [products, categories, publicMeta, adminMeta] = await Promise.all([
    getPublicProducts(),
    getProductCategories(),
    getProductPublicMetaMap(),
    getProductAdminMetaMap(),
  ]);

  const mergedProducts = products.map((product) => {
    const slug = String(product.slug || "").toLowerCase();
    const web = publicMeta[slug];
    const admin = adminMeta[slug];
    return {
      ...product,
      imageUrl: web?.imageUrl ?? null,
      publicDescription: web?.publicDescription ?? null,
      published: typeof web?.published === "boolean" ? web.published : true,
      status: admin?.status ?? "ACTIVE",
      soldUnits: admin?.soldUnits ?? 0,
      onOffer: Boolean(admin?.onOffer),
      isCombo: Boolean(admin?.isCombo),
      comboLabel: admin?.comboLabel ?? null,
      comboItems: admin?.comboItems ?? [],
      costPrice: admin?.costPrice ?? null,
      discountStartsAt: admin?.discountStartsAt ?? null,
      discountEndsAt: admin?.discountEndsAt ?? null,
      notes: admin?.notes ?? null,
    };
  });

  return <ProductsCatalogManager products={mergedProducts} categories={categories} />;
}
