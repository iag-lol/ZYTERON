import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_FALLBACK } from "./src/lib/auth/admin";

const ADMIN_COOKIE = "zyteron_admin_token";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminArea = pathname.startsWith("/admin");
  const isLogin = pathname.startsWith("/admin/login");
  const isLogout = pathname.startsWith("/admin/logout");

  if (isAdminArea && !isLogin && !isLogout) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const pass = process.env.ADMIN_PASSWORD || ADMIN_FALLBACK;
    if (!token || token !== pass) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
