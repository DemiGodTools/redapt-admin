import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Series } from "@/models/Series.model";
import { Chapter } from "@/models/Chapter.model";
import { getB2ObjectSizeMap, getFileSizeFromUrlOrKey, formatBytes } from "@/lib/b2";
import "@/models/Category.model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: Fetch all series with populated fields
export async function GET() {
  try {
    await connectMongo();
    const [rawSeries, b2Data] = await Promise.all([
      Series.find({})
        .populate("category", "name")
        .populate("subCategory", "name")
        .populate("recommendationBookId", "title cover media")
        .populate({
          path: "chapters.content",
          select: "title type cover media isProtected author",
        })
        .sort({ createdAt: -1 })
        .lean(),
      getB2ObjectSizeMap().catch(() => ({ map: new Map<string, number>(), rawContents: [] })),
    ]);

    const sizeMap = b2Data?.map || new Map<string, number>();
    const series = rawSeries.map((s: any) => {
      const coverSizeBytes = getFileSizeFromUrlOrKey(s.cover, sizeMap);
      let chaptersSizeBytes = 0;
      if (Array.isArray(s.chapters)) {
        for (const item of s.chapters) {
          const ch = item?.content;
          if (ch) {
            chaptersSizeBytes += getFileSizeFromUrlOrKey(ch.cover, sizeMap) + getFileSizeFromUrlOrKey(ch.media, sizeMap);
          }
        }
      }
      const totalSizeBytes = coverSizeBytes + chaptersSizeBytes;
      return {
        ...s,
        coverSizeBytes,
        coverSizeFormatted: formatBytes(coverSizeBytes),
        chaptersSizeBytes,
        chaptersSizeFormatted: formatBytes(chaptersSizeBytes),
        totalSizeBytes,
        totalSizeFormatted: formatBytes(totalSizeBytes),
      };
    });

    return NextResponse.json(
      { success: true, data: series },
      { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch series" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a series by ID
export async function DELETE(req: NextRequest) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Valid Series ID required" }, { status: 400 });
    }

    await Series.findByIdAndDelete(id);
    
    // Cleanup: Remove this series reference from any chapters
    await Chapter.updateMany(
      { series: new Types.ObjectId(id) },
      { $set: { series: null } }
    );

    return NextResponse.json({ success: true, message: "Series deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete series" },
      { status: 500 }
    );
  }
}