import { logActivity } from "@/lib/activityLogger";
import { getB2ObjectSizeMap, getFileSizeFromUrlOrKey, formatBytes } from "@/lib/b2";
import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { Banner } from "@/models/Banner.model";
import "@/models/Series.model";
import "@/models/Chapter.model";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// 1. GET: Fetch all banners
export async function GET() {
  try {
    await connectMongo();

    const [banners, b2Data] = await Promise.all([
      Banner.find({})
        .populate("series", "title cover author type")
        .populate("chapter", "title cover author type")
        .sort({ createdAt: -1 })
        .lean(),
      getB2ObjectSizeMap().catch(() => ({ map: new Map<string, number>(), rawContents: [] })),
    ]);

    const sizeMap = b2Data?.map || new Map<string, number>();
    const enriched = banners.map((b: any) => {
      const sizeBytes = getFileSizeFromUrlOrKey(b.image, sizeMap);
      return {
        ...b,
        sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (error: any) {
    console.error("GET /api/admin/banner error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch banners" },
      { status: 500 }
    );
  }
}

// 2. POST: Create a new banner
export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();

    const {
      title,
      subtitle = "",
      image,
      type = "custom",
      redirectionType = "none",
      targetId = null,
      targetModel = null,
      targetScreen = null,
      author = "Readapt Curators",
      category = "Spotlight",
      order = 0,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, message: "Banner title is required" },
        { status: 400 }
      );
    }

    if (!image?.trim()) {
      return NextResponse.json(
        { success: false, message: "Banner image URL (3:4 ratio) is required" },
        { status: 400 }
      );
    }

    const validRedirectionTypes = [
      "none",
      "series",
      "chapter",
      "screen",
      "page",
      "downloads",
      "trending",
      "subscription",
      "upgrade",
      "profile",
      "liked",
      "recent_reads",
    ];

    const safeRedirectionType = validRedirectionTypes.includes(redirectionType)
      ? redirectionType
      : "none";

    let finalTargetModel = targetModel;
    if (!finalTargetModel) {
      if (safeRedirectionType === "series") finalTargetModel = "Series";
      else if (safeRedirectionType === "chapter") finalTargetModel = "Chapter";
      else if (
        safeRedirectionType === "screen" ||
        safeRedirectionType === "page" ||
        [
          "downloads",
          "trending",
          "subscription",
          "upgrade",
          "profile",
          "liked",
          "recent_reads",
        ].includes(safeRedirectionType)
      ) {
        finalTargetModel = "Screen";
      } else {
        finalTargetModel = null;
      }
    }

    const payload: any = {
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : "",
      image: image.trim(),
      type: ["custom", "series", "chapter"].includes(type) ? type : "custom",
      redirectionType: safeRedirectionType,
      targetId: targetId ? String(targetId).trim() : (targetScreen ? String(targetScreen).trim() : null),
      targetModel: finalTargetModel,
      targetScreen: targetScreen ? String(targetScreen).trim() : null,
      author: author ? author.trim() : "Readapt Curators",
      category: category ? category.trim() : "Spotlight",
      order: Number(order) || 0,
      isActive: true,
    };

    if (payload.targetId && mongoose.Types.ObjectId.isValid(payload.targetId)) {
      if (payload.redirectionType === "series") {
        payload.series = new mongoose.Types.ObjectId(payload.targetId);
      } else if (payload.redirectionType === "chapter") {
        payload.chapter = new mongoose.Types.ObjectId(payload.targetId);
      }
    }

    const newBanner: any = await Banner.create(payload);

    const adminRole = req.headers.get("x-admin-role") || "admin";
    const adminName = req.headers.get("x-admin-name") || "Master Admin";
    await logActivity({
      action: "BANNER_ADDED",
      category: "banner",
      title: newBanner.title,
      description: `App spotlight banner published (${newBanner.type || "custom"})`,
      performedBy: adminName,
      performedByRole: adminRole,
      metadata: { bannerId: newBanner._id.toString() },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Banner created successfully!",
      data: newBanner,
    });
  } catch (error: any) {
    console.error("POST /api/admin/banner error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create banner" },
      { status: 500 }
    );
  }
}

// 3. DELETE: Delete a banner
export async function DELETE(req: NextRequest) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid Banner ID is required" },
        { status: 400 }
      );
    }

    const deleted = await Banner.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/admin/banner error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete banner" },
      { status: 500 }
    );
  }
}

