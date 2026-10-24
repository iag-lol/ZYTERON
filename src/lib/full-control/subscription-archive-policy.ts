/** Un token pendiente no equivale a una suscripción; una operación incierta sí exige conciliación. */
export function assertSubscriptionArchivable(
  subscription: { subscriptionId?: string; registerToken?: string } | undefined,
  lifecycle: { state: string; verified_at: Date | string | null } | undefined,
  hasProvisioningOperation: boolean,
) {
  if (
    subscription?.subscriptionId &&
    (!lifecycle?.verified_at || !["CANCEL_SCHEDULED", "CANCELLED"].includes(lifecycle.state))
  )
    throw Error("FLOW_MANAGED");
  if (!subscription?.subscriptionId && subscription?.registerToken && hasProvisioningOperation)
    throw Error("FLOW_MANAGED");
}
