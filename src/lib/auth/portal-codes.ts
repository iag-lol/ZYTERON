import { addMinutes, subMinutes } from "date-fns";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashOtpCode } from "@/lib/security/secret-crypto";

const VERIFY_CODE_EXP_MIN = 15;
const VERIFY_MAX_ATTEMPTS = 5;
const VERIFY_MIN_RESEND_SECONDS = 45;
const VERIFY_MAX_SENDS_15MIN = 4;

const RESET_CODE_EXP_MIN = 15;
const RESET_MAX_ATTEMPTS = 5;
const RESET_MIN_RESEND_SECONDS = 45;
const RESET_MAX_SENDS_15MIN = 4;

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function buildCode() {
  return String(randomInt(100000, 1000000));
}

export function getCodeConfig() {
  return {
    verifyExpiresMinutes: VERIFY_CODE_EXP_MIN,
    resetExpiresMinutes: RESET_CODE_EXP_MIN,
  };
}

export async function createEmailVerificationCode(input: { userId: string; email: string }) {
  const email = normalizeEmail(input.email);
  const recentWindow = subMinutes(new Date(), 15);
  const recentCount = await prisma.emailVerificationCode.count({
    where: { userId: input.userId, email, createdAt: { gte: recentWindow } },
  });
  if (recentCount >= VERIFY_MAX_SENDS_15MIN) {
    throw new Error("Has superado el límite de envíos. Espera unos minutos e inténtalo nuevamente.");
  }

  const latest = await prisma.emailVerificationCode.findFirst({
    where: { userId: input.userId, email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (latest) {
    const seconds = Math.floor((Date.now() - latest.lastSentAt.getTime()) / 1000);
    if (seconds < VERIFY_MIN_RESEND_SECONDS) {
      throw new Error(`Espera ${VERIFY_MIN_RESEND_SECONDS - seconds}s para reenviar el código.`);
    }
  }

  await prisma.emailVerificationCode.updateMany({
    where: { userId: input.userId, email, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = buildCode();
  await prisma.emailVerificationCode.create({
    data: {
      userId: input.userId,
      email,
      codeHash: hashOtpCode(code),
      expiresAt: addMinutes(new Date(), VERIFY_CODE_EXP_MIN),
      attempts: 0,
      sentCount: 1,
      lastSentAt: new Date(),
    },
  });

  return { code, expiresMinutes: VERIFY_CODE_EXP_MIN };
}

export async function verifyEmailCode(input: { userId: string; email: string; code: string }) {
  const email = normalizeEmail(input.email);
  const codeHash = hashOtpCode(String(input.code).trim());
  const record = await prisma.emailVerificationCode.findFirst({
    where: { userId: input.userId, email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new Error("No hay un código activo para este correo.");
  }
  if (record.expiresAt < new Date()) {
    throw new Error("El código expiró. Solicita uno nuevo.");
  }
  if (record.attempts >= VERIFY_MAX_ATTEMPTS) {
    throw new Error("Demasiados intentos fallidos. Solicita un nuevo código.");
  }
  if (record.codeHash !== codeHash) {
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("El código ingresado no es válido.");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { consumedAt: now },
    }),
    prisma.user.update({
      where: { id: input.userId },
      data: { emailVerifiedAt: now, accountStatus: "ACTIVE" },
    }),
  ]);
}

export async function createPasswordResetCode(input: { userId: string; email: string }) {
  const email = normalizeEmail(input.email);
  const recentWindow = subMinutes(new Date(), 15);
  const recentCount = await prisma.passwordResetCode.count({
    where: { userId: input.userId, email, createdAt: { gte: recentWindow } },
  });
  if (recentCount >= RESET_MAX_SENDS_15MIN) {
    throw new Error("Has superado el límite de envíos. Espera unos minutos e inténtalo nuevamente.");
  }

  const latest = await prisma.passwordResetCode.findFirst({
    where: { userId: input.userId, email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (latest) {
    const seconds = Math.floor((Date.now() - latest.lastSentAt.getTime()) / 1000);
    if (seconds < RESET_MIN_RESEND_SECONDS) {
      throw new Error(`Espera ${RESET_MIN_RESEND_SECONDS - seconds}s para solicitar otro código.`);
    }
  }

  await prisma.passwordResetCode.updateMany({
    where: { userId: input.userId, email, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = buildCode();
  await prisma.passwordResetCode.create({
    data: {
      userId: input.userId,
      email,
      codeHash: hashOtpCode(code),
      expiresAt: addMinutes(new Date(), RESET_CODE_EXP_MIN),
      attempts: 0,
      sentCount: 1,
      lastSentAt: new Date(),
    },
  });

  return { code, expiresMinutes: RESET_CODE_EXP_MIN };
}

export async function verifyPasswordResetCode(input: {
  userId: string;
  email: string;
  code: string;
}) {
  const email = normalizeEmail(input.email);
  const codeHash = hashOtpCode(String(input.code).trim());
  const record = await prisma.passwordResetCode.findFirst({
    where: { userId: input.userId, email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new Error("No hay un código activo para este correo.");
  }
  if (record.expiresAt < new Date()) {
    throw new Error("El código expiró. Solicita uno nuevo.");
  }
  if (record.attempts >= RESET_MAX_ATTEMPTS) {
    throw new Error("Demasiados intentos fallidos. Solicita un nuevo código.");
  }
  if (record.codeHash !== codeHash) {
    await prisma.passwordResetCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("Código de recuperación inválido.");
  }

  await prisma.passwordResetCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}

