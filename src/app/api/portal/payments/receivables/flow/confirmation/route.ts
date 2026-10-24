import { readCallbackToken } from "@/lib/payments/durable-callbacks";
import { reconcileReceivableToken } from "@/lib/payments/receivable-flow";
export async function POST(req: Request) {
  try {
    await reconcileReceivableToken(await readCallbackToken(req));
    return new Response("ok");
  } catch {
    return new Response("confirmation_pending", { status: 503, headers: { "Retry-After": "60" } });
  }
}
