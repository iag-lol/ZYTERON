import { NextResponse } from "next/server";
import { AccountStatus } from "@prisma/client";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { logPortalAdminAction } from "@/lib/portal/audit";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  firstName: z.string().trim().min(2).max(80).optional(),
  lastName: z.string().trim().min(2).max(80).optional(),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  accountStatus: z.nativeEnum(AccountStatus).optional(),
});

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: Context) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const current = await prisma.user.findUnique({
      where: { id },
      select: { firstName: true, lastName: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    const firstName = parsed.data.firstName ?? current.firstName ?? "";
    const lastName = parsed.data.lastName ?? current.lastName ?? "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        name: fullName || undefined,
        company: parsed.data.company === "" ? null : parsed.data.company,
        phone: parsed.data.phone === "" ? null : parsed.data.phone,
        notes: parsed.data.notes === "" ? null : parsed.data.notes,
        accountStatus: parsed.data.accountStatus,
        deactivatedAt:
          parsed.data.accountStatus === AccountStatus.DISABLED
            ? new Date()
            : parsed.data.accountStatus === AccountStatus.ACTIVE
              ? null
              : undefined,
      },
      select: { id: true },
    });

    const actorId = auth.legacy ? null : auth.session.user.id;
    await logPortalAdminAction({
      actorId,
      targetUserId: updated.id,
      action: "ADMIN_CLIENT_UPDATE",
      entityType: "User",
      entityId: updated.id,
      details: parsed.data,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el cliente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Context) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    if (user.role === "SUPERADMIN" || user.id === auth.session?.user?.id) {
      return NextResponse.json({ error: "No puedes eliminar este usuario." }, { status: 403 });
    }

    // Unlink CRM records so we don't lose financial/project history
    await prisma.$transaction([
      prisma.quote.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.lead.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.visit.updateMany({ where: { clientId: id }, data: { clientId: null } }),
      prisma.sale.updateMany({ where: { clientId: id }, data: { clientId: null } }),
      prisma.project.updateMany({ where: { clientId: id }, data: { clientId: null } }),
      prisma.workOrder.updateMany({ where: { clientId: id }, data: { clientId: null } }),
      prisma.clientRequest.updateMany({ where: { clientId: id }, data: { clientId: null } }),
      prisma.taxDocument.updateMany({ where: { clientId: id }, data: { clientId: null } }),
      prisma.user.delete({ where: { id } }),
    ]);

    const actorId = auth.legacy ? null : auth.session?.user?.id;
    if (actorId) {
      await logPortalAdminAction({
        actorId,
        targetUserId: null, // User is deleted
        action: "ADMIN_CLIENT_DELETED",
        entityType: "User",
        entityId: id,
        details: { name: user.name },
      }).catch(console.error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el cliente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

