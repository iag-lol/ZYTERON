/** Signed provider money can be serialized as a decimal string. Never round CLP. */
export function providerClpAmount(value: unknown): number {
  if (typeof value === "string" && (value.length > 32 || !/^\d+(?:\.0+)?$/.test(value)))
    throw new Error("PAYMENT_AMOUNT_INVALID");
  if (typeof value !== "number" && typeof value !== "string")
    throw new Error("PAYMENT_AMOUNT_INVALID");
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("PAYMENT_AMOUNT_INVALID");
  return amount;
}
export function normalizeProviderPayment(
  data: Record<string, unknown>,
): Record<string, unknown> & { amount: number; paymentData?: Record<string, unknown> } {
  const paymentData =
    data.paymentData && typeof data.paymentData === "object" && !Array.isArray(data.paymentData)
      ? (data.paymentData as Record<string, unknown>)
      : undefined;
  return {
    ...data,
    amount: providerClpAmount(data.amount),
    ...(paymentData
      ? {
          paymentData: {
            ...paymentData,
            ...(data.status === 2 ? { amount: providerClpAmount(paymentData.amount) } : {}),
          },
        }
      : {}),
  };
}
