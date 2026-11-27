import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import "@/models/Chapter.model";
import { validateAndRollStreak } from "@/lib/streakHelper";
import { ensureUserReferralCode } from "@/lib/referralHelper";
import { getAuthenticatedUser } from "@/lib/userAuth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const userEmail = authUser?.email || null;

    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: valid session token required" },
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

    // Keep streak data strictly validated & rolled over
    const streakModified = validateAndRollStreak(user);

    if (!user.referralCode) {
      user.referralCode = await ensureUserReferralCode(user);
    }

    // Update presence & active session
    User.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          isLoggedIn: true,
          lastActiveAt: new Date(),
          ...(user.lastLoginAt ? {} : { lastLoginAt: new Date() }),
          ...(streakModified ? { streakData: user.streakData } : {}),
        },
      }
    ).catch(() => {});

    const userObj = {
      ...user,
      isEarlyBadgeLive: process.env.EARLY_BADGE_LIVE === "true",
    };

    return NextResponse.json(
      { success: true, data: userObj },
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
