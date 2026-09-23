import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "./src/lib/auth/admin-session";
import {
  configuredRequestOrigins,
  isAllowedMutationOrigin,
  isFlowExternalRoute,
  isUnsafeHttpMethod,
} from "./src/lib/security/request-origin";

const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isExternalFlowRequest = isFlowExternalRoute(pathname);

  const isProtectedMutationScope =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/portal");

  if (
    !isExternalFlowRequest &&
    isProtectedMutationScope &&
    isUnsafeHttpMethod(req.method) &&
    !isAllowedMutationOrigin({
      requestOrigin: req.nextUrl.origin,
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
      secFetchSite: req.headers.get("sec-fetch-site"),
      allowedOrigins: configuredRequestOrigins(),
      hasBearerAuthorization: /^Bearer\s+\S+/i.test(req.headers.get("authorization") || ""),
    })
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
    }
    return new NextResponse("Origen no autorizado.", { status: 403 });
  }

  // Flow confirma pagos desde infraestructura externa. Estas rutas validan el
  // token recibido directamente contra Flow y no dependen de una sesión web.
  if (isExternalFlowRequest) {
    return NextResponse.next();
  }

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
    if (!(await verifyAdminSessionToken(token))) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const isPortalAuthApi = pathname.startsWith("/api/portal/auth");
  const isPortalAdminApi =
    pathname.startsWith("/api/portal/admin") || pathname === "/api/portal/diag";
  const isAdminApi = pathname.startsWith("/api/admin");
  const isPortalApi = pathname.startsWith("/api/portal");
  const isPortalDocumentDownload =
    req.method === "GET" && pathname.startsWith("/api/portal/documents/");
  const isPortalPrivatePage =
    pathname.startsWith("/portal-clientes/panel") || pathname.startsWith("/portal-clientes/admin");

  if (isAdminApi || isPortalAdminApi) {
    return protectAdminApiRequest(req);
  }

  if (isPortalDocumentDownload) {
    const legacyToken = req.cookies.get(ADMIN_COOKIE)?.value;
    if (await verifyAdminSessionToken(legacyToken)) return NextResponse.next();
  }

  if (!isPortalAuthApi && !isPortalAdminApi && (isPortalApi || isPortalPrivatePage)) {
    return protectPortalRequest(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal-clientes/:path*", "/api/admin/:path*", "/api/portal/:path*"],
};

async function readPortalToken(req: NextRequest) {
  try {
    return await getToken({ req, secret: AUTH_SECRET });
  } catch (error) {
    console.error("[middleware/auth] No fue posible validar el token de sesión.", error);
    return null;
  }
}

async function protectAdminApiRequest(req: NextRequest) {
  const legacyToken = req.cookies.get(ADMIN_COOKIE)?.value;
  if (await verifyAdminSessionToken(legacyToken)) {
    return NextResponse.next();
  }

  const token = await readPortalToken(req);
  if (!token?.sub) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (token.role !== "ADMIN" && token.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  if (!token.emailVerifiedAt || token.accountStatus !== "ACTIVE") {
    return NextResponse.json({ error: "Cuenta administrativa no habilitada." }, { status: 403 });
  }

  return NextResponse.next();
}

async function protectPortalRequest(req: NextRequest) {
  const token = await readPortalToken(req);
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
