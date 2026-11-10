import { NextResponse } from "next/server";
import { Series } from "@/models/Series.model";
import connectMongo from "@/lib/connectMongo";
import { ISeriesContent } from "@/types/Series";
import "@/models/Question.model";
import "@/models/Category.model";
import "@/models/Chapter.model";
import "@/models/User.model";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;

    // Every chapter's full document used to be populated here, including
    // lyrics/transcript/TOC/questions. The overview and next-chapter queue only
    // need card fields, so keep the payload small and the query fast.
    const series = await Series.findById(id)
      .populate({ path: "category", select: "name", strictPopulate: false })
      .populate({
        path: "chapters.content",
        select: "title cover type for author media total questions series",
        strictPopulate: false,
      })
      .populate({
        path: "recommendationBookId",
        select: "title cover type for author media total category series",
        strictPopulate: false,
      })
      .populate({
        path: "joinedBy",
        select: "_id name userId image",
      })
      .lean();

    if (!series) {
      return NextResponse.json(
        { success: false, message: "Series not found" },
        { status: 404 }
      );
    }

    if (Array.isArray(series.joinedBy)) {
      series.joinedBy = series.joinedBy.filter(Boolean);
    }

    // 🔢 ensure items are ordered and chapters have synchronized lyrics
    if (Array.isArray(series.chapters)) {
      series.chapters.forEach((item: any) => {
        if (item?.content && typeof item.content === "object") {
          const lyricsVal = item.content.lyrics || item.content.transcript || "";
          item.content.lyrics = lyricsVal;
          item.content.transcript = lyricsVal;
        }
      });
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
