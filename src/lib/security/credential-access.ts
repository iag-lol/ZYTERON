import "server-only";
import { getServerSession } from "next-auth";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { auditCredentialRequest } from "./credential-request-audit";

export { CredentialAccessError } from "./credential-access-error";
export { sendCredentialCodes, revealCredential } from "./credential-challenges";

export function auditedCredentialRequest(
  req: Request,
  operation: "SEND_CODES" | "REVEAL",
  credentialId: string | null,
  handler: (userId: string) => Promise<Record<string, unknown>>,
) {
  return auditCredentialRequest(req, operation, credentialId, handler, () =>
    getServerSession(portalAuthOptions),
  );
}
