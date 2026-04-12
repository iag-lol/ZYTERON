import { NextResponse } from "next/server";
import { COOKIE_KEY, ADMIN_FALLBACK } from "@/lib/auth/admin";

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
    value: pass,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
