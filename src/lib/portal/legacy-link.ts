import "server-only";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

/** Administrator/migration only. Never merge companies from caller-supplied RUT. */
export async function ensureLegacyClientLink(db: Prisma.TransactionClient, userId: string) {
  await db.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
  const existing = await db.$queryRaw<
    Array<{ client_id: string }>
  >`SELECT client_id FROM zyteron_legacy_client_link WHERE user_id=${userId}`;
  if (existing[0]) return existing[0].client_id;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      name: true,
      company: true,
      email: true,
      phone: true,
      address: true,
      country: true,
      rut: true,
    },
  });
  if (!user || user.role !== "CLIENT" || !(user.company || user.name).trim())
    throw new Error("CLIENT_LINK_NOT_ALLOWED");
  const id = randomUUID();
  const rut = user.rut?.trim() || null;
  const duplicate = rut
    ? await db.$queryRaw<Array<{ id: string }>>`SELECT id FROM clients WHERE rut=${rut}`
    : [];
  // A duplicate identifier needs an explicit administrator decision, not an
  // automatic cross-account membership. Preserve the legacy RUT on User.
  await db.$executeRaw`INSERT INTO clients(id,legal_name,trade_name,rut,general_email,phone,address,country,status,source) VALUES(${id}::uuid,${(user.company || user.name).trim()},${user.company || null},${duplicate.length ? null : rut},${user.email},${user.phone},${user.address},${user.country || "Chile"},'ONBOARDING','LEGACY_WEB')`;
  await db.$executeRaw`INSERT INTO zyteron_legacy_client_link(user_id,client_id) VALUES(${userId},${id}::uuid)`;
  return id;
}
