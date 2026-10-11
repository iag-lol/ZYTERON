import { NextResponse } from "next/server";
import { readCallbackToken } from "@/lib/payments/durable-callbacks";
import { activateQuoteFlowSubscriptionFromToken } from "@/lib/payments/quote-payment-workflow";
async function finish(req: Request, token: string) {
  const quoteId = new URL(req.url).searchParams.get("quoteId") || "";
  if (token && quoteId.length <= 100)
    try {
      await activateQuoteFlowSubscriptionFromToken({ quoteId, token, req });
    } catch {
      /* Registration alone never marks a payment or sale. */
    }
  return NextResponse.redirect("https://www.zyteron.cl/clientes/panel/pagos", 303);
}
export async function POST(req: Request) {
  try {
    return finish(req, await readCallbackToken(req));
  } catch {
    return finish(req, "");
  }
}
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  return finish(req, /^[A-Za-z0-9_-]{12,200}$/.test(token) ? token : "");
}
