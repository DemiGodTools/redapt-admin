import { NextRequest, NextResponse } from "next/server";
import { User } from "@/models/User.model";
import connectMongo from "@/lib/connectMongo";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "readapt",
  "root",
  "support",
  "help",
  "official",
  "moderator",
  "system",
  "api",
  "dev",
  "developer",
  "guest",
  "null",
  "undefined",
]);

export async function POST(req: NextRequest) {
  try {
    let userEmail = req.headers.get("x-user-email");
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
    const newUsername = (body.newUsername || body.username || "").toString().trim().toLowerCase();

    if (!newUsername || newUsername.length < 3 || newUsername.length > 20) {
      return NextResponse.json(
        { success: false, message: "Username must be between 3 and 20 characters" },
        { status: 400 }
      );
    }

    const validPattern = /^[a-zA-Z0-9_]+$/;
    if (!validPattern.test(newUsername)) {
      return NextResponse.json(
        { success: false, message: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    if (RESERVED_USERNAMES.has(newUsername)) {
      return NextResponse.json(
        { success: false, message: "This username is reserved and cannot be used" },
        { status: 400 }
      );
    }

    await connectMongo();

    const existingUser = await User.findOne({
      userId: newUsername,
      email: { $ne: userEmail },
    }).select("_id").lean();

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Username is already taken" },
        { status: 409 }
      );
    }

    const user = await User.findOneAndUpdate(
      { email: userEmail },
      {
        $set: {
          userId: newUsername,
          usernameLastChangedAt: new Date(),
        },
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Update username error:", error);
    return NextResponse.json({ error: "Failed to update username" }, { status: 500 });
  }
}
