import { NextResponse } from "next/server";
import { adminCookieOptions, createAdminSessionToken } from "@/lib/auth/admin-session";

async function parsePwd(req: Request) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
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
  const { pwd, isJson } = await parsePwd(req);
  const pass = process.env.ADMIN_PASSWORD;
  const token = pwd && pass && pwd === pass ? await createAdminSessionToken() : null;

  if (!token) {
    if (!isJson) {
      const url = new URL("/admin/login?error=1", req.url);
      return NextResponse.redirect(url, { status: 303 });
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = isJson
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL("/admin", req.url), { status: 303 });
  res.cookies.set(adminCookieOptions(token));
  return res;
}
