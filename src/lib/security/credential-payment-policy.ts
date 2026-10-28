export type CredentialPaymentAccess = { allowed: boolean; reason: string };
export type CredentialDebt = {
  clientId: string;
  projectId: string | null;
  quoteId: string | null;
  saleId: string | null;
  currency: string;
  totalAmount: number;
  allocations: Array<{ amount: number }>;
};
export function decideCredentialPaymentAccess(input: {
  userId: string;
  project: {
    clientId: string | null;
    id: string;
    quoteId: string | null;
    saleId: string | null;
    totalCharge: number | null;
    quote: { total: number } | null;
    sale: { total: number } | null;
  } | null;
  debts: CredentialDebt[];
  canonicalPending: boolean;
  deliveryAuthorization?: {
    userId: string;
    projectId: string;
    revokedAt: Date | null;
  } | null;
}): CredentialPaymentAccess {
  const deny = (reason: string) => ({ allowed: false, reason });
  const project = input.project;
  if (!project || project.clientId !== input.userId)
    return deny("Acceso pendiente de vinculación y revisión del proyecto.");
  const authorization = input.deliveryAuthorization;
  if (
    authorization?.userId === input.userId &&
    authorization.projectId === project.id &&
    authorization.revokedAt === null
  )
    return {
      allowed: true,
      reason: "Entrega de accesos autorizada por Zyteron. Requiere verificación de identidad.",
    };
  const balance = (d: CredentialDebt) =>
    Math.max(0, d.totalAmount - d.allocations.reduce((n, a) => n + a.amount, 0));
  if (
    input.canonicalPending ||
    input.debts.some((d) => d.clientId === input.userId && balance(d) > 0)
  )
    return deny(
      "Las credenciales se habilitan cuando el proyecto está pagado por completo y la cuenta no tiene pagos pendientes.",
    );
  const own = input.debts.filter(
    (d) =>
      d.clientId === input.userId &&
      (d.projectId === project.id ||
        (project.quoteId && d.quoteId === project.quoteId) ||
        (project.saleId && d.saleId === project.saleId)),
  );
  const expected = Math.max(
    project.totalCharge || 0,
    project.quote?.total || 0,
    project.sale?.total || 0,
    own.reduce((n, d) => n + d.totalAmount, 0),
  );
  const paid = own.reduce(
    (n, d) =>
      n +
      Math.min(
        d.totalAmount,
        d.allocations.reduce((sum, a) => sum + a.amount, 0),
      ),
    0,
  );
  if (
    !Number.isSafeInteger(expected) ||
    expected <= 0 ||
    own.some((d) => d.currency !== "CLP") ||
    paid < expected
  )
    return deny(
      "El pago completo del proyecto debe estar confirmado y aplicado antes de consultar sus credenciales.",
    );
  return { allowed: true, reason: "Proyecto pagado y cuenta sin saldos pendientes." };
}
