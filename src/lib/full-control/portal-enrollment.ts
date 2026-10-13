import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createEmailVerificationCode } from "@/lib/auth/portal-codes";
import { sendPortalVerificationCodeEmail } from "@/lib/notifications/portal-email";
type Settings = {
  enabled: boolean;
  projectsVisible: boolean;
  documentsVisible: boolean;
  invoicesVisible: boolean;
  ticketsVisible: boolean;
  monitoringVisible: boolean;
  auditsVisible: boolean;
};
const patch = z
  .object({
    enabled: z.boolean().optional(),
    projectsVisible: z.boolean().optional(),
    documentsVisible: z.boolean().optional(),
    invoicesVisible: z.boolean().optional(),
    ticketsVisible: z.boolean().optional(),
    monitoringVisible: z.boolean().optional(),
    auditsVisible: z.boolean().optional(),
  })
  .strict();
const defaults: Settings = {
  enabled: false,
  projectsVisible: true,
  documentsVisible: true,
  invoicesVisible: true,
  ticketsVisible: true,
  monitoringVisible: true,
  auditsVisible: true,
};
export async function ensureNativePortalAccount(clientId: string) {
  return prisma.$transaction(
    async (db) => {
      const client = (
        await db.$queryRaw<
          Array<{
            id: string;
            legal_name: string;
            general_email: string | null;
            phone: string | null;
            rut: string | null;
          }>
        >`SELECT id,legal_name,general_email,phone,rut FROM clients WHERE id=${clientId}::uuid FOR UPDATE`
      )[0];
      if (!client) throw new Error("CLIENT_NOT_FOUND");
      const link = (
        await db.$queryRaw<
          Array<{ user_id: string }>
        >`SELECT user_id FROM zyteron_legacy_client_link WHERE client_id=${clientId}::uuid`
      )[0];
      if (link) return link.user_id;
      const email = client.general_email?.trim().toLowerCase();
      if (!email || !z.email().safeParse(email).success) throw new Error("CLIENT_EMAIL_REQUIRED");
      const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) throw new Error("CLIENT_MEMBERSHIP_REQUIRES_REVIEW");
      const user = await db.user.create({
        data: {
          id: randomUUID(),
          email,
          name: client.legal_name,
          company: client.legal_name,
          phone: client.phone,
          rut: client.rut,
          role: "CLIENT",
          accountStatus: "PENDING",
          passwordHash: await hash(randomBytes(32).toString("base64url"), 12),
        },
        select: { id: true },
      });
      await db.$executeRaw`INSERT INTO zyteron_legacy_client_link(user_id,client_id) VALUES(${user.id},${clientId}::uuid)`;
      await db.$executeRaw`INSERT INTO client_portal_settings(client_id,enabled,projects_visible,documents_visible,invoices_visible,tickets_visible,monitoring_visible,audits_visible) VALUES(${clientId}::uuid,false,true,true,true,true,true,true) ON CONFLICT(client_id) DO NOTHING`;
      await db.clientAuditLog.create({
        data: {
          targetUserId: user.id,
          action: "CONTROL_PORTAL_ACCOUNT_PREPARED",
          entityType: "User",
          entityId: user.id,
        },
      });
      return user.id;
    },
    { timeout: 20_000 },
  );
}
export async function nativePortalSettings(path: string, request: Request, payload: Buffer) {
  const match = /^\/clients\/([0-9a-f-]{36})\/portal(?:\/(invite))?$/.exec(path);
  if (!match) return null;
  const clientId = match[1]!,
    link = (
      await prisma.$queryRaw<
        Array<{ user_id: string }>
      >`SELECT user_id FROM zyteron_legacy_client_link WHERE client_id=${clientId}::uuid`
    )[0];
  if (!link && request.method === "GET") return null;
  const userId = link?.user_id || (await ensureNativePortalAccount(clientId));
  if (match[2] === "invite" && request.method === "POST") {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, emailVerifiedAt: true },
    });
    if (!u) throw new Error("CLIENT_NOT_FOUND");
    if (u.emailVerifiedAt)
      return NextResponse.json({ ok: true, message: "El correo ya está verificado." });
    const code = await createEmailVerificationCode({ userId, email: u.email });
    const result = await sendPortalVerificationCodeEmail({
      to: u.email,
      fullName: u.name,
      code: code.code,
      expiresMinutes: code.expiresMinutes,
    });
    if (!result.sent)
      return NextResponse.json(
        { message: "No fue posible enviar la invitación. El acceso sigue protegido." },
        { status: 502 },
      );
    return NextResponse.json({
      ok: true,
      message: "Código de verificación enviado al correo de esta cuenta.",
    });
  }
  const rows = await prisma.$queryRaw<
    Array<{
      enabled: boolean;
      projects_visible: boolean;
      documents_visible: boolean;
      invoices_visible: boolean;
      tickets_visible: boolean;
      monitoring_visible: boolean;
      audits_visible: boolean;
    }>
  >`SELECT enabled,projects_visible,documents_visible,invoices_visible,tickets_visible,monitoring_visible,audits_visible FROM client_portal_settings WHERE client_id=${clientId}::uuid`;
  const r = rows[0],
    values: Settings = r
      ? {
          enabled: r.enabled,
          projectsVisible: r.projects_visible,
          documentsVisible: r.documents_visible,
          invoicesVisible: r.invoices_visible,
          ticketsVisible: r.tickets_visible,
          monitoringVisible: r.monitoring_visible,
          auditsVisible: r.audits_visible,
        }
      : { ...defaults };
  if (request.method === "PATCH") {
    const data = patch.parse(JSON.parse(payload.toString()));
    Object.assign(values, data);
    await prisma.$transaction(async (db) => {
      await db.$executeRaw`INSERT INTO client_portal_settings(client_id,enabled,projects_visible,documents_visible,invoices_visible,tickets_visible,monitoring_visible,audits_visible) VALUES(${clientId}::uuid,${values.enabled},${values.projectsVisible},${values.documentsVisible},${values.invoicesVisible},${values.ticketsVisible},${values.monitoringVisible},${values.auditsVisible}) ON CONFLICT(client_id) DO UPDATE SET enabled=EXCLUDED.enabled,projects_visible=EXCLUDED.projects_visible,documents_visible=EXCLUDED.documents_visible,invoices_visible=EXCLUDED.invoices_visible,tickets_visible=EXCLUDED.tickets_visible,monitoring_visible=EXCLUDED.monitoring_visible,audits_visible=EXCLUDED.audits_visible,updated_at=now()`;
      if (data.enabled !== undefined) {
        const current = await db.user.findUnique({
          where: { id: userId },
          select: { emailVerifiedAt: true },
        });
        await db.user.update({
          where: { id: userId },
          data: {
            accountStatus: values.enabled
              ? current?.emailVerifiedAt
                ? "ACTIVE"
                : "PENDING"
              : "DISABLED",
            sessionVersion: { increment: 1 },
          },
        });
      }
      await db.clientAuditLog.create({
        data: {
          targetUserId: userId,
          action: "CONTROL_PORTAL_SETTINGS_UPDATED",
          entityType: "ClientPortalSettings",
          entityId: clientId,
        },
      });
    });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountStatus: true, emailVerifiedAt: true },
  });
  return NextResponse.json(
    {
      clientId,
      ...values,
      accountStatus: user?.accountStatus,
      emailVerified: !!user?.emailVerifiedAt,
      updatedAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
