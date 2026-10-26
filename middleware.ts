import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, JWTPayload } from "jose";

export interface UserJWTPayload extends JWTPayload {
  userId: string;
  email: string;
  role?: string;
  name?: string;
  access?: {
    dashboard: string;
    categories?: string;
    series: string;
    chapters: string;
    qna: string;
    banners: string;
  };
}

export async function verifyJWT(token: string): Promise<UserJWTPayload | null> {
  try {
    const rawSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "readapt_super_secret_jwt_key_12345";
    const secret = new TextEncoder().encode(rawSecret.trim());
    const { payload } = await jwtVerify(token, secret);
    
    return {
      userId: (payload as any).userId || (payload as any)._id || "user",
      email: (payload as any).email,
      role: (payload as any).role,
      name: (payload as any).name,
      access: (payload as any).access,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ⚡ Public User APIs
  if (
    pathname.startsWith("/api/user/chapter") || pathname.startsWith("/api/chapter") ||
    pathname.startsWith("/api/admin/chapter") || pathname.startsWith("/api/admin/question") ||
    pathname.startsWith("/api/admin/series") || pathname.startsWith("/api/series") || 
    pathname.startsWith("/api/question") || pathname.startsWith("/api/user/question/") ||
    pathname.startsWith("/api/category") || pathname.startsWith("/api/user/category") ||
    pathname.startsWith("/api/user/feed") || pathname.startsWith("/api/user/thought") || pathname.startsWith("/api/user/series/")
  ) {
    return NextResponse.next();
  }

  // ⚡ Admin UI & API Protection
  const isProtectedAdminUI =
    pathname.startsWith("/chapters") || pathname.startsWith("/series") ||
    pathname.startsWith("/questions") || pathname.startsWith("/categories") ||
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isProtectedAdminUI && !pathname.startsWith("/api/admin/auth") && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get("adminToken")?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ success: false, message: "Unauthorized admin" }, { status: 401 });
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const adminPayload = await verifyJWT(token);
    if (!adminPayload || !adminPayload.email) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ success: false, message: "Invalid admin token" }, { status: 401 });
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // ⚡ TEAM MEMBER RBAC LOGIC 
    if (adminPayload.role === "team_member" && adminPayload.access) {
      const { access } = adminPayload;
      const path = pathname.toLowerCase();
      let moduleName = "module";
      let accessLevel = "view"; // default fallback

      if (path.includes("/series")) { moduleName = "series"; accessLevel = access.series; }
      else if (path.includes("/chapter")) { moduleName = "chapters"; accessLevel = access.chapters; }
      else if (path.includes("/question")) { moduleName = "qna"; accessLevel = access.qna; }
      else if (path.includes("/banner")) { moduleName = "banners"; accessLevel = access.banners; }
      else if (path.includes("/categor")) { moduleName = "categories"; accessLevel = access.categories || "restrict"; }

      // 1. API Blocks (If clicking Save/Delete from a View-Only page)
      if (pathname.startsWith("/api/admin/") && request.method !== "GET" && !pathname.startsWith("/api/admin/auth")) {
        if (accessLevel === "restrict") {
          return NextResponse.json({ success: false, errorType: "RBAC", message: `Access Denied: You are restricted from ${moduleName}.` }, { status: 403 });
        }
        if (accessLevel === "view") {
          return NextResponse.json({ success: false, errorType: "RBAC", message: `You only have VIEW access for ${moduleName}. You cannot edit or create.` }, { status: 403 });
        }
      }

      // 2. UI Navigations Blocks
      if (!pathname.startsWith("/api/")) {
        if (accessLevel === "restrict") {
          return NextResponse.rewrite(new URL(`/admin/restricted?reason=restrict&module=${moduleName}`, request.url));
        }
        // Block them from opening "Create" or "Edit" UI pages if they only have view access
        if (accessLevel === "view" && (path.includes("/create") || path.includes("/edit") || path.includes("/update") || path.includes("/add"))) {
          return NextResponse.rewrite(new URL(`/admin/restricted?reason=viewonly&module=${moduleName}`, request.url));
        }
      }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-admin-role", adminPayload.role || "master_admin");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/chapters/:path*", "/series/:path*", "/questions/:path*", "/categories/:path*"],
};