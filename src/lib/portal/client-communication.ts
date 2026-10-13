import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export async function publishClientCommunication(
  input: { userId: string; subject: string; message: string },
  actorId: string | null,
  key?: string | null,
  transaction?: Prisma.TransactionClient,
) {
  if (key && !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) throw new Error("IDEMPOTENCY_INVALID");
  const id = key
    ? "msg-" +
      createHash("sha256")
        .update([actorId || "owner", input.userId, key].join("\n"))
        .digest("hex")
    : randomUUID();
  const work = async (db: Prisma.TransactionClient) => {
    const users = await db.$queryRaw<
      Array<{ role: string }>
    >`SELECT role::text FROM "User" WHERE id=${input.userId} FOR SHARE`;
    if (users[0]?.role !== "CLIENT") throw new Error("CLIENT_NOT_FOUND");
    const inserted = await db.clientCommunication.createMany({
      data: { id, ...input, direction: "OUTBOUND", channel: "PORTAL" },
      skipDuplicates: true,
    });
    const communication = await db.clientCommunication.findUniqueOrThrow({ where: { id } });
    if (
      communication.userId !== input.userId ||
      communication.subject !== input.subject ||
      communication.message !== input.message ||
      communication.channel !== "PORTAL"
    )
      throw new Error("IDEMPOTENCY_CONFLICT");
    if (inserted.count) {
      await db.clientNotification.create({
        data: {
          userId: input.userId,
          title: `Nuevo mensaje: ${input.subject}`,
          body: input.message.slice(0, 200),
          type: "INFO",
          link: "/clientes/panel/asistencia",
        },
      });
      await db.clientAuditLog.create({
        data: {
          actorId,
          targetUserId: input.userId,
          action: "ADMIN_COMMUNICATION_SENT",
          entityType: "ClientCommunication",
          entityId: id,
          details: { channel: "PORTAL", subject: input.subject },
        },
      });
    }
    return communication;
  };
  return transaction ? work(transaction) : prisma.$transaction(work);
}
