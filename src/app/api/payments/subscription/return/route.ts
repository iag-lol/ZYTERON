import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.redirect("https://www.zyteron.cl/clientes/panel/cotizaciones", 303);
}
export const POST = GET;
