"use client";

import { CredentialSecretDisplay } from "./credential-secret-display";

// Retain the legacy entry point with the same server-enforced verification flow.
export function CredentialRevealButton({ credentialId }: { credentialId: string }) {
  return <CredentialSecretDisplay credentialId={credentialId} secretMasked="••••••••" />;
}
