import { createClient } from "@supabase/supabase-js";
import { roles } from "@zyteron/contracts";
import { NextResponse } from "next/server";

export async function handleStaffControlRequest(
  request: Request,
  segments: string[],
  body: Buffer,
  dependencies: {
    authClient?: Pick<ReturnType<typeof createClient>, "auth" | "from">;
    forward?: typeof fetch;
  } = {},
) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return NextResponse.json(
      { message: "El acceso del equipo no está configurado." },
      { status: 503 },
    );
  if (
    !token ||
    segments[0] !== "api" ||
    segments.some(
      (value) => !value || value === "." || value === ".." || /[\\\/%?#\u0000-\u001f]/.test(value),
    )
  )
    return NextResponse.json({ message: "Solicitud inválida." }, { status: 400 });
  const client =
    dependencies.authClient ??
    createClient(new URL(url).origin, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  const { data, error } = await client.auth.getUser(token);
  const user = data.user;
  if (error || !user)
    return NextResponse.json({ message: "Sesión inválida. Ingresa nuevamente." }, { status: 401 });
  const role = user.app_metadata.role;
  if (
    !roles.includes(role) ||
    role === "PORTAL_CLIENT" ||
    (user.banned_until && new Date(user.banned_until) > new Date())
  )
    return NextResponse.json({ message: "La cuenta no tiene acceso al equipo." }, { status: 403 });
  if(role==="EJECUTIVA_VENTAS"&&segments[1]!=="sales-workspace")return NextResponse.json({message:"Tu cuenta tiene acceso sólo a su espacio comercial y cartera propia."},{status:403});
  const claims = await client.auth.getClaims(token);
  if (claims.error || claims.data?.claims.app_metadata?.role !== role)
    return NextResponse.json(
      { message: "Los permisos de la cuenta cambiaron. Cierra sesión e ingresa nuevamente." },
      { status: 401 },
    );
  const identity = await client
    .from("control_user_login_ruts")
    .select("rut")
    .eq("user_id", user.id)
    .maybeSingle();
  if (identity.error)
    return NextResponse.json(
      { message: "No fue posible validar la identidad del equipo." },
      { status: 503 },
    );
  if (!(identity.data as { rut?: string } | null)?.rut)
    return NextResponse.json(
      { message: "La cuenta requiere registrar su RUT en Seguridad > Usuarios." },
      { status: 403 },
    );
  const target = "/" + segments.map(encodeURIComponent).join("/") + new URL(request.url).search;
  const headers = new Headers({
    authorization: `Bearer ${token}`,
    "content-type": request.headers.get("content-type") || "application/json",
  });
  const idem = request.headers.get("idempotency-key");
  if (idem && /^[A-Za-z0-9._:-]{8,128}$/.test(idem)) headers.set("idempotency-key", idem);
  try {
    // Staff requests keep their verified Supabase identity and never enter administrative legacy adapters.
    const result = await (dependencies.forward ?? fetch)(
      `http://127.0.0.1:${process.env.CONTROL_INTERNAL_PORT || "4010"}${target}`,
      {
        method: request.method,
        headers,
        body: body.length ? new Uint8Array(body) : undefined,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(45_000),
      },
    );
    const out = new Headers({
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    });
    for (const key of ["content-type", "content-disposition"]) {
      const value = result.headers.get(key);
      if (value) out.set(key, value);
    }
    return new NextResponse(await result.arrayBuffer(), { status: result.status, headers: out });
  } catch {
    return NextResponse.json(
      { message: "No fue posible conectar con Zyteron Control." },
      { status: 503 },
    );
  }
}
