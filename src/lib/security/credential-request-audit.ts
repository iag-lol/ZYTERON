import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPortalCredentialAccessAlertEmail } from "@/lib/notifications/portal-email";
import { configuredRequestOrigins, isAllowedMutationOrigin } from "./request-origin";
import { CredentialAccessError } from "./credential-access-error";

const noStoreHeaders = {
  "Cache-Control": "no-store, private, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

/** Every entry point records the attempt, including unauthenticated/invalid requests.
 * A successful response is withheld if audit persistence or notification fails. */
export async function auditCredentialRequest(
  req: Request,
  operation: "SEND_CODES" | "REVEAL",
  credentialId: string | null,
  handler: (userId: string) => Promise<Record<string, unknown>>,
  getSession: () => Promise<{ user?: { id?: string; email?: string | null } } | null>,
) {
  let auditId: string | undefined;
  try {
    const session = await getSession();
    const userId = session?.user?.id || null;
    const details = {
      operation,
      method: req.method,
      outcome: "PENDING",
      actorEmail: session?.user?.email || null,
      // Request metadata is untrusted, bounded, and never used for authorization.
      forwardedIp: (req.headers.get("x-forwarded-for") || "").slice(0, 200),
      userAgent: (req.headers.get("user-agent") || "").slice(0, 300),
      notification: "PENDING",
    };
    const audit = await prisma.clientAuditLog.create({
      data: {
        actorId: userId,
        action: `CREDENTIAL_${operation}_ATTEMPT`,
        entityType: "ClientCredential",
        entityId: credentialId?.slice(0, 200) || null,
        details,
      },
    });
    auditId = audit.id;
    let status = 200;
    let payload: Record<string, unknown>;
    try {
      if (req.method !== "POST") throw new CredentialAccessError("Método no permitido.", 405);
      if (
        !isAllowedMutationOrigin({
          requestOrigin: new URL(req.url).origin,
          origin: req.headers.get("origin"),
          referer: req.headers.get("referer"),
          secFetchSite: req.headers.get("sec-fetch-site"),
          allowedOrigins: configuredRequestOrigins(),
        })
      )
        throw new CredentialAccessError("Origen no autorizado.");
      if (!userId) throw new CredentialAccessError("No autenticado.", 401);
      payload = await handler(userId);
    } catch (error) {
      status = error instanceof CredentialAccessError ? error.status : 500;
      payload = {
        error:
          error instanceof CredentialAccessError
            ? error.message
            : "No se pudo procesar el acceso seguro.",
      };
      if (!(error instanceof CredentialAccessError))
        console.error("[credential-access] Operation failed.");
    }
    const completed = { ...details, outcome: status === 200 ? "AUTHORIZED" : "DENIED", status };
    await prisma.clientAuditLog.update({ where: { id: audit.id }, data: { details: completed } });
    let notified = false;
    try {
      const result = await sendPortalCredentialAccessAlertEmail({
        auditId: audit.id,
        operation,
        outcome: completed.outcome,
        status,
        actorEmail: details.actorEmail || "Sin sesión autenticada",
        credentialId: credentialId || "No especificada",
        timestamp: audit.createdAt.toISOString(),
        forwardedIp: details.forwardedIp,
        userAgent: details.userAgent,
      });
      notified = result.sent;
    } catch {
      console.error("[credential-access] Alert delivery failed.");
    }
    await prisma.clientAuditLog.update({
      where: { id: audit.id },
      data: { details: { ...completed, notification: notified ? "SENT" : "FAILED" } },
    });
    if (!notified)
      return NextResponse.json(
        { error: "No se pudo enviar el aviso de seguridad. El acceso permanece bloqueado." },
        { status: 503, headers: noStoreHeaders },
      );
    return NextResponse.json(payload, { status, headers: noStoreHeaders });
  } catch {
    console.error("[credential-access] Audit unavailable.", { auditId });
    return NextResponse.json(
      { error: "El acceso seguro no está disponible." },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
