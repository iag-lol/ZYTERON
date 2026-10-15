import "server-only";
import { getServerSession } from "next-auth";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { auditCredentialRequest } from "./credential-request-audit";
import { credentialSessionBinding } from "./credential-challenge-policy";
import type { Session } from "next-auth";

export { CredentialAccessError } from "./credential-access-error";
export { sendCredentialCodes, revealCredential } from "./credential-challenges";

export function auditedCredentialRequest(
  req: Request,
  operation: "SEND_CODES" | "REVEAL",
  credentialId: string | null,
  handler: (userId: string, sessionBinding: string) => Promise<Record<string, unknown>>,
) {
  let session: Session | null = null;
  return auditCredentialRequest(
    req,
    operation,
    credentialId,
    (userId) =>
      handler(userId, credentialSessionBinding(userId, session?.user?.credentialSessionId || "")),
    async () => {
      session = await getServerSession(portalAuthOptions);
      return session;
    },
  );
}
