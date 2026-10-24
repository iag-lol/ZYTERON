import { NextResponse } from "next/server";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
export async function POST(request: Request) {
  const auth = await commercialAdmin(request);
  if (auth.error) return auth.error;
  return NextResponse.json({ ok: false, error: "Abre Leads y selecciona Convertir en cliente para ingresar RUT y contraseña." }, { status: 409 });
}
