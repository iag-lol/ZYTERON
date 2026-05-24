import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
function resolveDatabaseUrl() {
  const raw = String(process.env.DATABASE_URL || "").trim();
  if (raw) return raw;
  if (process.env.NODE_ENV !== "production") {
    return "postgresql://localhost:5432/zyteron";
  }
  throw new Error(
    "Falta DATABASE_URL en el entorno de producción. El portal no puede conectarse a PostgreSQL.",
  );
}

const connectionString = resolveDatabaseUrl();
const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
