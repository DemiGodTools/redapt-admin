import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { jwtVerify } from "jose";
import {
  DAILY_TARGET_SECONDS,
  getLocalDateString,
  getCalendarDayDifference,
  validateAndRollStreak,
} from "@/lib/streakHelper";

async function getAuthenticatedUserEmail(req: NextRequest): Promise<string | null> {
  let userEmail = req.headers.get("x-user-email");
  if (userEmail) return userEmail;

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
  return userEmail;
}

export async function GET(req: NextRequest) {
  try {
    const userEmail = await getAuthenticatedUserEmail(req);
    if (!userEmail) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const tz = req.nextUrl.searchParams.get("timezone") || user.streakData?.timezone || "Asia/Kolkata";
    const modified = validateAndRollStreak(user, tz);

    if (modified) {
      user.markModified("streakData");
      await user.save();
    }

    return NextResponse.json({
      success: true,
      streak: {
        currentStreak: user.streakData.currentStreak || 0,
        longestStreak: user.streakData.longestStreak || 0,
        todayReadingSeconds: user.streakData.todayReadingSeconds || 0,
        targetSeconds: DAILY_TARGET_SECONDS,
        isCompletedToday: !!user.streakData.isCompletedToday,
        lastCompletedDate: user.streakData.lastCompletedDate || "",
      },
    });
  } catch (error: any) {
    console.error("Streak GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch streak" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userEmail = await getAuthenticatedUserEmail(req);
    if (!userEmail) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const secondsAdded = Number(body.secondsAdded);

    if (isNaN(secondsAdded) || secondsAdded <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid secondsAdded" },
        { status: 400 }
      );
    }

    // Safety guard against spoofed bulk time (allow legitimate offline sync batches up to 3600s)
    const safeSeconds = Math.min(Math.max(secondsAdded, 1), 3600);

    await connectMongo();
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const tz = body.timezone || user.streakData?.timezone || "Asia/Kolkata";
    validateAndRollStreak(user, tz);
    const today = getLocalDateString(tz);

    // Add reading seconds to today's bucket
    user.streakData.todayReadingSeconds = (user.streakData.todayReadingSeconds || 0) + safeSeconds;
    user.streakData.timezone = tz;

    let streakUnlocked = false;

    // Check if daily 4-minute goal unlocked right now
    if (
      user.streakData.todayReadingSeconds >= DAILY_TARGET_SECONDS &&
      !user.streakData.isCompletedToday
    ) {
      user.streakData.isCompletedToday = true;
      streakUnlocked = true;

      const diffDays = getCalendarDayDifference(today, user.streakData.lastCompletedDate);

      if (diffDays === 1) {
        // Completed yesterday -> increment streak!
        user.streakData.currentStreak = (user.streakData.currentStreak || 0) + 1;
      } else if (diffDays === 0) {
        // Already completed today -> keep streak at least 1
        user.streakData.currentStreak = Math.max(user.streakData.currentStreak || 1, 1);
      } else {
        // Starting fresh or after break
        user.streakData.currentStreak = 1;
      }

      user.streakData.longestStreak = Math.max(
        user.streakData.longestStreak || 0,
        user.streakData.currentStreak
      );
      user.streakData.lastCompletedDate = today;

      // Legacy compatibility fields
      user.streakData.streak = user.streakData.currentStreak;
      user.streakData.lastDate = today;
    }

    user.markModified("streakData");
    await user.save();

    return NextResponse.json({
      success: true,
      streakUnlocked,
      streak: {
        currentStreak: user.streakData.currentStreak || 0,
        longestStreak: user.streakData.longestStreak || 0,
        todayReadingSeconds: user.streakData.todayReadingSeconds || 0,
        targetSeconds: DAILY_TARGET_SECONDS,
        isCompletedToday: !!user.streakData.isCompletedToday,
        lastCompletedDate: user.streakData.lastCompletedDate || "",
      },
    });
  } catch (error: any) {
    console.error("Streak POST error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update streak" },
      { status: 500 }
    );
  }
}
