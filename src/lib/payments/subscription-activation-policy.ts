export function assertSubscriptionActivationAllowed(input: {
  quoteStatus?: string | null;
  controlState?: string;
  paymentEnabled?: boolean;
  lifecycleState?: string;
}) {
  if (
    !["PENDING", "SENT", "WON"].includes(input.quoteStatus || "") ||
    ["CANCELLED", "DECLINED", "REJECTED", "EXPIRED"].includes(input.controlState || "")
  )
    throw new Error("Esta cotización está cerrada y no permite activar cobros.");
  if (input.paymentEnabled === false) throw new Error("SUBSCRIPTION_NOT_ENABLED");
  if (input.lifecycleState && input.lifecycleState !== "ACTIVE")
    throw new Error(
      "Esta suscripción ya tiene una cancelación. La reactivación requiere un nuevo acuerdo.",
    );
}
