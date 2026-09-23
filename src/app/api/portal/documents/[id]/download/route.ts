import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { prisma } from "@/lib/prisma";
import { logPortalAdminAction } from "@/lib/portal/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CLIENT_FILES_BUCKET = "client-files";
const SIGNED_URL_TTL_SECONDS = 90;

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const session = await getServerSession(portalAuthOptions);
  const hasActivePortalSession = Boolean(
    session?.user?.id && session.user.accountStatus === "ACTIVE" && session.user.emailVerifiedAt,
  );
  let actorId: string | null = hasActivePortalSession ? session?.user?.id || null : null;
  let authenticatedUserId = actorId;
  let isAdmin =
    hasActivePortalSession &&
    (session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN");

  if (!hasActivePortalSession) {
    const admin = await requirePortalAdminApiSession();
    if (admin.error) return admin.error;
    isAdmin = true;
    actorId = admin.legacy ? null : admin.session.user.id;
    authenticatedUserId = actorId;
  }

  const { id } = await params;
  const document = await prisma.clientDocument.findUnique({
    where: { id },
    select: { id: true, userId: true, storagePath: true, fileUrl: true },
  });
  if (!document) return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });

  if (!isAdmin && document.userId !== authenticatedUserId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let destination = "";
  if (document.storagePath) {
    const { supabase } = createSupabaseServerClient();
    const signed = await supabase.storage
      .from(CLIENT_FILES_BUCKET)
      .createSignedUrl(document.storagePath, SIGNED_URL_TTL_SECONDS, { download: true });
    if (signed.error || !signed.data.signedUrl) {
      return NextResponse.json({ error: "No se pudo autorizar la descarga." }, { status: 502 });
    }
    destination = signed.data.signedUrl;
  } else {
    try {
      const legacyUrl = new URL(document.fileUrl);
      if (legacyUrl.protocol !== "https:") throw new Error("unsafe protocol");
      destination = legacyUrl.toString();
    } catch {
      return NextResponse.json(
        { error: "El documento no tiene un archivo válido." },
        { status: 410 },
      );
    }
  }

  await logPortalAdminAction({
    actorId,
    targetUserId: document.userId,
    action: "CLIENT_DOCUMENT_DOWNLOAD",
    entityType: "ClientDocument",
    entityId: document.id,
  });

  return NextResponse.redirect(destination, {
    status: 307,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
