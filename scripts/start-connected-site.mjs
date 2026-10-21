import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { applyWhatsappCommercialMigration } from "./apply-whatsapp-commercial.mjs";
process.env.NODE_ENV ||= "production";
process.env.CONTROL_EMBEDDED = "true";
if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = new URL(process.env.SUPABASE_URL).origin;
process.env.CONTROL_BRIDGE_KEY = randomBytes(48).toString("hex");
process.env.CONTROL_INTERNAL_PORT ||= "4010";
if (
  !/^\d+$/.test(process.env.CONTROL_INTERNAL_PORT) ||
  Number(process.env.CONTROL_INTERNAL_PORT) < 1024 ||
  Number(process.env.CONTROL_INTERNAL_PORT) > 65535 ||
  process.env.CONTROL_INTERNAL_PORT === process.env.PORT
)
  throw new Error("Puerto administrativo interno inválido.");
process.env.API_BIND_ADDRESS = "127.0.0.1";
process.env.AUTH_MODE = "supabase";
process.env.WEB_ORIGIN ||=
  process.env.NEXTAUTH_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";
process.env.MONITORING_WORKER_ENABLED ||= "true";
process.env.MONITORING_MAX_CONCURRENCY ||= "2";
process.env.MONITORING_PROCESS_ROLE = "api";
process.env.FLOW_WORKER_ENABLED = "false";
for (const [name, value] of Object.entries({
  RATE_LIMIT_DEFAULT_PER_MINUTE: "300",
  RATE_LIMIT_AUTH_PER_MINUTE: "60",
  RATE_LIMIT_VAULT_PER_MINUTE: "30",
  RATE_LIMIT_EXPORT_PER_MINUTE: "30",
  RATE_LIMIT_WEBHOOK_PER_MINUTE: "120",
}))
  process.env[name] ||= value;
// Both servers share one Node process and memory budget on the existing paid service.
await applyWhatsappCommercialMigration();
const { bootstrapControlApi } = await import(
  pathToFileURL(resolve("control-runtime/dist/main.js")).href
);
await bootstrapControlApi();
process.argv = [
  process.execPath,
  resolve("node_modules/next/dist/bin/next"),
  "start",
  ...process.argv.slice(2),
];
await import("next/dist/bin/next");
