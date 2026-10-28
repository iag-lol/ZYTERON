import { PaymentTargetError } from "./invoice-payment-option";

type CheckoutIntent = {
  state: string;
  amount: number;
  token_cipher: string | null;
  checkout_url: string | null;
};
type Claim<I> = { intent: I; created: boolean; description: string };
type Checkout = { checkoutUrl: string; amount: number };

export async function resolveReceivableCheckout<I extends CheckoutIntent>(
  amount: number,
  operations: {
    reserve: () => Promise<Claim<I>>;
    create: (claim: Claim<I>) => Promise<Checkout>;
    reconcile: (intent: I) => Promise<number>;
    checkout: (intent: I) => string;
  },
): Promise<Checkout> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const claim = await operations.reserve();
    if (claim.created) return operations.create(claim);
    const intent = claim.intent;
    if (intent.state === "CREATING")
      throw new PaymentTargetError(
        "Estamos preparando el enlace de pago. Vuelve a intentarlo en unos segundos.",
      );

    // Only the provider's verified terminal state releases an existing order.
    const state = await operations.reconcile(intent);
    if (state === 3 || state === 4) continue;
    if (state === 2)
      throw new PaymentTargetError(
        "El pago anterior ya fue confirmado. El saldo se actualizará antes de otro pago.",
      );
    if (state === 1 && intent.amount === amount && intent.token_cipher && intent.checkout_url)
      return { checkoutUrl: operations.checkout(intent), amount: intent.amount };
    if (state === 1 && intent.amount !== amount)
      throw new PaymentTargetError(
        "El saldo cambió y el intento anterior sigue pendiente en Flow. Estamos verificándolo antes de habilitar el nuevo importe.",
      );
    throw new PaymentTargetError(
      "El intento anterior sigue en verificación con Flow. No se ha generado otro pago.",
    );
  }
  throw new PaymentTargetError(
    "El estado del pago está cambiando. Vuelve a intentarlo en unos segundos.",
  );
}
