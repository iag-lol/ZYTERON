import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  callback,
  openAccess,
  pilotOrigin,
  receipt,
  refresh,
  returnAccess,
  start,
  view,
} from "@/lib/payments/pilot-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookieName = "__Host-zyteron-pilot";
function failure(status = 503) {
  return NextResponse.json(
    {
      error:
        "No pudimos completar esta operacion. Revisa el estado antes de intentarlo nuevamente.",
    },
    { status, headers: { "cache-control": "private, no-store" } },
  );
}
function failureStatus(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "PILOT_SESSION_REQUIRED") return 401;
  if (["PILOT_ACCESS_DENIED", "PILOT_START_DENIED"].includes(code)) return 403;
  if (["PILOT_PAYMENT_NOT_CONFIRMED", "PILOT_ATTEMPT_IN_PROGRESS"].includes(code)) return 409;
  return 503;
}
function attach(response: NextResponse, token: string) {
  response.cookies.set(cookieName, token, {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 1800,
  });
  return response;
}
async function body(request: Request) {
  const stream = request.body?.getReader();
  if (!stream) return "";
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await stream.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2048) {
        await stream.cancel();
        throw new Error("PILOT_BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    stream.releaseLock();
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
}
async function tokenFrom(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded"))
    throw new Error("PILOT_FORM_REQUIRED");
  const values = new URLSearchParams(await body(request));
  const token = values.get("token");
  if (values.size !== 1 || !token || !/^[A-Za-z0-9_-]{12,200}$/.test(token))
    throw new Error("PILOT_TOKEN_INVALID");
  return token;
}
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  try {
    if (action === "confirmation") {
      await callback(await tokenFrom(request));
      return new NextResponse("ok", { headers: { "cache-control": "no-store" } });
    }
    if (action === "return") {
      const token = await returnAccess(await tokenFrom(request));
      return attach(
        new NextResponse(null, {
          status: 303,
          headers: { location: "/clientes/pagos/prueba", "cache-control": "no-store" },
        }),
        token,
      );
    }
    if (request.headers.get("origin") !== pilotOrigin()) return failure(403);
    const value = JSON.parse((await body(request)) || "{}") as Record<string, unknown>;
    if (!value || Array.isArray(value) || typeof value !== "object") return failure(400);
    if (action === "open") {
      if (Object.keys(value).some((k) => k !== "access") || typeof value.access !== "string")
        return failure(400);
      return attach(
        NextResponse.json({ opened: true }, { headers: { "cache-control": "no-store" } }),
        await openAccess(value.access),
      );
    }
    const cookie = (await cookies()).get(cookieName)?.value;
    if (!cookie) return failure(401);
    if (
      action === "start" &&
      Object.keys(value).every((k) => k === "idempotencyKey") &&
      typeof value.idempotencyKey === "string"
    )
      return NextResponse.json(await start(cookie, value.idempotencyKey), {
        headers: { "cache-control": "no-store" },
      });
    if (action === "refresh" && Object.keys(value).length === 0)
      return NextResponse.json(await refresh(cookie), { headers: { "cache-control": "no-store" } });
    return failure(404);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      const code = error instanceof Error && /^PILOT_[A-Z_]+$/.test(error.message)
        ? error.message : "PILOT_INTERNAL_FAILURE";
      console.error("[sandbox payment]", code);
    }
    if (action === "return") {
      const response = new NextResponse(null, {
        status: 303,
        headers: { location: "/clientes/pagos/prueba", "cache-control": "no-store" },
      });
      response.cookies.set(cookieName, "", {
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }
    return failure(failureStatus(error));
  }
}
export async function GET(_request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!["status", "receipt"].includes(action)) return failure(404);
  try {
    const cookie = (await cookies()).get(cookieName)?.value;
    if (!cookie) return failure(401);
    if (action === "status")
      return NextResponse.json(await view(cookie), {
        headers: { "cache-control": "private, no-store" },
      });
    const pdf = await receipt(cookie);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "cache-control": "private, no-store",
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="comprobante-zyteron-PRUEBA.pdf"',
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      const code = error instanceof Error && /^PILOT_[A-Z_]+$/.test(error.message)
        ? error.message : "PILOT_INTERNAL_FAILURE";
      console.error("[sandbox payment]", code);
    }
    return failure(failureStatus(error));
  }
}
