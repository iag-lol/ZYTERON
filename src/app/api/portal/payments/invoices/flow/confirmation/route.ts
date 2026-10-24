import { readCallbackToken } from "@/lib/payments/durable-callbacks";
export async function POST(req: Request) {
  try {
    const token = await readCallbackToken(req),
      port = process.env.CONTROL_INTERNAL_PORT || "4010";
    if (!/^\d{4,5}$/.test(port)) throw Error("PAYMENT_CALLBACK_UNAVAILABLE");
    const response = await fetch(`http://127.0.0.1:${port}/api/webhooks/payments/flow`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw Error("PAYMENT_CALLBACK_UNAVAILABLE");
    return new Response("ok");
  } catch {
    return new Response("confirmation_pending", { status: 503, headers: { "Retry-After": "60" } });
  }
}
