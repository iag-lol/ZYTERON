export function historicalProofTarget(payment: {
  clientId: string; proofUrl: string | null;
  allocations: Array<{ receivable: { clientId: string; quoteId: string | null } }>;
}) {
  const match = /^\/api\/portal\/documents\/payment-proof\/([a-zA-Z0-9_-]{1,100})\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.exec(payment.proofUrl || "");
  if (!match || !payment.allocations.some(a => a.receivable.clientId === payment.clientId && a.receivable.quoteId === match[1])) return null;
  return { quoteId: match[1]!, proofId: match[2]! };
}
