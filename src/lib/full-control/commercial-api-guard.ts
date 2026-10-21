import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { isAllowedMutationOrigin, configuredRequestOrigins } from "@/lib/security/request-origin";
export async function commercialAdmin(request: Request) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return { error: auth.error };
  if (
    request.method !== "GET" &&
    !isAllowedMutationOrigin({
      requestOrigin: new URL(request.url).origin,
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      secFetchSite: request.headers.get("sec-fetch-site"),
      allowedOrigins: configuredRequestOrigins(),
    })
  )
    return { error: NextResponse.json({ error: "Origen no autorizado." }, { status: 403 }) };
  return { actorId: auth.legacy ? null : auth.session.user.id };
}
export function commercialError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    CALENDAR_STALE: "El calendario cambió. Cierra y vuelve a abrir el panel antes de guardar.",
    MONTHLY_PERIOD_EXISTS:
      "Ese mes ya tiene un cobro emitido. Elige un mes posterior; los cobros emitidos conservan su vencimiento.",
    QUOTE_STALE: "La cotización cambió. Cierra y vuelve a abrir el editor antes de guardar.",
    QUOTE_EDIT_LOCKED:
      "Esta propuesta tiene documentos o compromisos. Usa Nueva versión o Duplicar para modificarla.",
    QUOTE_NOT_FOUND: "Cotización no encontrada.",
    QUOTE_OWNER_LOCKED:
      "La cotización ya pertenece a otra cuenta. Revisa la vinculación del cliente.",
    QUOTE_EMAIL_MISMATCH:
      "El correo de la cotización debe coincidir con la cuenta del cliente seleccionado.",
    CLIENT_PORTAL_LINK_REQUIRED:
      "Configura primero la cuenta de portal desde la ficha del cliente.",
    LEAD_NOT_FOUND: "Lead no encontrado.",
    LEAD_QUALIFY_REQUIRED: "Califica el lead antes de preparar su cotización.",
    MONTHLY_FLOW_MANAGED:
      "Flow ya gestiona esta suscripción. Su calendario se actualiza desde los cobros verificados.",
    MONTHLY_NOT_ACCEPTED:
      "La propuesta debe ser mensual, estar aceptada y tener cliente vinculado.",
    MONTHLY_PLAN_LOCKED:
      "El calendario ya está creado. Puedes pausarlo o reactivarlo; los importes acordados se conservan.",
    MONTHLY_CALENDAR_EXISTS:
      "Esta cotización ya tiene un calendario de Finanzas. Adminístralo desde Pagos.",
    MONTHLY_START_INVALID:
      "Elige una fecha entre hoy y dos años, que coincida con el día de cobro mensual.",
    QUOTE_TOTAL_LIMIT: "El total excede el límite permitido para esta cotización.",
  };
  return NextResponse.json(
    { error: messages[code] || "No se pudo guardar. Revisa los datos y vuelve a intentarlo." },
    { status: code.endsWith("NOT_FOUND") ? 404 : messages[code] ? 409 : 400 },
  );
}
