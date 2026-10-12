import { NextResponse } from "next/server";
import { Series } from "@/models/Series.model";
import connectMongo from "@/lib/connectMongo";
import { ISeriesContent } from "@/types/Series";
import "@/models/Question.model";
import "@/models/Category.model";
import "@/models/Chapter.model";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
const { id } = await params

    const series = await Series.findById(id)
      .populate("category")
      .populate("chapters.content")
      .populate("recommendationBookId")
      .lean();

    if (!series) {
const all = await Series.find({})
console.log('series not found for id ', id, " but all series are", all)
      return NextResponse.json(
        { success: false, message: "Series not found" },
        { status: 404 }
      );
    }

    // 🔢 ensure items are ordered
if (Array.isArray(series.chapters)) {
    series.items = (series.chapters as ISeriesContent[]).sort(
      (a, b) => a.order - b.order
    );
}

    return NextResponse.json({
      success: true,
      data: series,
    });
  } catch (err) {
    console.error("Get Series Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
