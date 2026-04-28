import { ControlWebConsole } from "@/components/admin/control-web-console";
import {
  getClientReviews,
  getProductCategories,
  getProductPublicMetaMap,
  getPublicExtras,
  getPublicPlans,
  getPublicProducts,
  getSettingsByPrefix,
  getWebDiscounts,
} from "@/lib/admin/repository";

export const dynamic = "force-dynamic";

export default async function AdminProductosPage() {
  const [plans, extras, products, productCategories, discounts, reviews, planExclusions, productPublicMeta] = await Promise.all([
    getPublicPlans(),
    getPublicExtras(),
    getPublicProducts(),
    getProductCategories(),
    getWebDiscounts(false),
    getClientReviews(),
    getSettingsByPrefix("plan_not_included_"),
    getProductPublicMetaMap(),
  ]);

  const planNotIncludedBySlug = Object.fromEntries(
    planExclusions.map((setting) => {
      const slug = setting.key.replace("plan_not_included_", "");
      let values: string[] = [];
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed)) {
          values = parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        values = setting.value
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return [slug, values];
    }),
  );

  const mergedProducts = products.map((product) => {
    const meta = productPublicMeta[String(product.slug || "").toLowerCase()];
    return {
      ...product,
      imageUrl: meta?.imageUrl ?? null,
      publicDescription: meta?.publicDescription ?? null,
      published: typeof meta?.published === "boolean" ? meta.published : true,
    };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
        <p className="font-semibold">Gestión integral de Productos y Cotizador</p>
        <p className="mt-1 text-blue-700">
          Aquí controlas planes, extras y todo el catálogo público de productos (imagen, visibilidad, descripción, precio y descuentos).
        </p>
      </div>

      <ControlWebConsole
        plans={plans}
        extras={extras}
        products={mergedProducts}
        productCategories={productCategories}
        discounts={discounts}
        reviews={reviews}
        planNotIncludedBySlug={planNotIncludedBySlug}
      />
    </div>
  );
}
