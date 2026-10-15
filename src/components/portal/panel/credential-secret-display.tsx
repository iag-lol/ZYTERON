"use client";
import { CredentialAccessForm } from "./credential-access-form";
export function CredentialSecretDisplay({
  credentialId,
}: {
  credentialId: string;
  secretMasked: string | null;
}) {
  return <CredentialAccessForm credentialId={credentialId} name="Credencial del proyecto" />;
}
