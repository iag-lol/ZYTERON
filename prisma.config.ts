import { defineConfig } from "prisma/config";

const dbUrl = process.env.DATABASE_URL ?? "postgresql://localhost:5432/zyteron";
const directUrl = process.env.DIRECT_URL ?? dbUrl.replace(":6543", ":5432");

export default defineConfig({
  datasource: {
    url: dbUrl,
    directUrl: directUrl,
  },
});
