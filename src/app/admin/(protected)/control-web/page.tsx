import { ControlWebConsole } from "@/components/admin/control-web-console";
import {
  getClientReviews,
  getProductCategories,
  getPublicExtras,
  getPublicPlans,
  getPublicProducts,
  getSettingsByPrefix,
  getWebDiscounts,
} from "@/lib/admin/repository";

export const dynamic = "force-dynamic";

export default async function AdminControlWebPage() {
  const [plans, extras, products, productCategories, discounts, reviews, planExclusions] = await Promise.all([
    getPublicPlans(),
    getPublicExtras(),
    getPublicProducts(),
    getProductCategories(),
    getWebDiscounts(false),
    getClientReviews(),
    getSettingsByPrefix("plan_not_included_"),
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

  return (
    <ControlWebConsole
      plans={plans}
      extras={extras}
      products={products}
      productCategories={productCategories}
      discounts={discounts}
      reviews={reviews}
      planNotIncludedBySlug={planNotIncludedBySlug}
    />
  );
}
