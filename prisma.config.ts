import { defineConfig } from "prisma/config";

// Prisma CLI (db push, migrate) needs a direct connection, not the transaction pooler.
// We force port 5432 here. The actual app uses the pooler (6543) via src/lib/prisma.ts.
const rawUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "postgresql://localhost:5432/zyteron";
const directUrl = rawUrl.replace(":6543", ":5432");

export default defineConfig({
  datasource: {
    url: directUrl,
  },
});
