import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Las suscripciones se activan desde tu cotización mensual, con una cuenta verificada y un código enviado a tu correo.",
      redirectUrl: "/clientes/panel/cotizaciones",
    },
    { status: 409 },
  );
}
