import { NextRequest, NextResponse } from "next/server";
import { verifyJwtEdge } from "./lib/auth/edgeJwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Check if route is protected
  const isApiAdmin = pathname.startsWith("/api/admin");
  const isApiEmployee = pathname.startsWith("/api/employee");
  const isApiChat = pathname.startsWith("/api/chat");
  const isApiFiles = pathname.startsWith("/api/files");

  const isAdminPage = pathname.startsWith("/admin");
  const isEmployeePage = pathname.startsWith("/employee");
  const isChatPage = pathname.startsWith("/chat");
  const isDepartmentPage = pathname === "/department" || pathname.startsWith("/department/dashboard");

  const requiresAuth =
    isApiAdmin ||
    isApiEmployee ||
    isApiChat ||
    isApiFiles ||
    isAdminPage ||
    isEmployeePage ||
    isChatPage ||
    isDepartmentPage;

  let session: { role: string; userId: string; isBlocked?: boolean } | null = null;
  const token = req.cookies.get("typnex_auth_token")?.value;

  if (token) {
    session = await verifyJwtEdge(token);
  }

  // If path requires auth and session is invalid
  if (requiresAuth && !session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    if (isAdminPage || isDepartmentPage || isEmployeePage) {
      const loginUrl = new URL("/department/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Blocked account protection
  if (session?.isBlocked) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Account is blocked." }, { status: 403 });
    }
    const logoutUrl = new URL("/login?error=blocked", req.url);
    const res = NextResponse.redirect(logoutUrl);
    res.cookies.delete("typnex_auth_token");
    return res;
  }

  // Admin route authorization
  if ((isAdminPage || isApiAdmin) && session?.role !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/department/login?error=unauthorized", req.url));
  }

  // Employee route authorization (allow ADMIN and EMPLOYEE)
  if ((isEmployeePage || isApiEmployee) && session?.role !== "EMPLOYEE" && session?.role !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden: Employee access required." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/department/login?error=unauthorized", req.url));
  }

  // Standard response with Security Headers
  const response = NextResponse.next();

  // Phase 22: Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), interest-cohort=()"
  );

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: data:",
    "connect-src 'self' https:",
    "frame-ancestors 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)",
  ],
};
