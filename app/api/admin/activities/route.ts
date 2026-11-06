import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { ActivityLog } from "@/models/ActivityLog.model";
import { Chapter } from "@/models/Chapter.model";
import { Series } from "@/models/Series.model";
import { Banner } from "@/models/Banner.model";
import { Question } from "@/models/Question.model";
import { User } from "@/models/User.model";

export const dynamic = "force-dynamic";

const getRedirectUrl = (category: string, action: string) => {
  if (action === "DELETION_REQUESTED" || action === "DELETION_CANCELLED" || action === "DELETION_PURGED") {
    return "/admin/deletions";
  }
  switch (category) {
    case "content":
      return action.startsWith("SERIES") ? "/series" : "/chapters";
    case "banner":
      return "/banners";
    case "qna":
      return "/questions";
    case "auth":
      return "/admin/users";
    default:
      return "/admin";
  }
};

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "all";
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    // Build log query
    const logQuery: any = {};
    if (category !== "all") {
      logQuery.category = category;
    }
    if (search) {
      logQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { performedBy: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      logQuery.createdAt = {};
      if (startDate) {
        logQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        logQuery.createdAt.$lte = end;
      }
    }

    // Always fetch all logged activities matching query
    const loggedActivities = await ActivityLog.find(logQuery)
      .sort({ createdAt: -1 })
      .lean();

    // Track targets and titles to strictly avoid any duplicate fallback items
    const seenTargetIds = new Set<string>();
    const seenTitles = new Set<string>();

    const transformedLogs = loggedActivities.map((log: any) => {
      const targetId = log.metadata?.targetId || log.metadata?.chapterId || log.metadata?.seriesId || log.metadata?.bannerId || log.metadata?.questionId || log.metadata?.userId;
      if (targetId) seenTargetIds.add(String(targetId));
      if (log.title) seenTitles.add(String(log.title).trim().toLowerCase());

      return {
        id: log._id.toString(),
        action: log.action,
        category: log.category,
        title: log.title,
        description: log.description,
        performedBy: log.performedBy || "Master Admin",
        performedByRole: log.performedByRole || "admin",
        redirectUrl: getRedirectUrl(log.category, log.action),
        targetId: targetId || null,
        createdAt: log.createdAt,
      };
    });

    // 2. Hybrid legacy seed (only for items created before ActivityLog was introduced)
    const dateQuery: any = {};
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.createdAt.$lte = end;
      }
    }

    const promises: Promise<any[]>[] = [];

    if (category === "all" || category === "content") {
      promises.push(
        Chapter.find(dateQuery)
          .sort({ createdAt: -1 })
          .limit(50)
          .select("title author createdAt")
          .lean()
          .then((items) =>
            items
              .filter((item: any) => !seenTargetIds.has(item._id.toString()) && !seenTitles.has(item.title?.trim().toLowerCase()))
              .map((item: any) => ({
                id: item._id.toString(),
                action: "CHAPTER_ADDED",
                category: "content",
                title: item.title,
                description: item.author ? `New chapter published • Author: ${item.author}` : `New chapter published in catalog`,
                performedBy: "Admin",
                performedByRole: "admin",
                redirectUrl: "/chapters",
                targetId: item._id.toString(),
                createdAt: item.createdAt,
              }))
          )
      );

      promises.push(
        Series.find(dateQuery)
          .sort({ createdAt: -1 })
          .limit(30)
          .select("title type author createdAt")
          .lean()
          .then((items) =>
            items
              .filter((item: any) => !seenTargetIds.has(item._id.toString()) && !seenTitles.has(item.title?.trim().toLowerCase()))
              .map((item: any) => ({
                id: item._id.toString(),
                action: "SERIES_ADDED",
                category: "content",
                title: item.title,
                description: item.author ? `Created new ${item.type === "framework" ? "Framework" : "Normal"} Series • Author: ${item.author}` : `Created new ${item.type === "framework" ? "Framework" : "Normal"} Series`,
                performedBy: "Admin",
                performedByRole: "admin",
                redirectUrl: "/series",
                targetId: item._id.toString(),
                createdAt: item.createdAt,
              }))
          )
      );
    }

    if (category === "all" || category === "banner") {
      promises.push(
        Banner.find(dateQuery)
          .sort({ createdAt: -1 })
          .limit(30)
          .select("title type createdAt")
          .lean()
          .then((items) =>
            items
              .filter((item: any) => !seenTargetIds.has(item._id.toString()) && !seenTitles.has(item.title?.trim().toLowerCase()))
              .map((item: any) => ({
                id: item._id.toString(),
                action: "BANNER_ADDED",
                category: "banner",
                title: item.title,
                description: `App spotlight banner published (${item.type || "custom"})`,
                performedBy: "Master Admin",
                performedByRole: "admin",
                redirectUrl: "/banners",
                targetId: item._id.toString(),
                createdAt: item.createdAt,
              }))
          )
      );
    }

    if (category === "all" || category === "qna") {
      promises.push(
        Question.find(dateQuery)
          .sort({ createdAt: -1 })
          .limit(40)
          .select("question createdAt")
          .lean()
          .then((items) =>
            items
              .filter((item: any) => !seenTargetIds.has(item._id.toString()))
              .map((item: any) => ({
                id: item._id.toString(),
                action: "QUESTION_ADDED",
                category: "qna",
                title: item.question?.slice(0, 70) + (item.question?.length > 70 ? "..." : ""),
                description: `Question added to interactive quiz bank`,
                performedBy: "Master Admin",
                performedByRole: "admin",
                redirectUrl: "/questions",
                targetId: item._id.toString(),
                createdAt: item.createdAt,
              }))
          )
      );
    }

    if (category === "all" || category === "auth") {
      promises.push(
        User.find(dateQuery)
          .sort({ createdAt: -1 })
          .limit(50)
          .select("name email deletionStatus createdAt")
          .lean()
          .then((items) =>
            items
              .filter((item: any) => !seenTargetIds.has(item._id.toString()) && !seenTitles.has(item.email?.trim().toLowerCase()))
              .map((item: any) => {
                const isPending = item.deletionStatus === "PENDING_DELETION";
                return {
                  id: item._id.toString(),
                  action: isPending ? "DELETION_REQUESTED" : "USER_SIGNUP",
                  category: "auth",
                  title: item.name ? `${item.name} (${item.email})` : item.email,
                  description: isPending
                    ? "Account deletion scheduled (48h grace window)"
                    : "New user joined Readapt platform",
                  performedBy: item.name || item.email,
                  performedByRole: "user",
                  redirectUrl: isPending ? "/admin/deletions" : "/admin/users",
                  targetId: item._id.toString(),
                  createdAt: item.createdAt,
                };
              })
          )
      );
    }

    const legacyResults = await Promise.all(promises);
    const legacyFlat = legacyResults.flat();

    // Merge: Real ActivityLogs take top precedence, legacy fills in older gaps
    let merged = [...transformedLogs, ...legacyFlat];

    // Apply text search if requested
    if (search) {
      merged = merged.filter(
        (item) =>
          item.title?.toLowerCase().includes(search) ||
          item.performedBy?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search)
      );
    }

    // Sort chronologically descending
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = merged.length;
    const paginated = merged.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + paginated.length < total,
      },
    });
  } catch (error: any) {
    console.error("Activities fetch error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
