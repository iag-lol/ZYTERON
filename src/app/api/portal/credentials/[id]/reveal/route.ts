import { z } from "zod";
import {
  auditedCredentialRequest,
  CredentialAccessError,
  revealCredential,
} from "@/lib/security/credential-access";

type Context = { params: Promise<{ id: string }> };
const schema = z
  .object({
    password: z.string().min(1).max(256),
    code: z.string().regex(/^\d{6}$/),
    approvalCode: z.string().regex(/^\d{6}$/),
    challengeId: z.uuid(),
  })
  .strict();

export async function POST(req: Request, { params }: Context) {
  const { id } = await params;
  return auditedCredentialRequest(req, "REVEAL", id, async (userId) => {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      throw new CredentialAccessError(
        "Ingresa la contraseña y ambos códigos de la solicitud actual.",
        400,
      );
    return revealCredential(userId, id, parsed.data);
  });
}

export async function GET(req: Request, { params }: Context) {
  const { id } = await params;
  return auditedCredentialRequest(req, "REVEAL", id, async () => ({}));
}

// Unsupported methods are rejected and audited as access attempts too.
export { GET as PUT, GET as PATCH, GET as DELETE, GET as OPTIONS, GET as HEAD };
