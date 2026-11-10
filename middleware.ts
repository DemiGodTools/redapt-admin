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
  if (!token || typeof token !== "string" || token.includes("undefined") || token.includes("null")) {
    return null;
  }
  const rawSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "readapt_super_secret_jwt_key_12345";
  const cleanSecret = rawSecret.replace(/["']/g, "").trim();

  for (const s of [cleanSecret, rawSecret.trim(), "readapt_super_secret_jwt_key_12345"]) {
    try {
      const secret = new TextEncoder().encode(s);
      const { payload } = await jwtVerify(token, secret);
      if (payload) {
        return {
          userId: (payload as any).userId || (payload as any)._id || "user",
          email: ((payload as any).email || (payload as any).user?.email || "").toLowerCase(),
          role: (payload as any).role,
          name: (payload as any).name,
          access: (payload as any).access,
        };
      }
    } catch {}
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ⚡ Public Non-User APIs
  if (
    pathname.startsWith("/api/chapter") ||
    pathname.startsWith("/api/series") || 
    pathname.startsWith("/api/banner") ||
    pathname.startsWith("/api/question") ||
    pathname.startsWith("/api/category")
  ) {
    return NextResponse.next();
  }

  // ⚡ Admin UI & API Protection
  const isProtectedAdminUI =
    pathname.startsWith("/chapters") || pathname.startsWith("/series") ||
    pathname.startsWith("/questions") || pathname.startsWith("/categories") ||
    pathname.startsWith("/banners") ||
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

    // If heading to the restricted page itself, let it render without further restriction checks
    if (pathname === "/admin/restricted" || pathname.startsWith("/admin/restricted")) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-admin-role", adminPayload.role || "master_admin");
      requestHeaders.set("x-admin-name", adminPayload.name || adminPayload.email || "Admin");
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // ⚡ TEAM MEMBER RBAC LOGIC 
    if (adminPayload.role === "team_member" && adminPayload.access) {
      const { access } = adminPayload;
      const path = pathname.toLowerCase();
      let moduleName = "";
      let accessLevel = "view"; // default fallback

      if (path.startsWith("/series") || path.startsWith("/api/admin/series")) {
        moduleName = "series";
        accessLevel = access.series || "restrict";
      } else if (path.startsWith("/chapter") || path.startsWith("/api/admin/chapter")) {
        moduleName = "chapters";
        accessLevel = access.chapters || "restrict";
      } else if (path.startsWith("/question") || path.startsWith("/api/admin/question")) {
        moduleName = "qna";
        accessLevel = access.qna || "restrict";
      } else if (path.startsWith("/banner") || path.startsWith("/api/admin/banner")) {
        moduleName = "banners";
        accessLevel = access.banners || "restrict";
      } else if (path.startsWith("/categor") || path.startsWith("/api/admin/categor")) {
        moduleName = "categories";
        accessLevel = access.categories || "restrict";
      } else if (
        path === "/admin" ||
        path === "/admin/" ||
        path.startsWith("/admin/users") ||
        path.startsWith("/admin/deletions") ||
        path.startsWith("/api/admin/dashboard") ||
        path.startsWith("/api/admin/thought") ||
        path.startsWith("/api/admin/storage") ||
        path.startsWith("/api/admin/activities") ||
        path.startsWith("/api/admin/users") ||
        path.startsWith("/api/admin/deletions")
      ) {
        moduleName = "dashboard";
        accessLevel = access.dashboard || "restrict";
      } else if (path.startsWith("/admin/team") || path.startsWith("/api/admin/team")) {
        moduleName = "team";
        accessLevel = "restrict";
      }

      // 1. API Blocks
      if (pathname.startsWith("/api/admin/") && !pathname.startsWith("/api/admin/auth")) {
        if (accessLevel === "restrict") {
          return NextResponse.json({ success: false, errorType: "RBAC", message: `Access Denied: You are restricted from ${moduleName}.` }, { status: 403 });
        }
        if (accessLevel === "view" && request.method !== "GET") {
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
    requestHeaders.set("x-admin-name", adminPayload.name || adminPayload.email || "Admin");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ⚡ User API Protection & Email Injection
  if (
    pathname.startsWith("/api/user") &&
    !pathname.startsWith("/api/user/auth/login") &&
    !pathname.startsWith("/api/user/payment/confirm")
  ) {
    let userEmail = (
      request.headers.get("x-user-email") ||
      request.headers.get("X-User-Email") ||
      ""
    ).trim().toLowerCase();

    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token && token !== "undefined" && token !== "null") {
        const payload = await verifyJWT(token);
        if (payload?.email) {
          userEmail = payload.email.toLowerCase();
        }
      }
    }

    const requestHeaders = new Headers(request.headers);
    if (userEmail) {
      requestHeaders.set("x-user-email", userEmail);
    }

    const isProtectedUserRoute =
      pathname.startsWith("/api/user/get-self") ||
      pathname.startsWith("/api/user/update") ||
      pathname.startsWith("/api/user/payment/order") ||
      pathname.startsWith("/api/user/series/join") ||
      pathname.startsWith("/api/user/series/exit") ||
      pathname.startsWith("/api/user/chapter/like") ||
      pathname.startsWith("/api/user/chapter/comment") ||
      pathname.startsWith("/api/user/question/comment") ||
      pathname.startsWith("/api/user/question/attempt");

    if (isProtectedUserRoute && !userEmail) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid or missing session" },
        { status: 401 }
      );
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/chapters/:path*",
    "/series/:path*",
    "/questions/:path*",
    "/categories/:path*",
    "/banners/:path*",
    "/api/user/:path*",
  ],
};