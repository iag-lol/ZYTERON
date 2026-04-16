import { NextResponse } from "next/server";
import { ADMIN_FALLBACK, ADMIN_SESSION_VALUE, COOKIE_KEY } from "@/lib/auth/admin-constants";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const pwd = body?.pwd as string | undefined;
  const pass = process.env.ADMIN_PASSWORD || ADMIN_FALLBACK;
  if (!pwd || pwd !== pass) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_KEY,
    value: ADMIN_SESSION_VALUE,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
