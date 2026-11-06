import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { Comment } from "@/models/Comment.model";
import { purgeExpiredDeletions } from "@/lib/accountDeletion";

export const dynamic = "force-dynamic";

const LEVEL_TITLES: Record<number, string> = {
  1: "Novice",
  2: "Scholar",
  3: "Awakened",
  4: "Strategist",
};

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    await purgeExpiredDeletions().catch(() => {});

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "all";
    const sortBy = searchParams.get("sortBy") || "newest";

    const query: any = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { userId: { $regex: search, $options: "i" } },
      ];
    }

    // Status filter
    if (status === "active") {
      query.deletionStatus = { $ne: "PENDING_DELETION" };
    } else if (status === "logged_in") {
      query.deletionStatus = { $ne: "PENDING_DELETION" };
      query.isLoggedIn = true;
    } else if (status === "logged_out") {
      query.deletionStatus = { $ne: "PENDING_DELETION" };
      query.isLoggedIn = { $ne: true };
    } else if (status === "pending_deletion") {
      query.deletionStatus = "PENDING_DELETION";
    }

    // Sorting
    let sortOptions: any = { createdAt: -1 };
    if (sortBy === "oldest") {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === "name") {
      sortOptions = { name: 1 };
    } else if (sortBy === "streak") {
      sortOptions = { correctAnsStreak: -1 };
    }

    const skip = (page - 1) * limit;

    const [users, totalCount, activeCount, loggedInCount, pendingCount] = await Promise.all([
      User.find(query)
        .select("name email userId image profileLevel correctAnsStreak isLoggedIn lastLoginAt lastLogoutAt deletionStatus deletionScheduledAt deletionToken likes questionsAttempted createdAt updatedAt")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.collection.countDocuments(query),
      User.collection.countDocuments({ deletionStatus: { $ne: "PENDING_DELETION" } }),
      User.collection.countDocuments({ deletionStatus: { $ne: "PENDING_DELETION" }, isLoggedIn: true }),
      User.collection.countDocuments({ deletionStatus: "PENDING_DELETION" }),
    ]);

    const loggedOutCount = Math.max(0, activeCount - loggedInCount);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // Fetch comment counts for the current page users
    const userIds = users.map((u: any) => u._id);
    const commentCounts = await Comment.aggregate([
      { $match: { by: { $in: userIds } } },
      { $group: { _id: "$by", count: { $sum: 1 } } },
    ]);
    const commentCountMap = new Map<string, number>();
    commentCounts.forEach((c: any) => commentCountMap.set(c._id.toString(), c.count));

    const transformedUsers = users.map((u: any) => {
      const levelNum = u.profileLevel || 1;
      const levelTitle = LEVEL_TITLES[levelNum] || "Novice";

      return {
        _id: u._id.toString(),
        name: u.name || "Anonymous User",
        email: u.email,
        userId: u.userId,
        image: u.image || null,
        profileLevel: levelNum,
        levelTitle,
        correctAnsStreak: u.correctAnsStreak || 0,
        isLoggedIn: Boolean(u.isLoggedIn),
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
        lastLogoutAt: u.lastLogoutAt ? new Date(u.lastLogoutAt).toISOString() : null,
        deletionStatus: u.deletionStatus || "ACTIVE",
        deletionScheduledAt: u.deletionScheduledAt ? new Date(u.deletionScheduledAt).toISOString() : null,
        deletionToken: u.deletionToken || null,
        likesCount: Array.isArray(u.likes) ? u.likes.length : 0,
        questionsAttemptedCount: Array.isArray(u.questionsAttempted) ? u.questionsAttempted.length : 0,
        commentsCount: commentCountMap.get(u._id.toString()) || 0,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : null,
      };
    });

    return NextResponse.json({
      success: true,
      users: transformedUsers,
      pagination: {
        total: totalCount,
        activeCount,
        loggedInCount,
        loggedOutCount,
        pendingCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error("Users API error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}
