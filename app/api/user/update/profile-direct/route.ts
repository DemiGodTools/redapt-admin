import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { jwtVerify } from "jose";
import { UserJWTPayload } from "@/types/jwt";

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    let userEmail = req.headers.get("x-user-email");
    if (!userEmail) {
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const rawSecret =
            process.env.JWT_SECRET ||
            process.env.NEXTAUTH_SECRET ||
            "readapt_super_secret_jwt_key_12345";
          const secret = new TextEncoder().encode(rawSecret);
          const { payload } = await jwtVerify<UserJWTPayload>(token, secret);
          if (payload?.email) {
            userEmail = payload.email;
          }
        } catch (e) {
          console.warn("Direct JWT verify in route failed:", e);
        }
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: "Unauthorized (no user email)" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const image = body?.image;

    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return NextResponse.json(
        { success: false, message: "Invalid image payload" },
        { status: 400 },
      );
    }

    if (image.length > 3_500_000) {
      return NextResponse.json(
        { success: false, message: "Image is too large" },
        { status: 413 },
      );
    }

    const user = await User.findOneAndUpdate(
      { email: userEmail },
      { $set: { image, updatedAt: new Date() } },
      { new: true },
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      url: image,
      user,
    });
  } catch (error) {
    console.error("Profile direct upload error:", error);
    return NextResponse.json(
      { success: false, message: "Upload failed" },
      { status: 500 },
    );
  }
}
