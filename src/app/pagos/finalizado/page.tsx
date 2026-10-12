import { redirect } from "next/navigation";
// Legacy return query parameters are not payment evidence. The protected
// calendar reads the verified ledger and preserves all existing operations.
export default function LegacyPaymentResultPage() {
  redirect("/clientes/panel/pagos");
}
