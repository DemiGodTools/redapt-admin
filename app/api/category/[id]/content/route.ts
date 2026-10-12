import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/connectMongo";
import { Chapter } from "@/models/Chapter.model";
import { Series } from "@/models/Series.model";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id: categoryId } = await params;
    const { searchParams } = new URL(req.url);
    const subCategoryId = searchParams.get("subCategoryId");
    const type = searchParams.get("type"); // "pdf", "audio", ya "series"

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return NextResponse.json(
        { success: false, message: "Invalid Category ID" },
        { status: 400 }
      );
    }

    // Base filter
    const baseFilter: any = { category: new mongoose.Types.ObjectId(categoryId) };
    if (subCategoryId && mongoose.Types.ObjectId.isValid(subCategoryId)) {
      baseFilter.subCategory = new mongoose.Types.ObjectId(subCategoryId);
    }

    // 1. Standalone Chapters ONLY (series strictly null)
    const standaloneFilter: any = {
      ...baseFilter,
      $or: [{ series: null }, { series: { $exists: false } }],
    };

    if (type === "pdf" || type === "audio") {
      standaloneFilter.type = type;
    }

    // 2. Fetch Standalones and Series in parallel
    const [standalones, seriesList] = await Promise.all([
      type === "series"
        ? Promise.resolve([])
        : Chapter.find(standaloneFilter)
            .sort({ createdAt: -1 })
            .lean(),
      type === "pdf" || type === "audio"
        ? Promise.resolve([])
        : Series.find(baseFilter)
            .sort({ createdAt: -1 })
            .lean(),
    ]);

    // Tagging entity types for smooth UI identification
    const formattedStandalones = standalones.map((item) => ({
      ...item,
      entityType: item.type === "audio" ? "standalone_audio" : "standalone_book",
    }));

    const formattedSeries = seriesList.map((item) => ({
      ...item,
      entityType: "series_container",
      totalChapters: item.chapters?.length || 0,
    }));

    const combined = [...formattedSeries, ...formattedStandalones];

    return NextResponse.json({
      success: true,
      count: combined.length,
      data: combined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}