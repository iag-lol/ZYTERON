import { ControlWebConsole } from "@/components/admin/control-web-console";
import {
  getClientReviews,
  getProductCategories,
  getPublicExtras,
  getPublicPlans,
  getPublicProducts,
  getWebDiscounts,
} from "@/lib/admin/repository";

export const dynamic = "force-dynamic";

export default async function AdminControlWebPage() {
  const [plans, extras, products, productCategories, discounts, reviews] = await Promise.all([
    getPublicPlans(),
    getPublicExtras(),
    getPublicProducts(),
    getProductCategories(),
    getWebDiscounts(false),
    getClientReviews(),
  ]);

  return (
    <ControlWebConsole
      plans={plans}
      extras={extras}
      products={products}
      productCategories={productCategories}
      discounts={discounts}
      reviews={reviews}
    />
  );
}
