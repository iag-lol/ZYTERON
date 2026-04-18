import { NextResponse } from "next/server";
import { findOrCreateClientByEmail, updateRows } from "@/lib/admin/repository";

type Body = {
  name?: string;
  email?: string;
  company?: string;
  contactName?: string;
  phone?: string;
  rut?: string;
  address?: string;
  city?: string;
  industry?: string;
  tier?: string;
  notes?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body.name || !body.email) {
      return NextResponse.json({ error: "Nombre y email son obligatorios." }, { status: 400 });
    }

    const id = await findOrCreateClientByEmail({
      name: body.name,
      email: body.email,
      company: body.company || null,
      phone: body.phone || null,
      address: body.address || null,
      city: body.city || null,
      rut: body.rut || null,
      contactName: body.contactName || body.name,
    });

    await updateRows(
      "User",
      {
        industry: body.industry || null,
        tier: body.tier || "Basic",
        notes: body.notes || null,
        company: body.company || null,
        phone: body.phone || null,
        address: body.address || null,
        city: body.city || null,
        rut: body.rut || null,
        contactName: body.contactName || body.name,
        updatedAt: new Date().toISOString(),
      },
      { id },
    );

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar el cliente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
