import { prisma } from "@/lib/prisma";
import { isValidRut, normalizeRut } from "../../full-control/lib/rut";

/** El alias RUT sólo se registra al vincular explícitamente una cuenta CLIENT al negocio. */
export async function portalLoginEmail(identifier: string) {
  const value = identifier.trim().toLowerCase();
  if (value.length > 160) return null;
  if (value.includes("@")) return value;
  if (!isValidRut(value)) return null;
  const rut = normalizeRut(value);
  const rows = await prisma.$queryRaw<Array<{ email: string }>>`
    SELECT u.email FROM public.zyteron_portal_login_ruts r JOIN public."User" u ON u.id=r.user_id
    JOIN public.zyteron_legacy_client_link l ON l.user_id=u.id
    JOIN public.clients c ON c.id=l.client_id
    WHERE r.rut=${rut} AND u.role='CLIENT' AND c.archived_at IS NULL
      AND upper(regexp_replace(c.rut,'[^0-9kK]','','g'))=replace(r.rut,'-','') LIMIT 1`;
  return rows[0]?.email || null;
}
