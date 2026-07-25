import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function has(name: string) {
  const v = process.env[name];
  return typeof v === "string" && v.trim().replace(/^['"]|['"]$/g, "").trim().length > 0;
}

/**
 * Diagnóstico del módulo WhatsApp (solo admin). Devuelve booleanos y conteos,
 * nunca valores de tokens. Ayuda a detectar qué falta para que llegue el 1er
 * mensaje: variables de entorno, tablas de Supabase y URL del webhook.
 */
export async function GET(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  const env = {
    META_WHATSAPP_TOKEN: has("META_WHATSAPP_TOKEN"),
    META_WHATSAPP_PHONE_ID: has("META_WHATSAPP_PHONE_ID"),
    WHATSAPP_VERIFY_TOKEN: has("WHATSAPP_VERIFY_TOKEN"),
    META_WHATSAPP_TO: has("META_WHATSAPP_TO"),
    OPENAI_API_KEY: has("OPENAI_API_KEY"),
    NEXT_PUBLIC_SUPABASE_URL: has("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: has("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: has("SUPABASE_SERVICE_ROLE_KEY"),
  };

  const db: Record<string, unknown> = {};
  try {
    const { supabase } = createSupabaseServerClient();
    for (const table of ["whatsapp_conversations", "whatsapp_messages"]) {
      const { count, error } = await supabase
        .schema("public")
        .from(table)
        .select("*", { count: "exact", head: true });
      db[table] = error ? `ERROR: ${error.message}` : `ok (${count ?? 0} filas)`;
    }
  } catch (e) {
    db.error = e instanceof Error ? e.message : "No se pudo conectar a Supabase.";
  }

  const origin = new URL(req.url).origin;

  return NextResponse.json({
    ok: true,
    env,
    db,
    webhook: {
      callbackUrl: `${origin}/api/whatsapp/webhook`,
      verifyTokenConfigured: env.WHATSAPP_VERIFY_TOKEN,
      note:
        "En Meta: WhatsApp > Configuración > Webhooks. Callback URL debe ser la de arriba, " +
        "Verify Token debe coincidir con WHATSAPP_VERIFY_TOKEN, y hay que SUSCRIBIR el campo 'messages'.",
    },
    checklist: {
      recibir_no_requiere: "Verificación del negocio y plantilla NO son necesarias para recibir/responder en 24h.",
      pasos: [
        env.META_WHATSAPP_TOKEN && env.META_WHATSAPP_PHONE_ID
          ? "OK: token y phone id presentes."
          : "FALTA: configurar META_WHATSAPP_TOKEN y META_WHATSAPP_PHONE_ID en Render.",
        env.WHATSAPP_VERIFY_TOKEN
          ? "OK: verify token presente."
          : "FALTA: configurar WHATSAPP_VERIFY_TOKEN en Render (y el mismo valor en Meta).",
        String(db.whatsapp_conversations).startsWith("ok")
          ? "OK: tablas whatsapp_* existen."
          : "FALTA: correr supabase/whatsapp_inbox.sql en Supabase.",
        "Verificar en Meta que el webhook esté suscrito al campo 'messages'.",
      ],
    },
  });
}
