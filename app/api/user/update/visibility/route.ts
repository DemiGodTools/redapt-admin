import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let userEmail: string | null = req.headers.get("x-user-email");
    if (!userEmail) {
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
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: "Unauthorized (no user email)" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawVisibility = body?.visibility;
    const visibility = rawVisibility === "Private" ? "Private" : "Public";

    await connectMongo();

    const user = await User.findOneAndUpdate(
      { email: userEmail },
      { $set: { visibility } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Profile visibility set to ${visibility}`,
      visibility,
      user,
    });
  } catch (error: any) {
    console.error("Update visibility error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update visibility" },
      { status: 500 }
    );
  }
}

