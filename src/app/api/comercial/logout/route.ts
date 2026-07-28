import { NextResponse } from "next/server";
import { COMMERCIAL_COOKIE } from "@/lib/commercial/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
  res.cookies.set({ name: COMMERCIAL_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
