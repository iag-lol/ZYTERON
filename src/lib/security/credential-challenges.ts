import { randomInt, randomUUID } from "node:crypto";
import { compare } from "bcrypt";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPortalCredentialRevealCodeEmail } from "@/lib/notifications/portal-email";
import { decryptSecret } from "./secret-crypto";
import { CredentialAccessError } from "./credential-access-error";
import {
  CREDENTIAL_CODE_MINUTES,
  CREDENTIAL_CODE_PREFIX,
  CREDENTIAL_MAX_ATTEMPTS,
  CREDENTIAL_SECURITY_EMAIL,
  credentialCodeScope,
  credentialHashesEqual,
  hashCredentialCode,
} from "./credential-challenge-policy";

async function lockActiveOwner(tx: Prisma.TransactionClient, userId: string, credentialId: string) {
  // PostgreSQL row lock serializes sends and consumption across all server instances.
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (
    !user ||
    user.accountStatus !== "ACTIVE" ||
    !user.emailVerifiedAt ||
    user.authProvider !== "LOCAL"
  ) {
    throw new CredentialAccessError("Se requiere una cuenta local activa y verificada.");
  }
  const credential = await tx.clientCredential.findFirst({ where: { id: credentialId, userId } });
  if (!credential) throw new CredentialAccessError("Credencial no disponible.", 404);
  return { user, credential };
}

export async function sendCredentialCodes(userId: string, credentialId: string) {
  const challenge = await prisma.$transaction(async (tx) => {
    const { user, credential } = await lockActiveOwner(tx, userId, credentialId);
    const now = new Date();
    const recent = await tx.emailVerificationCode.findMany({
      where: {
        userId,
        email: { startsWith: `${CREDENTIAL_CODE_PREFIX}owner:` },
        createdAt: { gte: new Date(now.getTime() - 15 * 60_000) },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    });
    if (
      recent.length >= 4 ||
      (recent[0] && now.getTime() - recent[0].createdAt.getTime() < 60_000)
    ) {
      throw new CredentialAccessError(
        "Límite de envíos alcanzado. Espera antes de solicitar otros códigos.",
        429,
      );
    }
    await tx.emailVerificationCode.updateMany({
      where: { userId, email: { startsWith: CREDENTIAL_CODE_PREFIX }, consumedAt: null },
      data: { consumedAt: now },
    });
    const challengeId = randomUUID();
    const code = String(randomInt(100000, 1000000));
    let approvalCode = String(randomInt(100000, 1000000));
    while (approvalCode === code) approvalCode = String(randomInt(100000, 1000000));
    const expiresAt = new Date(now.getTime() + CREDENTIAL_CODE_MINUTES * 60_000);
    const context = { userId, credentialId, challengeId };
    await tx.emailVerificationCode.createMany({
      data: [
        {
          id: challengeId,
          userId,
          email: credentialCodeScope(credentialId, "owner"),
          expiresAt,
          codeHash: hashCredentialCode({
            ...context,
            recipient: user.email,
            factor: "owner",
            code,
          }),
        },
        {
          id: `${challengeId}:approval`,
          userId,
          email: credentialCodeScope(credentialId, "approval"),
          expiresAt,
          codeHash: hashCredentialCode({
            ...context,
            recipient: CREDENTIAL_SECURITY_EMAIL,
            factor: "approval",
            code: approvalCode,
          }),
        },
      ],
    });
    return { challengeId, code, approvalCode, user, credential };
  });
  try {
    // Distinct messages: the owner's email never contains the approval code.
    const ownerEmail = await sendPortalCredentialRevealCodeEmail({
      to: challenge.user.email,
      fullName: challenge.user.name,
      code: challenge.code,
      serviceName: challenge.credential.serviceName,
      expiresMinutes: CREDENTIAL_CODE_MINUTES,
    });
    const approvalEmail = await sendPortalCredentialRevealCodeEmail({
      to: CREDENTIAL_SECURITY_EMAIL,
      fullName: "Equipo Zyteron",
      code: challenge.approvalCode,
      serviceName: `${challenge.credential.serviceName} — solicitante: ${challenge.user.email}`,
      expiresMinutes: CREDENTIAL_CODE_MINUTES,
    });
    if (!ownerEmail.sent || !approvalEmail.sent) throw new Error("Email delivery failed.");
  } catch {
    await prisma.emailVerificationCode.updateMany({
      where: { id: { in: [challenge.challengeId, `${challenge.challengeId}:approval`] } },
      data: { consumedAt: new Date() },
    });
    throw new CredentialAccessError(
      "No se pudieron enviar ambos códigos. Solicita nuevos códigos más tarde.",
      503,
    );
  }
  return {
    ok: true,
    challengeId: challenge.challengeId,
    message: "Códigos enviados al correo del dueño y a contacto@zyteron.cl. Expiran en 5 minutos.",
  };
}

export async function revealCredential(
  userId: string,
  credentialId: string,
  input: {
    password: string;
    code: string;
    approvalCode: string;
    challengeId: string;
  },
) {
  const result = await prisma.$transaction(async (tx) => {
    const { user, credential } = await lockActiveOwner(tx, userId, credentialId);
    const now = new Date();
    const records = await tx.emailVerificationCode.findMany({
      where: {
        id: { in: [input.challengeId, `${input.challengeId}:approval`] },
        userId,
        consumedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: CREDENTIAL_MAX_ATTEMPTS },
      },
    });
    const owner = records.find(
      (r) => r.id === input.challengeId && r.email === credentialCodeScope(credentialId, "owner"),
    );
    const approval = records.find(
      (r) =>
        r.id === `${input.challengeId}:approval` &&
        r.email === credentialCodeScope(credentialId, "approval"),
    );
    if (!owner || !approval)
      return { error: "Solicita nuevos códigos: la solicitud expiró o ya fue utilizada." };
    // Count password failures too; return errors rather than throwing to commit attempts.
    await tx.emailVerificationCode.updateMany({
      where: { id: { in: [owner.id, approval.id] } },
      data: { attempts: { increment: 1 } },
    });
    const context = { userId, credentialId, challengeId: input.challengeId };
    const ownerValid = credentialHashesEqual(
      owner.codeHash,
      hashCredentialCode({ ...context, recipient: user.email, factor: "owner", code: input.code }),
    );
    const approvalValid = credentialHashesEqual(
      approval.codeHash,
      hashCredentialCode({
        ...context,
        recipient: CREDENTIAL_SECURITY_EMAIL,
        factor: "approval",
        code: input.approvalCode,
      }),
    );
    const passwordValid = await compare(input.password, user.passwordHash);
    if (!ownerValid || !approvalValid || !passwordValid)
      return { error: "Contraseña o códigos incorrectos. Máximo 5 intentos por solicitud." };
    // Lock + atomic paired consumption prevents concurrent replay and partial approval.
    await tx.emailVerificationCode.updateMany({
      where: { id: { in: [owner.id, approval.id] } },
      data: { consumedAt: new Date() },
    });
    return { credential };
  });
  if (result.error || !result.credential)
    throw new CredentialAccessError(result.error || "Acceso denegado.", 401);
  const secret = decryptSecret({
    ciphertext: result.credential.secretCiphertext,
    iv: result.credential.secretIv,
    tag: result.credential.secretTag,
  });
  if (!secret) throw new CredentialAccessError("No hay secreto disponible.", 404);
  return { ok: true, secret };
}
