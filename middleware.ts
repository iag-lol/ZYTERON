import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ADMIN_SESSION_VALUE } from "./src/lib/auth/admin-constants";

const ADMIN_COOKIE = "zyteron_admin_token";
const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login" && req.method === "POST") {
    const submitUrl = req.nextUrl.clone();
    submitUrl.pathname = "/admin/login/submit";
    submitUrl.search = "";
    return NextResponse.redirect(submitUrl, 307);
  }

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

  const isPortalAuthApi = pathname.startsWith("/api/portal/auth");
  const isPortalApi = pathname.startsWith("/api/portal");
  const isPortalPrivatePage =
    pathname.startsWith("/portal-clientes/panel") || pathname.startsWith("/portal-clientes/admin");

  if (!isPortalAuthApi && (isPortalApi || isPortalPrivatePage)) {
    return protectPortalRequest(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal-clientes/:path*", "/api/portal/:path*"],
};

async function protectPortalRequest(req: NextRequest) {
  const token = await getToken({ req, secret: AUTH_SECRET });
  if (!token?.sub) {
    if (req.nextUrl.pathname.startsWith("/api/portal")) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/portal-clientes/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!token.emailVerifiedAt || token.accountStatus !== "ACTIVE") {
    if (req.nextUrl.pathname.startsWith("/api/portal")) {
      return NextResponse.json({ error: "Cuenta no habilitada." }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = token.emailVerifiedAt ? "/portal-clientes/login" : "/portal-clientes/verificar";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
