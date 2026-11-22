import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { teamAuthenticate } from "@/lib/auth/team-auth";
import { boundedJson, publicRateLimit, intakeFailure } from "@/lib/security/public-intake";
import { configuredRequestOrigins, isAllowedMutationOrigin } from "@/lib/security/request-origin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (
    !isAllowedMutationOrigin({
      requestOrigin: origin,
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      secFetchSite: request.headers.get("sec-fetch-site"),
      allowedOrigins: configuredRequestOrigins(),
    })
  )
    return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
  try {
    const rate = await publicRateLimit(request, "control-rut-login", 5);
    if (!rate.allowed)
      return NextResponse.json(
        { error: "Espera un minuto antes de volver a intentar." },
        { status: 429, headers: { "retry-after": "60", "cache-control": "no-store" } },
      );
    const input = await boundedJson(request, 4096);
    const url = process.env.SUPABASE_URL,
      key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      return NextResponse.json(
        { error: "El acceso del equipo no está disponible en este momento." },
        { status: 503 },
      );
    const client = createClient(new URL(url).origin, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await teamAuthenticate(input, {
      async lookupRut(rut) {
        const { data, error } = await client
          .from("control_user_login_ruts")
          .select("user_id")
          .eq("rut", rut)
          .maybeSingle();
        if (error) throw error;
        return data?.user_id ?? null;
      },
      async user(id) {
        const { data, error } = await client.auth.admin.getUserById(id);
        return error ? null : data.user;
      },
      async signIn(email, password) {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        return error || !data.session
          ? null
          : {
              user: data.session.user,
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            };
      },
      async recover(email) {
        const redirectTo = new URL(
          "/equipo",
          process.env.WEB_ORIGIN || process.env.NEXTAUTH_URL || "https://zyteron.cl",
        ).toString();
        await client.auth.resetPasswordForEmail(email, { redirectTo });
      },
    });
    return NextResponse.json(result.body, {
      status: result.status,
      headers: { "cache-control": "private, no-store", "referrer-policy": "no-referrer" },
    });
  } catch (error) {
    return intakeFailure(error);
  }
}
