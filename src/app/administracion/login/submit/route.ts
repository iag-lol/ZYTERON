import { createHash, timingSafeEqual } from "node:crypto";
import { boundedJson, publicRateLimit, intakeFailure } from "@/lib/security/public-intake";
import { NextResponse } from "next/server";
import { adminCookieOptions, createAdminSessionToken } from "@/lib/auth/admin-session";

async function parsePwd(req: Request) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    const body = (await boundedJson(req, 4096)) as { pwd?: unknown };
    return {
      pwd: body?.pwd as string | undefined,
      isJson: true,
    };
  }

  const formData = await req.formData().catch(() => null);
  const raw = formData?.get("pwd");
  return {
    pwd: typeof raw === "string" ? raw : undefined,
    isJson: false,
  };
}

export async function POST(req: Request) {
  try {
    const rate = await publicRateLimit(req, "admin-login", 5);
    if (!rate.allowed)
      return NextResponse.json({ ok: false }, { status: 429, headers: { "retry-after": "60" } });
    if (Number(req.headers.get("content-length")) > 4096)
      return NextResponse.json({ ok: false }, { status: 413 });
    const { pwd, isJson } = await parsePwd(req);
    const pass = process.env.ADMIN_PASSWORD;
    const token =
      typeof pwd === "string" &&
      pwd.length <= 1024 &&
      pass &&
      timingSafeEqual(
        createHash("sha256").update(pwd).digest(),
        createHash("sha256").update(pass).digest(),
      )
        ? await createAdminSessionToken()
        : null;

    if (!token) {
      if (!isJson) {
        const url = new URL("/administracion/login?error=1", req.url);
        return NextResponse.redirect(url, { status: 303 });
      }
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const res = isJson
      ? NextResponse.json({ ok: true })
      : NextResponse.redirect(new URL("/administracion", req.url), { status: 303 });
    res.cookies.set(adminCookieOptions(token));
    return res;
  } catch (error) {
    return intakeFailure(error);
  }
}
