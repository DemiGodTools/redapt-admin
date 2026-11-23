import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let userEmail: string | null = null;

    // 1. Authenticate via Bearer JWT token first
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token && token !== "undefined" && token !== "null") {
        try {
          const rawSecret =
            process.env.JWT_SECRET ||
            process.env.NEXTAUTH_SECRET ||
            "readapt_super_secret_jwt_key_12345";
          const secret = new TextEncoder().encode(rawSecret.trim());
          const { payload } = await jwtVerify(token, secret);
          userEmail = ((payload as any)?.email || (payload as any)?.user?.email || null) as string | null;
        } catch {}
      }
    }

    // 2. Controlled fallback: only allow x-user-email in development mode
    if (!userEmail && (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_HEADERS === "true")) {
      userEmail = req.headers.get("x-user-email");
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await connectMongo();

    const user = await User.findOneAndUpdate(
      { email: userEmail, isEarlyReader: true },
      { $set: { hasClaimedEarlyBadge: true, updatedAt: new Date() } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User is not eligible for early reader badge" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Early Reader Badge claimed successfully!",
      hasClaimedEarlyBadge: true,
    });
  } catch (err: any) {
    console.error("Claim badge error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to claim early badge" },
      { status: 500 }
    );
  }
}
