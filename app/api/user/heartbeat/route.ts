import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { verifyJWT } from "@/middleware";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let email = req.headers.get("x-user-email");
    if (!email) {
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        const payload = await verifyJWT(token);
        if (payload?.email) email = payload.email;
      }
    }

    if (!email) {
      const body = await req.json().catch(() => ({}));
      if (body?.email) email = String(body.email).trim().toLowerCase();
    }

    if (!email) {
      return NextResponse.json({ success: false, message: "Missing session" }, { status: 401 });
    }

    await connectMongo();
    await User.collection.updateOne(
      { email: email.trim().toLowerCase() },
      {
        $set: {
          isLoggedIn: true,
          lastActiveAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch {
    return NextResponse.json({ success: true });
  }
}

