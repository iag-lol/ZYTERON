import { NextResponse } from "next/server";
import { readCallbackToken, enqueueCallback } from "@/lib/payments/durable-callbacks";
async function finish(token: string) {
  if (token)
    try {
      await enqueueCallback("QUOTE", token);
    } catch {
      /* Unverified return does not credit money. The provider confirmation retries independently. */
    }
  return NextResponse.redirect("https://www.zyteron.cl/clientes/panel/cotizaciones", 303);
}
export async function POST(req: Request) {
  try {
    return finish(await readCallbackToken(req));
  } catch {
    return finish("");
  }
}
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  return finish(/^[A-Za-z0-9_-]{12,200}$/.test(token) ? token : "");
}
