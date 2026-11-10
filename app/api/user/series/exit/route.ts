import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { Series } from "@/models/Series.model";
import { jwtVerify } from "jose";
import { Types } from "mongoose";

export async function POST(req: Request) {
  try {
    await connectMongo();

    let userEmail = req.headers.get("x-user-email");
    let userIdFromToken: string | null = null;

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
            userIdFromToken = ((payload as any)?._id || (payload as any)?.userId || null) as string | null;
          } catch {}
        }
      }
    }

    if (!userEmail && !userIdFromToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    let user = null;
    if (userEmail) {
      user = await User.findOne({ email: userEmail });
    }
    if (!user && userIdFromToken && Types.ObjectId.isValid(userIdFromToken)) {
      user = await User.findById(userIdFromToken);
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.joinedSeries) {
      await Series.updateOne(
        { _id: user.joinedSeries },
        { $pull: { joinedBy: user._id } }
      );
    }

    user.joinedSeries = null;
    await user.save();
    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error) {
    console.error("EXIT SERIES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
