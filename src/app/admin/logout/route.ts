import { NextResponse } from "next/server";
import { COOKIE_KEY } from "@/lib/auth/admin-constants";

export function GET(req: Request) {
  const isPrefetch =
    req.headers.get("purpose") === "prefetch" ||
    req.headers.has("next-router-prefetch") ||
    req.headers.has("x-middleware-prefetch");

  if (isPrefetch) {
    return new NextResponse(null, { status: 204 });
  }

  const url = new URL("/admin/login", req.url);
  const res = NextResponse.redirect(url);
  res.cookies.set({
    name: COOKIE_KEY,
    value: "",
    path: "/",
    maxAge: 0,
  });
  return res;
}
