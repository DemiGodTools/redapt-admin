import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Chapter } from "@/models/Chapter.model";

interface Params {
  params: Promise<{
    categoryId: string;
  }>;
}

export async function GET(_: Request, { params }: Params) {
  try {
    await connectMongo();

    const { categoryId } = await params;

    if (!Types.ObjectId.isValid(categoryId)) {
      return NextResponse.json(
        { success: false, message: "Invalid category id" },
        { status: 400 }
      );
    }

    const chapters = await Chapter.find({
      category: categoryId,
    })
      .populate("category")
      .populate("series")
      .sort({ updatedAt: -1 })
      .lean();

    const mappedChapters = chapters.map((c: any) => {
      const lyricsVal = c.lyrics || c.transcript || "";
      return {
        ...c,
        lyrics: lyricsVal,
        transcript: lyricsVal,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        count: mappedChapters.length,
        chapters: mappedChapters,
      },
    });
  } catch (err) {
    console.error("Get Chapters By Category Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
