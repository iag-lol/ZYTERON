import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AccountStatus, AuthProvider, Role } from "@prisma/client";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { createEmailVerificationCode } from "@/lib/auth/portal-codes";
import { logPortalAdminAction } from "@/lib/portal/audit";
import { sendPortalVerificationCodeEmail } from "@/lib/notifications/portal-email";
import { prisma } from "@/lib/prisma";

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function hashPassword(raw: string) {
  return import("bcrypt").then(({ hash: bcryptHash }) => bcryptHash(raw, 12));
}

export async function GET(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = String(searchParams.get("search") || "").trim();
  const verified = String(searchParams.get("verified") || "all");
  const status = String(searchParams.get("status") || "all");

  const users = await prisma.user.findMany({
    where: {
      role: Role.CLIENT,
      ...(verified === "yes"
        ? { emailVerifiedAt: { not: null } }
        : verified === "no"
          ? { emailVerifiedAt: null }
          : {}),
      ...(status !== "all" ? { accountStatus: status as AccountStatus } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { company: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      phone: true,
      accountStatus: true,
      role: true,
      emailVerifiedAt: true,
      createdAt: true,
      _count: {
        select: {
          quotes: true,
          projects: true,
          sales: true,
          taxDocuments: true,
          documents: true,
          supportTickets: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, users });
}

export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;

  try {
    const body = (await req.json().catch(() => null)) as
      | {
          firstName?: string;
          lastName?: string;
          email?: string;
          company?: string;
          phone?: string;
          password?: string;
          sendVerificationCode?: boolean;
        }
      | null;

    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    const email = normalizeEmail(String(body?.email || ""));
    const company = String(body?.company || "").trim();
    const phone = String(body?.phone || "").trim();
    const password = String(body?.password || "");
    const sendVerificationCode = Boolean(body?.sendVerificationCode);

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Nombre, apellido y correo son obligatorios." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });
    }

    const passwordHash = password
      ? await hashPassword(password)
      : await hashPassword(randomUUID().slice(0, 12));

    const fullName = `${firstName} ${lastName}`.trim();
    const created = await prisma.user.create({
      data: {
        firstName,
        lastName,
        name: fullName,
        email,
        company: company || null,
        phone: phone || null,
        passwordHash,
        role: Role.CLIENT,
        authProvider: AuthProvider.LOCAL,
        accountStatus: AccountStatus.PENDING,
      },
      select: { id: true, name: true, email: true },
    });

    if (sendVerificationCode) {
      const { code, expiresMinutes } = await createEmailVerificationCode({
        userId: created.id,
        email: created.email,
      });
      await sendPortalVerificationCodeEmail({
        to: created.email,
        fullName: created.name,
        code,
        expiresMinutes,
      });
    }

    const actorId = auth.legacy ? null : auth.session.user.id;
    await logPortalAdminAction({
      actorId,
      targetUserId: created.id,
      action: "ADMIN_CLIENT_CREATE",
      entityType: "User",
      entityId: created.id,
      details: { sendVerificationCode },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el usuario.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
