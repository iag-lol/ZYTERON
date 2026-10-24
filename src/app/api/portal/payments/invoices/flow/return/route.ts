import { NextResponse } from "next/server";
import { readCallbackToken } from "@/lib/payments/durable-callbacks";
export async function POST(req: Request) {
  try {
    const token = await readCallbackToken(req),
      port = process.env.CONTROL_INTERNAL_PORT || "4010";
    if (/^\d{4,5}$/.test(port))
      await fetch(`http://127.0.0.1:${port}/api/public/flow/return`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(12000),
      });
  } catch {}
  return NextResponse.redirect("https://www.zyteron.cl/clientes/panel/pagos", 303);
}
export async function GET() {
  return NextResponse.redirect("https://www.zyteron.cl/clientes/panel/pagos", 303);
}
