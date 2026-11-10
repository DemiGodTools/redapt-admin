import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import "@/models/Chapter.model";
import { jwtVerify } from "jose";

export async function GET(req: NextRequest) {
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

    await connectMongo();

    // Only the fields the client renders are needed here. The previous version
    // populated the full Chapter documents (lyrics, TOC, questions, comments,
    // media) for every like and recent read, which made profile loads heavy.
    const user = await User.findOne({ email: userEmail })
      .populate({
        path: "likes",
        select: "title cover type for author category",
        strictPopulate: false,
      })
      .populate({
        path: "recentReads.chapter",
        select: "title cover type for author category",
        populate: { path: "category", select: "name", strictPopulate: false },
        strictPopulate: false,
      })
      .select("-__v")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Update presence & active session
    User.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          isLoggedIn: true,
          lastActiveAt: new Date(),
          ...(user.lastLoginAt ? {} : { lastLoginAt: new Date() }),
        },
      }
    ).catch(() => {});

    return NextResponse.json(
      { success: true, data: user },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    console.error("GET USER ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
