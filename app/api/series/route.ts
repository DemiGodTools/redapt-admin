import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Series } from "@/models/Series.model";
import { Chapter } from "@/models/Chapter.model"; // Population ke liye zaroori hai
import "@/models/Category.model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: Fetch all series with populated fields
export async function GET() {
  try {
    await connectMongo();
    const series = await Series.find({})
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("recommendationBookId", "title cover media")
      .populate({
        path: "chapters.content",
        select: "title type cover isProtected author",
      })
      .sort({ createdAt: -1 })
      .lean();

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