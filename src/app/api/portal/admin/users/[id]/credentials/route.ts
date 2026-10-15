import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/security/secret-crypto";
import { credentialAdminSchema } from "@/lib/security/credential-admin-schema";
import { credentialPaymentStates } from "@/lib/security/credential-payment-access";
import { boundedJson } from "@/lib/security/public-intake";
import { configuredRequestOrigins, isAllowedMutationOrigin } from "@/lib/security/request-origin";
type Context = { params: Promise<{ id: string }> };
const headers = { "cache-control": "no-store, private", "x-content-type-options": "nosniff" };
export async function GET(_req: Request, { params }: Context) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  const { id } = await params;
  try {
    const data = await prisma.$transaction(async (db) => {
      const client = await db.user.findFirst({
        where: { id, role: "CLIENT" },
        select: { id: true, email: true },
      });
      if (!client) return null;
      const [rows, projects] = await Promise.all([
        db.clientCredential.findMany({
          where: { userId: id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            serviceName: true,
            username: true,
            url: true,
            notes: true,
            projectId: true,
            secretCiphertext: true,
          },
        }),
        db.project.findMany({
          where: { clientId: id },
          select: { id: true, title: true, totalCharge: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      const access = await credentialPaymentStates(db, id, [null, ...projects.map((p) => p.id)]);
      return {
        client,
        projects: projects.map((p) => ({ ...p, access: access.get(p.id) })),
        credentials: rows.map(({ secretCiphertext, ...c }) => ({
          ...c,
          hasSecret: Boolean(secretCiphertext),
          access: access.get(c.projectId) || access.get(null),
        })),
      };
    });
    return data
      ? NextResponse.json(data, { headers })
      : NextResponse.json({ error: "Cliente no encontrado." }, { status: 404, headers });
  } catch {
    return NextResponse.json(
      { error: "No fue posible consultar las credenciales." },
      { status: 503, headers },
    );
  }
}
async function save(req: Request, { params }: Context) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  if (
    !isAllowedMutationOrigin({
      requestOrigin: new URL(req.url).origin,
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
      secFetchSite: req.headers.get("sec-fetch-site"),
      allowedOrigins: configuredRequestOrigins(),
    })
  )
    return NextResponse.json({ error: "Origen no autorizado." }, { status: 403, headers });
  const input = credentialAdminSchema.safeParse(await boundedJson(req, 12000).catch(() => null));
  if (!input.success)
    return NextResponse.json(
      {
        error:
          "Revisa el servicio, el proyecto y la URL HTTPS. Las claves se ingresan sólo en el campo secreto.",
      },
      { status: 400, headers },
    );
  const { id } = await params,
    value = input.data,
    editing = req.method === "PATCH";
  if (editing !== Boolean(value.credentialId))
    return NextResponse.json({ error: "Operación inválida." }, { status: 400, headers });
  const actorId = auth.legacy ? null : auth.session.user.id;
  try {
    const result = await prisma.$transaction(async (db) => {
      const client = await db.user.findFirst({
        where: { id, role: "CLIENT" },
        select: { id: true },
      });
      const project = await db.project.findFirst({
        where: { id: value.projectId, clientId: id },
        select: { id: true },
      });
      if (!client || !project) throw Error("INVALID_BINDING");
      const existing = editing
        ? await db.clientCredential.findFirst({ where: { id: value.credentialId, userId: id } })
        : null;
      if (editing && !existing) throw Error("INVALID_BINDING");
      if (!value.secret && !value.url && !existing?.secretCiphertext)
        throw Error("EMPTY_CREDENTIAL");
      const encrypted = value.secret ? encryptSecret(value.secret) : null;
      const data = {
        projectId: project.id,
        serviceName: value.serviceName,
        username: value.username || null,
        url: value.url || null,
        notes: value.notes || null,
        isSensitive: true,
        updatedById: actorId,
        ...(encrypted
          ? {
              secretCiphertext: encrypted.ciphertext,
              secretIv: encrypted.iv,
              secretTag: encrypted.tag,
            }
          : {}),
      };
      const saved = existing
        ? await db.clientCredential.update({
            where: { id: existing.id },
            data,
            select: { id: true },
          })
        : await db.clientCredential.create({
            data: { ...data, userId: id, createdById: actorId },
            select: { id: true },
          });
      await db.emailVerificationCode.updateMany({
        where: { userId: id, email: { startsWith: "credential-reveal:" }, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await db.clientAuditLog.create({
        data: {
          actorId,
          targetUserId: id,
          action: existing ? "ADMIN_CLIENT_CREDENTIAL_UPDATE" : "ADMIN_CLIENT_CREDENTIAL_CREATE",
          entityType: "ClientCredential",
          entityId: saved.id,
          details: {
            serviceName: value.serviceName,
            projectId: project.id,
            secretChanged: Boolean(encrypted),
          },
        },
      });
      return saved;
    });
    return NextResponse.json({ ok: true, id: result.id }, { headers });
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo guardar. Selecciona un proyecto del cliente y registra un secreto o una URL válida.",
      },
      { status: 400, headers },
    );
  }
}
export { save as POST, save as PATCH };
