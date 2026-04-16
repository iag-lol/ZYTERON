import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_VALUE } from "./src/lib/auth/admin-constants";

const ADMIN_COOKIE = "zyteron_admin_token";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminArea = pathname.startsWith("/admin");
  const isLogin = pathname.startsWith("/admin/login");
  const isLogout = pathname.startsWith("/admin/logout");

  if (isAdminArea && !isLogin && !isLogout) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!token || token !== ADMIN_SESSION_VALUE) {
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
