import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { Chapter } from "@/models/Chapter.model";
import { Series } from "@/models/Series.model";
import { Question } from "@/models/Question.model";
import { Banner } from "@/models/Banner.model";
import { TeamMember } from "@/models/TeamMember.model";
import { Admin } from "@/models/Admin.model";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectMongo();

    const [
      totalUsers,
      totalActiveUsers,
      loggedInUsers,
      totalPendingDeletions,
      totalChapters,
      totalSeries,
      frameworkSeriesCount,
      normalSeriesCount,
      totalQuestions,
      totalBanners,
      activeBanners,
      totalTeamMembers,
      totalAdmins,
    ] = await Promise.all([
      User.collection.countDocuments(),
      User.collection.countDocuments({ deletionStatus: { $ne: "PENDING_DELETION" } }),
      User.collection.countDocuments({ deletionStatus: { $ne: "PENDING_DELETION" }, isLoggedIn: true }),
      User.collection.countDocuments({ deletionStatus: "PENDING_DELETION" }),
      Chapter.collection.countDocuments(),
      Series.collection.countDocuments(),
      Series.collection.countDocuments({ type: "framework" }),
      Series.collection.countDocuments({ type: { $ne: "framework" } }),
      Question.collection.countDocuments(),
      Banner.collection.countDocuments().catch(() => 0),
      Banner.collection.countDocuments({ isActive: { $ne: false } }).catch(() => 0),
      TeamMember.collection.countDocuments().catch(() => 0),
      Admin.collection.countDocuments().catch(() => 0),
    ]);

    const loggedOutUsers = Math.max(0, totalActiveUsers - loggedInUsers);

    // Calculate 7-day new users
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = await User.collection.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalActiveUsers,
        loggedInUsers,
        loggedOutUsers,
        totalPendingDeletions,
        recentUsers,
        totalChapters,
        totalSeries,
        frameworkSeriesCount,
        normalSeriesCount,
        totalQuestions,
        totalBanners,
        activeBanners,
        totalTeamMembers,
        totalAdmins,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
