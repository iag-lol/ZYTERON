import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Claims come from the verified server session, never a header or request body.
// SET LOCAL is reverted on commit/rollback, including with pooled connections.
export async function clientDatabase<T>(
  userId: string,
  work: (db: Prisma.TransactionClient) => Promise<T>,
) {
  if (!userId || userId.length > 100) throw new Error("PORTAL_ACCESS_DENIED");
  return prisma.$transaction(
    async (db) => {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { accountStatus: true, emailVerifiedAt: true },
      });
      if (!user || user.accountStatus !== "ACTIVE" || !user.emailVerifiedAt)
        throw new Error("PORTAL_ACCESS_DENIED");
      await db.$queryRaw`SELECT set_config('zyteron.portal_user_id',${userId},true)`;
      await db.$executeRaw`SET LOCAL ROLE zyteron_portal_client`;
      return work(db);
    },
    { maxWait: 10000, timeout: 20000 },
  );
}

const models = new Set([
  "user",
  "quote",
  "project",
  "sale",
  "taxDocument",
  "clientDocument",
  "supportTicket",
  "supportTicketMessage",
  "clientNotification",
  "clientCommunication",
  "clientCredential",
  "portalRequest",
  "clientAuditLog",
  "receivable",
  "payment",
  "paymentAllocation",
  "clientProcess",
  "clientProcessEvent",
  "clientRequest",
  "workOrder",
  "visit",
]);
const operations = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "create",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

/** Compatibility facade for existing portal pages, still enforced by DB RLS. */
export function getScopedPortalDatabase(userId: string): PrismaClient {
  return new Proxy(prisma, {
    get(_target, property) {
      if (property === "$queryRaw" || property === "$executeRaw")
        return (...args: unknown[]) =>
          clientDatabase(userId, (db) => Reflect.apply(Reflect.get(db, property), db, args));
      if (property === "$transaction")
        return (work: (db: Prisma.TransactionClient) => Promise<unknown>) => {
          if (typeof work !== "function") throw new Error("PORTAL_TRANSACTION_REQUIRED");
          return clientDatabase(userId, work);
        };
      if (typeof property !== "string" || !models.has(property))
        throw new Error("PORTAL_OPERATION_DENIED");
      return new Proxy(
        {},
        {
          get(_model, operation) {
            if (typeof operation !== "string" || !operations.has(operation))
              throw new Error("PORTAL_OPERATION_DENIED");
            return (...args: unknown[]) =>
              clientDatabase(userId, async (db) => {
                const model = Reflect.get(db, property);
                return Reflect.apply(Reflect.get(model, operation), model, args);
              });
          },
        },
      );
    },
  });
}
