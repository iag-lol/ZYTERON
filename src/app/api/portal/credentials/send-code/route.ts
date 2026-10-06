import { z } from "zod";
import {
  auditedCredentialRequest,
  CredentialAccessError,
  sendCredentialCodes,
} from "@/lib/security/credential-access";

const schema = z.object({ credentialId: z.string().min(1).max(200) }).strict();

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  return auditedCredentialRequest(
    req,
    "SEND_CODES",
    parsed.success ? parsed.data.credentialId : null,
    async (userId) => {
      if (!parsed.success) throw new CredentialAccessError("Datos inválidos.", 400);
      return sendCredentialCodes(userId, parsed.data.credentialId);
    },
  );
}

export async function GET(req: Request) {
  return auditedCredentialRequest(req, "SEND_CODES", null, async () => ({}));
}

// Unsupported methods are rejected and audited as access attempts too.
export { GET as PUT, GET as PATCH, GET as DELETE, GET as OPTIONS, GET as HEAD };
