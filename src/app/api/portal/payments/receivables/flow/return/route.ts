import { NextResponse } from "next/server";
import { readCallbackToken } from "@/lib/payments/durable-callbacks";
import { reconcileReceivableToken } from "@/lib/payments/receivable-flow";
async function finish(token: string) {
  if (token)
    try {
      await reconcileReceivableToken(token);
    } catch {}
  return NextResponse.redirect("https://www.zyteron.cl/clientes/panel/pagos", 303);
}
export async function POST(req: Request) {
  try {
    return finish(await readCallbackToken(req));
  } catch {
    return finish("");
  }
}
export async function GET() {
  return finish("");
}
