import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { logActivity } from "@/lib/activityLogger";
import { verifyJWT } from "@/middleware";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectMongo();

    let email = req.headers.get("x-user-email");
    if (!email) {
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        const payload = await verifyJWT(token);
        if (payload?.email) {
          email = payload.email;
        }
      }
    }

    const body = await req.json().catch(() => ({}));
    if (!email && body?.email) {
      email = String(body.email).trim().toLowerCase();
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const user = await User.findOne({ email: cleanEmail });
      if (user) {
        await User.collection.updateOne(
          { _id: user._id },
          {
            $set: {
              isLoggedIn: false,
              lastLogoutAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );

        logActivity({
          action: "USER_LOGOUT",
          category: "auth",
          title: user.name ? `${user.name} (${user.email})` : user.email,
          description: "User logged out of mobile app",
          performedBy: user.name || user.email,
          performedByRole: "user",
          metadata: { userId: user._id.toString() },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: true, message: "Session ended" },
      { status: 200 }
    );
  }
}

