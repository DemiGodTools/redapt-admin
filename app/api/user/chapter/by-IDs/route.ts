import "@/models/Category.model";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Chapter } from "@/models/Chapter.model";

interface ByIdsBody {
  ids: string[];
  mode?: "card" | "full";
}

export async function POST(req: Request) {
  try {
    await connectMongo();

    const body = (await req.json()) as ByIdsBody;

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "ids array is required" },
        { status: 400 }
      );
    }

    const validIds = body.ids
      .filter((id) => Types.ObjectId.isValid(id))
      .slice(0, 100);

    if (validIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        chapters: [],
      });
    }

    const isCardMode = body.mode === "card";
    let query = Chapter.find({
      _id: { $in: validIds },
    });

    if (isCardMode) {
      query = query.select("-lyrics -transcript -toc -questions -qnaComments");
    }

    const chapters = await query.populate("category").lean();

    const mappedChapters = chapters.map((c: any) => {
      if (isCardMode) return c;
      const lyricsVal = c.lyrics || c.transcript || "";
      return {
        ...c,
        lyrics: lyricsVal,
        transcript: lyricsVal,
      };
    });

    return NextResponse.json({
      success: true,
      count: mappedChapters.length,
      data: mappedChapters,
      chapters: mappedChapters,
    });
  } catch (err) {
    console.error("Get Chapters By IDs Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
