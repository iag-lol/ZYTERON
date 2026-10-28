import { PaymentTargetError } from "./invoice-payment-option";

type CheckoutIntent = {
  state: string;
  amount: number;
  token_cipher: string | null;
  checkout_url: string | null;
};
type Claim<I> = { intent: I; created: boolean; description: string };
type Checkout = { checkoutUrl: string; amount: number };

export async function refreshExpiredReceivableCheckout(input: {
  state: number;
  expiresAt: Date;
  checkoutUrl: string;
  reconcile: () => Promise<number>;
  probe?: typeof fetch;
  now?: Date;
}) {
  if (input.state !== 1 || input.expiresAt > (input.now || new Date())) return input.state;
  const url = new URL(input.checkoutUrl);
  if (
    url.protocol !== "https:" ||
    !["www.flow.cl", "api.flow.cl", "sandbox.flow.cl"].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    [...url.searchParams.keys()].some((key) => key !== "token") ||
    !/^[A-Za-z0-9_-]{12,200}$/.test(url.searchParams.get("token") || "")
  )
    throw new Error("PAYMENT_DESTINATION_INVALID");
  try {
    // Opening Flow's existing checkout lets the provider resolve its own expired order.
    // Only the subsequent signed status query may release the persistent reservation.
    const response = await (input.probe || fetch)(url, {
      method: "GET",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4000),
    });
    await response.body?.cancel();
  } catch {
    /* A failed checkout probe never authorizes a replacement order. */
  }
  return input.reconcile();
}

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
