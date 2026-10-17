import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { UserJWTPayload } from "@/types/jwt";

export async function verifyJWT(token: string): Promise<UserJWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify<UserJWTPayload>(token, secret);
    if (!payload.userId || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ⚡ Public read & Chapter APIs — inpar 401 block nahi aayega
  if (
    pathname.startsWith("/api/user/chapter") ||
    pathname.startsWith("/api/chapter") ||
    pathname.startsWith("/api/admin/chapter") ||
    pathname.startsWith("/api/admin/question") ||
    pathname.startsWith("/api/question") ||
    pathname.startsWith("/api/category")
  ) {
    return NextResponse.next();
  }

  // Admin Protection
  if (
    (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
    !pathname.startsWith("/api/admin/auth") &&
    !pathname.startsWith("/admin/login")
  ) {
    const token = request.cookies.get("adminToken")?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, message: "Unauthorized admin" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const adminPayload = await verifyJWT(token);
    if (!adminPayload) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, message: "Invalid admin token" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // User Protection
  if (
    pathname.startsWith("/api/user") &&
    !pathname.startsWith("/api/user/auth/login") &&
    !pathname.startsWith("/api/user/payment/confirm") &&
    !pathname.startsWith("/api/user/chapter")
  ) {
    let userEmail = "";

    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const payload = await verifyJWT(token);
      if (payload) {
        userEmail = payload.email;
      }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-email", userEmail);

    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: "Unauthorized by middleware" },
        { status: 401 }
      );
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/user/:path*",
    "/api/user/:path*",
  ],
};