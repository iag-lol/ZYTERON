import { NextResponse } from "next/server";
import { readCallbackToken, enqueueCallback } from "@/lib/payments/durable-callbacks";
import { getCheckoutOrder } from "@/lib/checkout/orders";
import { getFlowPaymentStatus } from "@/lib/payments/flow";
import { samePaymentToken, verifyPaymentObservation } from "@/lib/payments/verified-payment";
import { createCheckoutGrant, CHECKOUT_GRANT_COOKIE } from "@/lib/payments/checkout-grant";
import { digest } from "@/lib/payments/pilot-protocol";
async function finish(token: string) {
  const response = NextResponse.redirect("https://www.zyteron.cl/checkout/finalizado", 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  try {
    if (!token) throw new Error("UNKNOWN_PAYMENT");
    const observed = await getFlowPaymentStatus(token);
    const order = await getCheckoutOrder(observed.commerceOrder);
    if (!order || order.storage !== "db" || !samePaymentToken(token, order.meta.flow.token))
      throw new Error("UNKNOWN_PAYMENT");
    verifyPaymentObservation(
      observed,
      {
        id: order.id,
        amount: order.meta.total,
        flowOrder: order.meta.flow.flowOrder,
        token: order.meta.flow.token,
      },
      token,
    );
    await enqueueCallback("CHECKOUT", token);
    response.cookies.set(CHECKOUT_GRANT_COOKIE, createCheckoutGrant(order.id, digest(token)), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 1800,
    });
  } catch {
    response.cookies.set(CHECKOUT_GRANT_COOKIE, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
export async function POST(req: Request) {
  try {
    return await finish(await readCallbackToken(req));
  } catch {
    return finish("");
  }
}
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  return /^[A-Za-z0-9_-]{12,200}$/.test(token) ? finish(token) : finish("");
}
