import { randomInt, randomUUID } from "node:crypto";
import { compare } from "bcrypt";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPortalCredentialRevealCodeEmail } from "@/lib/notifications/portal-email";
import { decryptSecret } from "./secret-crypto";
import { CredentialAccessError } from "./credential-access-error";
import { credentialPaymentStates } from "./credential-payment-access";
import {
  CREDENTIAL_CODE_MINUTES,
  CREDENTIAL_CODE_PREFIX,
  CREDENTIAL_MAX_ATTEMPTS,
  credentialCodeScope,
  credentialHashesEqual,
  hashCredentialCode,
} from "./credential-challenge-policy";

async function credentialTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: "Serializable", timeout: 15000 });
    } catch (error) {
      if (attempt >= 2 || (error as { code?: string })?.code !== "P2034") throw error;
    }
  }
}

async function lockActiveOwner(tx: Prisma.TransactionClient, userId: string, credentialId: string) {
  // The same lock serializes issuance and consumption on every service instance.
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (
    !user ||
    user.role !== "CLIENT" ||
    user.accountStatus !== "ACTIVE" ||
    !user.emailVerifiedAt ||
    user.authProvider !== "LOCAL"
  )
    throw new CredentialAccessError("Se requiere una cuenta local activa y verificada.");
  const credential = await tx.clientCredential.findFirst({ where: { id: credentialId, userId } });
  if (!credential) throw new CredentialAccessError("Credencial no disponible.", 404);
  const access = (await credentialPaymentStates(tx, userId, [credential.projectId])).get(
    credential.projectId,
  )!;
  if (!access.allowed) throw new CredentialAccessError(access.reason, 403);
  return { user, credential };
}

export async function sendCredentialCodes(
  userId: string,
  credentialId: string,
  password: string,
  sessionBinding: string,
) {
  if (!sessionBinding || !password)
    throw new CredentialAccessError("Confirma tu contraseña de acceso.", 400);
  const challenge = await credentialTransaction(async (tx) => {
    const { user, credential } = await lockActiveOwner(tx, userId, credentialId);
    const now = new Date();
    const attempts = await tx.clientAuditLog.count({
      where: {
        actorId: userId,
        action: "CREDENTIAL_SEND_CODES_ATTEMPT",
        createdAt: { gte: new Date(now.getTime() - 15 * 60_000) },
      },
    });
    if (attempts > 10)
      throw new CredentialAccessError(
        "Demasiados intentos. Espera 15 minutos antes de volver a intentar.",
        429,
      );
    const recent = await tx.emailVerificationCode.findMany({
      where: {
        userId,
        email: { startsWith: `${CREDENTIAL_CODE_PREFIX}owner:` },
        createdAt: { gte: new Date(now.getTime() - 15 * 60_000) },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    });
    if (recent.length >= 4 || (recent[0] && now.getTime() - recent[0].createdAt.getTime() < 60_000))
      throw new CredentialAccessError(
        "Espera antes de solicitar otro código. Máximo 4 envíos cada 15 minutos.",
        429,
      );
    if (!(await compare(password, user.passwordHash)))
      throw new CredentialAccessError("Contraseña incorrecta.", 401);
    await tx.emailVerificationCode.updateMany({
      where: { userId, email: { startsWith: CREDENTIAL_CODE_PREFIX }, consumedAt: null },
      data: { consumedAt: now },
    });
    const challengeId = randomUUID(),
      code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(now.getTime() + CREDENTIAL_CODE_MINUTES * 60_000);
    await tx.emailVerificationCode.createMany({
      data: [
        {
          id: challengeId,
          userId,
          email: credentialCodeScope(credentialId, "owner"),
          expiresAt,
          codeHash: hashCredentialCode({
            userId,
            credentialId,
            challengeId,
            recipient: user.email,
            factor: "owner",
            code,
            sessionBinding,
            credentialVersion: credential.updatedAt.toISOString(),
          }),
        },
      ],
    });
    return { challengeId, code, user, credential, expiresAt };
  });
  try {
    const email = await sendPortalCredentialRevealCodeEmail({
      to: challenge.user.email,
      fullName: challenge.user.name,
      code: challenge.code,
      serviceName: challenge.credential.serviceName,
      expiresMinutes: CREDENTIAL_CODE_MINUTES,
    });
    if (!email.sent) throw new Error("Delivery unavailable");
  } catch {
    await prisma.emailVerificationCode.updateMany({
      where: { id: { in: [challenge.challengeId] } },
      data: { consumedAt: new Date() },
    });
    throw new CredentialAccessError(
      "No se pudo enviar el correo de seguridad. Inténtalo más tarde.",
      503,
    );
  }
  // Neither this response nor the audit includes the code or any secret.
  return {
    ok: true,
    challengeId: challenge.challengeId,
    expiresAt: challenge.expiresAt.toISOString(),
    message: "Código enviado a tu correo verificado. Expira en 5 minutos y es de un solo uso.",
  };
}

export async function revealCredential(
  userId: string,
  credentialId: string,
  input: { password: string; code: string; challengeId: string },
  sessionBinding: string,
) {
  if (!sessionBinding) throw new CredentialAccessError("La sesión no es válida.", 401);
  const result = await credentialTransaction(async (tx) => {
    const { user, credential } = await lockActiveOwner(tx, userId, credentialId);
    const records = await tx.emailVerificationCode.findMany({
      where: {
        id: { in: [input.challengeId] },
        userId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: CREDENTIAL_MAX_ATTEMPTS },
      },
    });
    const owner = records.find(
      (r) => r.id === input.challengeId && r.email === credentialCodeScope(credentialId, "owner"),
    );
    if (!owner) return { error: "Solicita otro código: la solicitud expiró o ya fue utilizada." };
    // Return failed validation so the transaction commits its attempt counter.
    await tx.emailVerificationCode.updateMany({
      where: { id: { in: [owner.id] } },
      data: { attempts: { increment: 1 } },
    });
    const valid = credentialHashesEqual(
      owner.codeHash,
      hashCredentialCode({
        userId,
        credentialId,
        challengeId: input.challengeId,
        recipient: user.email,
        factor: "owner",
        code: input.code,
        sessionBinding,
        credentialVersion: credential.updatedAt.toISOString(),
      }),
    );
    if (!valid || !(await compare(input.password, user.passwordHash)))
      return { error: "Contraseña o código incorrectos. Máximo 5 intentos por solicitud." };
    await tx.emailVerificationCode.updateMany({
      where: { id: { in: [owner.id] } },
      data: { consumedAt: new Date() },
    });
    return { credential };
  });
  if (result.error || !result.credential)
    throw new CredentialAccessError(result.error || "Acceso denegado.", 401);
  const c = result.credential;
  const secret = decryptSecret({
    ciphertext: c.secretCiphertext,
    iv: c.secretIv,
    tag: c.secretTag,
  });
  if (c.secretCiphertext && !secret)
    throw new CredentialAccessError("La credencial requiere revisión. Contacta a Zyteron.", 503);
  if (!secret && !c.url) throw new CredentialAccessError("No hay un acceso disponible.", 404);
  return {
    ok: true,
    secret,
    username: c.username || "",
    url: c.url || "",
    notes: c.notes || "",
    visibleSeconds: 30,
  };
}
